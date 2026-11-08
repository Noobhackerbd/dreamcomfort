// app/api/cron/courier-status/route.ts
// Hourly re-check of each order's CarryBee courier status.
//
// Each run checks, in this order (several parcels at a time, within ~50s):
//   1. Fix-ups — orders the old matcher marked delivered from "Assigned for delivery".
//   2. Active parcels — sent to CarryBee, not yet delivered/returned/cancelled, not
//      checked in the last 50 minutes (stalest first).
//   3. Recent finals — delivered/returned in the last 12 days, re-checked every 6 hours,
//      to catch a parcel that flips later (delivered → returned, returned → delivered).
// See lib/courier-status.ts for what each courier status does to the order.
//
// Auth: `Authorization: Bearer <CRON_SECRET>` (Vercel Cron sends this automatically when
// the CRON_SECRET env var is set) or `?secret=<CRON_SECRET>` for a manual trigger.

import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";
import { carrybeeConfigured } from "@/lib/carrybee";
import { refreshOneOrderStatus, type RefreshOutcome } from "@/lib/courier-status";
import { sendAdminPush } from "@/lib/push";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const TIME_BUDGET_MS = 50000;  // stop before the 60s limit
const PARALLEL = 6;            // CarryBee calls at once
const LOOKBACK_DAYS = 45;      // active parcels older than this are ignored
const FINAL_RECHECK_DAYS = 12; // keep watching delivered/returned this long
const ACTIVE_STALE_MIN = 50;
const FINAL_STALE_H = 6;
const NO_ENTRY_AFTER_H = 2;    // handed to the courier but still "pickup requested" this long → alert

function authorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false; // locked until CRON_SECRET is set
  const bearer = req.headers.get("authorization");
  if (bearer && bearer === `Bearer ${secret}`) return true;
  return req.nextUrl.searchParams.get("secret") === secret;
}

const COLS = "id, order_number, tracking_id, courier, status, courier_status, courier_pickup_at, courier_last_raw";
const ago = (ms: number) => new Date(Date.now() - ms).toISOString();

export async function GET(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ ok: false, error: "unauthorized (set CRON_SECRET and pass it)" }, { status: 401 });
  }
  if (!(await carrybeeConfigured())) {
    return NextResponse.json({ ok: true, skipped: "CarryBee not configured" });
  }

  const started = Date.now();
  const supabase = getServerSupabase();
  const limit = Math.max(1, Math.min(200, Number(req.nextUrl.searchParams.get("batch")) || 120));

  // Courier-status columns are needed for staleness; without them fall back to the old way.
  const probe = await supabase.from("orders").select("courier_status_at, courier_last_raw").limit(1);
  const hasCol = !probe.error;

  const base = () =>
    supabase.from("orders").select(COLS).eq("courier", "CarryBee").not("tracking_id", "is", null).is("deleted_at", null);

  const groups: { name: string; q: any }[] = [];
  if (hasCol) {
    groups.push({
      name: "fixups",
      q: base().eq("status", "delivered").ilike("courier_last_raw", "%assigned for delivery%")
        .order("created_at", { ascending: false }).limit(40),
    });
    groups.push({
      name: "active",
      q: base().not("status", "in", "(delivered,returned,cancelled)").gte("created_at", ago(LOOKBACK_DAYS * 86400000))
        .or(`courier_status_at.is.null,courier_status_at.lt.${ago(ACTIVE_STALE_MIN * 60000)}`)
        .order("courier_status_at", { ascending: true, nullsFirst: true }).limit(limit),
    });
    groups.push({
      name: "recentFinal",
      q: base().in("status", ["delivered", "returned"]).gte("created_at", ago(FINAL_RECHECK_DAYS * 86400000))
        .or(`courier_status_at.is.null,courier_status_at.lt.${ago(FINAL_STALE_H * 3600000)}`)
        .order("courier_status_at", { ascending: true, nullsFirst: true }).limit(60),
    });
  } else {
    groups.push({
      name: "active",
      q: base().not("status", "in", "(delivered,returned,cancelled)").gte("created_at", ago(LOOKBACK_DAYS * 86400000))
        .order("created_at", { ascending: false }).limit(40),
    });
  }

  // Collect the work list (no duplicates across groups).
  const seen = new Set<string>();
  const work: any[] = [];
  const queued: Record<string, number> = {};
  for (const g of groups) {
    const { data, error } = await g.q;
    if (error) { queued[g.name] = -1; continue; }
    let n = 0;
    for (const o of (data ?? []) as any[]) if (!seen.has(o.id)) { seen.add(o.id); work.push(o); n++; }
    queued[g.name] = n;
  }

  const outcomes: (RefreshOutcome & { order_number?: string })[] = [];
  for (let i = 0; i < work.length; i += PARALLEL) {
    if (Date.now() - started > TIME_BUDGET_MS) break;
    const chunk = work.slice(i, i + PARALLEL);
    const res = await Promise.all(chunk.map((o) => refreshOneOrderStatus(supabase, o).then((r) => ({ ...r, order_number: o.order_number }))));
    outcomes.push(...res);
  }

  const noEntry = await alertNoEntry(supabase);

  const statusCounts: Record<string, number> = {};
  for (const o of outcomes) if (o.courierStatus) statusCounts[o.courierStatus] = (statusCounts[o.courierStatus] || 0) + 1;
  const pick = (f: (o: RefreshOutcome) => boolean | undefined) => outcomes.filter(f).map((o) => o.order_number);

  return NextResponse.json({
    ok: true,
    queued,
    checked: outcomes.length,
    left: work.length - outcomes.length,
    delivered: pick((o) => o.mainStatusChanged && o.newStatus === "delivered"),
    returned: pick((o) => o.mainStatusChanged && o.newStatus === "returned"),
    lateReturn: pick((o) => o.flag === "late_return"),
    lateDelivered: pick((o) => o.flag === "late_delivered"),
    reverted: pick((o) => o.reverted),
    noEntry,
    failed: outcomes.filter((o) => !o.ok).length,
    errors: Array.from(new Set(outcomes.filter((o) => !o.ok).map((o) => o.error || o.skipped))).slice(0, 5),
    statusCounts,
    ms: Date.now() - started,
    note: hasCol ? undefined : "run supabase-migration-courier-status.sql to persist courier statuses",
  });
}

/** Parcels scanned at Dispatch that the courier still hasn't entered after a while: one
 *  push per batch, each parcel alerted once (no_entry_alerted_at). Quiet if the dispatch
 *  migration hasn't run. */
async function alertNoEntry(supabase: any): Promise<{ alerted: string[]; pushed: number } | { skipped: string }> {
  const { data, error } = await supabase
    .from("orders")
    .select("id, order_number, customer_name")
    .gte("handed_at", ago(3 * 86400000))
    .lte("handed_at", ago(NO_ENTRY_AFTER_H * 3600000))
    .is("no_entry_alerted_at", null)
    .or("courier_status.is.null,courier_status.in.(pickup_requested,pending,unknown)")
    .not("status", "in", "(delivered,returned,cancelled)")
    .is("deleted_at", null)
    .limit(100);
  if (error) return { skipped: error.message };
  const rows = (data ?? []) as any[];
  if (!rows.length) return { alerted: [], pushed: 0 };

  const nums = rows.map((r) => r.order_number);
  const pushed = await sendAdminPush({
    title: `⚠️ কুরিয়ার এন্ট্রি দেয়নি · ${rows.length} টা পার্সেল`,
    body: `হ্যান্ডওভারের ${NO_ENTRY_AFTER_H} ঘণ্টা পরও Pickup requested: ${nums.slice(0, 6).join(", ")}${nums.length > 6 ? " …" : ""}`,
    url: "/admin/dispatch",
    tag: "no-entry",
  });
  await supabase.from("orders").update({ no_entry_alerted_at: new Date().toISOString() }).in("id", rows.map((r) => r.id));
  return { alerted: nums, pushed };
}
