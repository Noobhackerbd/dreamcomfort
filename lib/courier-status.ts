// lib/courier-status.ts — normalize a courier's raw status into our canonical set and
// refresh one order's saved courier status. Used by the /api/cron/courier-status cron
// (every 6h) and the manual "refresh" button. Delivered/returned are final — the cron
// skips them; a parcel stuck at "pickup requested" for 20h+ surfaces in Missed Entry.

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

/** Hours a parcel may sit at "pickup requested" before it counts as a missed pickup. */
export const MISSED_PICKUP_HOURS = 20;

/** Map a courier's free-text status (CarryBee order_status / transfer_status) → canonical. */
export function normalizeCourierStatus(raw?: string | null): CourierStatus {
  const s = (raw || "").toLowerCase().trim();
  if (!s) return "unknown";
  if (/deliver/.test(s)) return "delivered";            // Delivered, Partial Delivered
  if (/return/.test(s)) return "returned";              // Return, Returned, Return to client
  if (/cancel|lost|damage/.test(s)) return "cancelled";
  if (/hold/.test(s)) return "hold";
  if (/pickup|pick up/.test(s)) return "pickup_requested"; // Pickup Requested / Assigned (NOT "Picked")
  if (/pending|created|new/.test(s)) return "pending";
  // Anything else active — Picked, Received by hub, In transit, Out for delivery, …
  return "in_transit";
}

/** A courier status the cron treats as FINAL — never re-checked. */
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
}

export interface RefreshOutcome {
  id: string;
  ok: boolean;
  skipped?: string;
  courierStatus?: CourierStatus;
  raw?: string;
  mainStatusChanged?: boolean;
  error?: string;
}

/** Fetch one order's live courier status and persist it (+ auto-update the main order
 *  status when the parcel is delivered / returned). Best-effort; never throws. */
export async function refreshOneOrderStatus(supabase: any, order: TrackableOrder): Promise<RefreshOutcome> {
  const id = order.id;
  const consignment = (order.tracking_id || "").trim();
  if (!consignment) return { id, ok: false, skipped: "no-consignment" };

  const res = await getParcelStatus(consignment);
  if (!res.ok) return { id, ok: false, error: res.error || "status fetch failed" };

  const norm = normalizeCourierStatus(res.status);
  const nowIso = new Date().toISOString();

  const patch: Record<string, unknown> = {
    courier_status: norm,
    courier_status_at: nowIso,
    courier_last_raw: res.status ?? null,
    // Keep the first-seen pickup time (for the 20h rule); clear it once past pickup.
    courier_pickup_at: norm === "pickup_requested" ? (order.courier_pickup_at || nowIso) : null,
  };

  // Auto-advance the MAIN order status on a final courier outcome.
  let mainStatusChanged = false;
  if (norm === "delivered" && order.status !== "delivered") { patch.status = "delivered"; mainStatusChanged = true; }
  else if (norm === "returned" && order.status !== "returned") { patch.status = "returned"; mainStatusChanged = true; }

  let { error } = await supabase.from("orders").update(patch).eq("id", id);
  if (error && ((error as any).code === "42703" || /courier_status|courier_pickup_at|courier_last_raw|courier_status_at/i.test(error.message || ""))) {
    // Courier-status columns not migrated yet — at least apply the main status change.
    const fallback: Record<string, unknown> = {};
    if (patch.status) fallback.status = patch.status;
    if (Object.keys(fallback).length) ({ error } = await supabase.from("orders").update(fallback).eq("id", id));
    else error = null;
  }
  if (error) return { id, ok: false, error: error.message };

  return { id, ok: true, courierStatus: norm, raw: res.status, mainStatusChanged };
}
