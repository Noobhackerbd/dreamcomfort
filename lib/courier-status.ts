// lib/courier-status.ts — normalize a courier's raw status into our canonical set and
// refresh one order's saved courier status. Used by the /api/cron/courier-status cron
// (hourly).
//
// Rules:
//   • "Assigned for delivery" / "Out for delivery" are NOT delivered — only "Delivered" /
//     "Partial delivery" are. (The old /deliver/ match marked parcels delivered while the
//     rider was still on the way.)
//   • Returned → main status "returned" and `returned_at` is stamped; the parcel then waits
//     at Admin → Returns until its label QR is scanned ("received").
//   • A parcel we had as delivered that later shows Return → flag "late_return".
//   • A parcel we had as returned that later shows Delivered → flag "late_delivered", and
//     it leaves the Returns list (status becomes delivered).

import { getParcelStatus } from "@/lib/carrybee";

export type CourierStatus =
  | "pending"
  | "pickup_requested"
  | "in_transit"
  | "delivered"
  | "returned"
  | "hold"
  | "cancelled"
  | "unknown";

export type CourierFlag = "late_return" | "late_delivered";

/** Hours a parcel may sit at "pickup requested" before it counts as a missed pickup. */
export const MISSED_PICKUP_HOURS = 20;

/** Raw courier text that the old matcher wrongly treated as delivered. */
export const MISREAD_DELIVERED = /assigned for delivery|out for delivery/i;

/** Map a courier's free-text status (CarryBee order_status / transfer_status) → canonical. */
export function normalizeCourierStatus(raw?: string | null): CourierStatus {
  const s = (raw || "").toLowerCase().replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim();
  if (!s) return "unknown";
  // Failed / pending attempts first, so "delivery failed" or "undelivered" never count as delivered.
  if (/undeliver|not deliver|deliver(y)? (fail|attempt|reschedul|pending)|reschedul/.test(s)) return "in_transit";
  // On the way back but not yet handed to us — keep checking.
  if (/return.*(transit|process|pending|request|way|hub|initiat)|(pending|request).*return/.test(s)) return "in_transit";
  if (/\bdelivered\b|partial(ly)? deliver/.test(s)) return "delivered";      // Delivered, Partial delivery
  if (/return/.test(s)) return "returned";                                   // Return, Returned, Paid return
  if (/cancel|lost|damage/.test(s)) return "cancelled";                       // Pickup cancelled, Lost
  if (/hold/.test(s)) return "hold";
  if (/pickup|pick up/.test(s) && !/picked/.test(s)) return "pickup_requested"; // Pickup requested / Assigned for pickup
  if (/pending|created|^new$/.test(s)) return "pending";
  // Anything else active — Picked, Received at hub, On the way…, Assigned for delivery, Exchange…
  return "in_transit";
}

/** A courier status that ends the parcel's journey. Recent finals are still re-checked
 *  for a few days to catch late flips (delivered ↔ returned). */
export function isFinalCourierStatus(s?: string | null): boolean {
  return s === "delivered" || s === "returned";
}

export interface TrackableOrder {
  id: string;
  tracking_id?: string | null;
  courier?: string | null;
  status?: string | null;
  courier_status?: string | null;
  courier_pickup_at?: string | null;
  courier_last_raw?: string | null;
}

export interface RefreshOutcome {
  id: string;
  ok: boolean;
  skipped?: string;
  courierStatus?: CourierStatus;
  raw?: string;
  mainStatusChanged?: boolean;
  newStatus?: string;
  flag?: CourierFlag;
  reverted?: boolean;
  error?: string;
}

/** Work out what to write for one order, given the courier's latest raw status. Pure —
 *  unit-testable without the network. */
export function planStatusUpdate(order: TrackableOrder, raw: string | undefined, nowIso: string) {
  const norm = normalizeCourierStatus(raw);
  const patch: Record<string, unknown> = {
    courier_status: norm,
    courier_status_at: nowIso,
    courier_last_raw: raw ?? null,
    // Keep the first-seen pickup time (for the 20h rule); clear it once past pickup.
    courier_pickup_at: norm === "pickup_requested" ? (order.courier_pickup_at || nowIso) : null,
  };
  const prev = order.status || "";
  let flag: CourierFlag | undefined;
  let reverted = false;

  if (norm === "delivered" && prev !== "delivered") {
    patch.status = "delivered";
    if (prev === "returned") flag = "late_delivered"; // leaves the Returns list
  } else if (norm === "returned" && prev !== "returned") {
    patch.status = "returned";
    patch.returned_at = nowIso;          // the Returns list starts counting from here
    patch.return_received_at = null;
    if (prev === "delivered") flag = "late_return";
  } else if (prev === "delivered" && norm !== "delivered" && norm !== "returned" && MISREAD_DELIVERED.test(order.courier_last_raw || "")) {
    // Undo the old "Assigned for delivery = delivered" mistake: the parcel is still out.
    patch.status = "shipped";
    reverted = true;
  }
  if (flag) {
    patch.courier_flag = flag;
    patch.courier_flag_at = nowIso;
  }
  return { norm, patch, flag, reverted, mainStatusChanged: typeof patch.status === "string" && patch.status !== prev };
}

const RETURN_COLS = ["returned_at", "return_received_at", "courier_flag", "courier_flag_at"];
const COURIER_COLS = ["courier_status", "courier_status_at", "courier_pickup_at", "courier_last_raw"];
const isMissingCol = (e: any) => !!e && (e.code === "42703" || e.code === "PGRST204" || /column/i.test(e.message || ""));
const without = (o: Record<string, unknown>, keys: string[]) =>
  Object.fromEntries(Object.entries(o).filter(([k]) => !keys.includes(k)));

/** Fetch one order's live courier status and persist it (+ auto-update the main order
 *  status when the parcel is delivered / returned). Best-effort; never throws. */
export async function refreshOneOrderStatus(supabase: any, order: TrackableOrder): Promise<RefreshOutcome> {
  const id = order.id;
  const consignment = (order.tracking_id || "").trim();
  if (!consignment) return { id, ok: false, skipped: "no-consignment" };

  const res = await getParcelStatus(consignment);
  if (!res.ok) return { id, ok: false, error: res.error || "status fetch failed" };
  if (!res.status) return { id, ok: false, error: "courier returned no status" }; // never guess

  const plan = planStatusUpdate(order, res.status, new Date().toISOString());

  // Older databases may miss the returns / courier columns — degrade step by step.
  let patch = plan.patch;
  let { error } = await supabase.from("orders").update(patch).eq("id", id);
  if (isMissingCol(error)) {
    patch = without(patch, RETURN_COLS);
    ({ error } = await supabase.from("orders").update(patch).eq("id", id));
  }
  if (isMissingCol(error)) {
    patch = without(patch, COURIER_COLS);
    error = Object.keys(patch).length ? (await supabase.from("orders").update(patch).eq("id", id)).error : null;
  }
  if (error) return { id, ok: false, error: error.message };

  return {
    id, ok: true, courierStatus: plan.norm, raw: res.status,
    mainStatusChanged: plan.mainStatusChanged, newStatus: plan.patch.status as string | undefined,
    flag: plan.flag, reverted: plan.reverted,
  };
}
