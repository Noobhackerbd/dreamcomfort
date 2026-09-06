// app/api/cron/courier-status/route.ts
// Scheduled re-check of each order's CarryBee courier status, every 6 hours.
// - Skips orders already delivered / returned (final) — no wasted API calls.
// - Delivered → main status "delivered"; Returned → main status "returned".
// - A parcel stuck at "pickup requested" for 20h+ shows up in the Missed Entry tab
//   (that tab is a query in the orders list, computed from courier_pickup_at).
//
// Auth: `Authorization: Bearer <CRON_SECRET>` (Vercel Cron sends this automatically when
// the CRON_SECRET env var is set) or `?secret=<CRON_SECRET>` for a manual trigger.

import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";
import { carrybeeConfigured } from "@/lib/carrybee";
import { refreshOneOrderStatus } from "@/lib/courier-status";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const DEFAULT_BATCH = 20;      // orders checked per run
const TIME_BUDGET_MS = 45000;  // stop before any gateway timeout
const LOOKBACK_DAYS = 45;      // only track recent orders

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
  if (!(await carrybeeConfigured())) {
    return NextResponse.json({ ok: true, skipped: "CarryBee not configured" });
  }

  const started = Date.now();
  const supabase = getServerSupabase();
  const batch = Math.max(1, Math.min(50, Number(req.nextUrl.searchParams.get("batch")) || DEFAULT_BATCH));
  const sinceIso = new Date(Date.now() - LOOKBACK_DAYS * 86400000).toISOString();

  // Does the courier-status column exist? (Stalest-first ordering needs it.)
  const probe = await supabase.from("orders").select("courier_status_at").limit(1);
  const hasCol = !(probe.error && ((probe.error as any).code === "42703" || /courier_status_at/i.test(probe.error.message || "")));

  // Active shipments only: sent to CarryBee, has a consignment, not yet finalized.
  let q: any = supabase
    .from("orders")
    .select("id, tracking_id, courier, status, courier_status, courier_pickup_at")
    .eq("courier", "CarryBee")
    .not("tracking_id", "is", null)
    .not("status", "in", "(delivered,returned,cancelled)")
    .gte("created_at", sinceIso)
    .limit(batch);
  q = hasCol
    ? q.order("courier_status_at", { ascending: true, nullsFirst: true })
    : q.order("created_at", { ascending: false });

  const { data: orders, error } = await q;
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

  const rows = (orders ?? []) as any[];
  let checked = 0, delivered = 0, returned = 0, failed = 0;
  const statusCounts: Record<string, number> = {};

  for (const o of rows) {
    if (Date.now() - started > TIME_BUDGET_MS) break;
    const out = await refreshOneOrderStatus(supabase, o);
    checked++;
    if (!out.ok) { failed++; continue; }
    if (out.courierStatus) statusCounts[out.courierStatus] = (statusCounts[out.courierStatus] || 0) + 1;
    if (out.mainStatusChanged && out.courierStatus === "delivered") delivered++;
    if (out.mainStatusChanged && out.courierStatus === "returned") returned++;
  }

  return NextResponse.json({
    ok: true,
    scanned: rows.length,
    checked,
    delivered,
    returned,
    failed,
    statusCounts,
    ms: Date.now() - started,
    note: hasCol ? undefined : "run supabase-migration-courier-status.sql to persist courier statuses",
  });
}
