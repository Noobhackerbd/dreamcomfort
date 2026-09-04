// app/api/cron/courier-ratio/route.ts
// Scheduled backfill of customer courier success rates. Finds recent orders whose
// phone has no saved (or stale) ratio and fetches + saves it — server-side, so the
// admin order list only ever reads saved rows. New orders are fetched at creation
// time (see checkout/orders actions); this cron fills in the OLD ones over time.
//
// Auth: send `Authorization: Bearer <CRON_SECRET>` (Vercel Cron does this when the
// CRON_SECRET env var is set) or `?secret=<CRON_SECRET>` for a manual trigger.

import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";
import { bdcourierConfigured, getCachedRatios, refreshAndCacheCourierRatio } from "@/lib/bdcourier";
import { toLocalBdPhone } from "@/lib/carrybee";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const STALE_DAYS = 7;        // re-check a saved ratio older than this
const DEFAULT_BATCH = 20;    // max lookups per run (respects API quota)
const LOOKBACK_DAYS = 60;    // only backfill customers who ordered recently

function authorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false; // locked until CRON_SECRET is set
  const bearer = req.headers.get("authorization");
  if (bearer && bearer === `Bearer ${secret}`) return true;
  return req.nextUrl.searchParams.get("secret") === secret;
}

export async function GET(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ ok: false, error: "unauthorized (set CRON_SECRET and pass it)" }, { status: 401 });
  }
  if (!(await bdcourierConfigured())) {
    return NextResponse.json({ ok: true, skipped: "BD Courier API token not set" });
  }

  const batch = Math.min(50, Math.max(1, Number(req.nextUrl.searchParams.get("limit")) || DEFAULT_BATCH));
  const supabase = getServerSupabase();

  // Recent orders → unique local phones.
  const sinceIso = new Date(Date.now() - LOOKBACK_DAYS * 24 * 3600 * 1000).toISOString();
  let ordersRes = await supabase
    .from("orders")
    .select("customer_phone, created_at")
    .gte("created_at", sinceIso)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(4000);
  if (ordersRes.error && ((ordersRes.error as any).code === "42703" || /deleted_at/i.test(ordersRes.error.message || ""))) {
    ordersRes = await supabase.from("orders").select("customer_phone, created_at").gte("created_at", sinceIso).order("created_at", { ascending: false }).limit(4000);
  }
  if (ordersRes.error) {
    return NextResponse.json({ ok: false, error: ordersRes.error.message }, { status: 500 });
  }

  // Newest order per phone (so we can prioritise recent customers).
  const newestByPhone = new Map<string, number>();
  for (const o of (ordersRes.data ?? []) as any[]) {
    const local = toLocalBdPhone(o.customer_phone || "");
    if (!/^01\d{9}$/.test(local)) continue;
    const t = new Date(o.created_at).getTime() || 0;
    if (!newestByPhone.has(local) || t > (newestByPhone.get(local) as number)) newestByPhone.set(local, t);
  }
  const phones = Array.from(newestByPhone.keys());
  if (phones.length === 0) return NextResponse.json({ ok: true, candidates: 0, processed: 0, updated: 0 });

  // Which are missing / stale?
  const cached = await getCachedRatios(phones);
  const staleBefore = Date.now() - STALE_DAYS * 24 * 3600 * 1000;
  const due = phones
    .filter((p) => {
      const c = cached.get(p);
      return !c || c.checkedAt < staleBefore;
    })
    // Prefer customers with the most recent order first.
    .sort((a, b) => (newestByPhone.get(b) || 0) - (newestByPhone.get(a) || 0))
    .slice(0, batch);

  let updated = 0;
  for (const p of due) {
    const r = await refreshAndCacheCourierRatio(p);
    if (r) updated++;
  }

  return NextResponse.json({
    ok: true,
    candidates: phones.length,
    due: due.length,
    processed: due.length,
    updated,
    note: due.length >= batch ? "more remain — next run will continue" : "all caught up",
  });
}
