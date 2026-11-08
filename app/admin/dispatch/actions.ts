"use server";

// Admin → Dispatch. Scan each parcel's label while handing it to the courier:
//   • the order becomes "shipped" right away (same as changing it by hand — the shipped SMS
//     with the tracking link goes out if that template is on),
//   • it is counted in today's handover,
//   • its live CarryBee status is fetched, so a parcel the courier hasn't entered yet
//     ("Pickup requested") shows up immediately. The hourly cron alerts if it stays that way.

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin-auth";
import { getServerSupabase } from "@/lib/supabase/server";
import { setOrderStatus } from "@/lib/order-courier";
import { refreshOneOrderStatus } from "@/lib/courier-status";

/** Hours after handover that a parcel may still show "pickup requested" before we alert. */
const NO_ENTRY_AFTER_H = 2; // keep in sync with the courier-status cron

export interface DispatchRow {
  id: string;
  order_number: string;
  customer_name: string;
  customer_phone: string;
  status: string;
  tracking_id: string | null;
  handed_at: string | null;
  courier_status: string | null;
  courier_last_raw: string | null;
  courier_status_at: string | null;
  items: string;
  pieces: number;
}

const COLS =
  "id, order_number, customer_name, customer_phone, status, courier, tracking_id, handed_at, courier_status, courier_last_raw, courier_status_at, courier_pickup_at, order_items(product_name, quantity)";

function toRow(o: any): DispatchRow {
  const items = (o.order_items ?? []) as any[];
  return {
    id: o.id,
    order_number: o.order_number,
    customer_name: o.customer_name ?? "",
    customer_phone: o.customer_phone ?? "",
    status: o.status,
    tracking_id: o.tracking_id ?? null,
    handed_at: o.handed_at ?? null,
    courier_status: o.courier_status ?? null,
    courier_last_raw: o.courier_last_raw ?? null,
    courier_status_at: o.courier_status_at ?? null,
    items: items.map((it) => `${it.product_name}${Number(it.quantity) > 1 ? " ×" + it.quantity : ""}`).join(", "),
    pieces: items.reduce((n, it) => n + (Number(it.quantity) || 0), 0),
  };
}

/** Start/end (UTC instants) of a Bangladesh calendar day "YYYY-MM-DD". */
function bdDay(date?: string) {
  const d = date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : new Date(Date.now() + 6 * 3600000).toISOString().slice(0, 10);
  const from = new Date(`${d}T00:00:00.000+06:00`).toISOString();
  const to = new Date(`${d}T23:59:59.999+06:00`).toISOString();
  return { d, from, to };
}

export async function getDispatch(date?: string) {
  await requireAdmin();
  const supabase = getServerSupabase();
  const { d, from, to } = bdDay(date);

  const [day, stuck] = await Promise.all([
    supabase.from("orders").select(COLS).gte("handed_at", from).lte("handed_at", to)
      .is("deleted_at", null).order("handed_at", { ascending: false }).limit(500),
    // Handed over in the last 3 days, courier still hasn't entered it.
    supabase.from("orders").select(COLS).gte("handed_at", new Date(Date.now() - 3 * 86400000).toISOString())
      .lte("handed_at", new Date(Date.now() - NO_ENTRY_AFTER_H * 3600000).toISOString())
      .or("courier_status.is.null,courier_status.in.(pickup_requested,pending,unknown)")
      .not("status", "in", "(delivered,returned,cancelled)")
      .is("deleted_at", null).order("handed_at", { ascending: true }).limit(200),
  ]);
  const err = day.error || stuck.error;
  if (err) {
    const missing = (err as any).code === "42703" || /handed_at/i.test(err.message || "");
    return { ok: false as const, migrated: !missing, error: err.message, date: d, rows: [] as DispatchRow[], noEntry: [] as DispatchRow[] };
  }
  return { ok: true as const, migrated: true, date: d, rows: (day.data ?? []).map(toRow), noEntry: (stuck.data ?? []).map(toRow) };
}

function parseCode(raw: string): { orderNumber?: string; consignment?: string } {
  const s = String(raw || "").trim();
  const m = s.match(/DC[-\s]?(\d{3,})/i);
  if (m) return { orderNumber: `DC-${m[1]}` };
  if (/^\d{3,7}$/.test(s)) return { orderNumber: `DC-${s}` };
  if (/^[A-Z0-9-]{6,}$/i.test(s)) return { consignment: s };
  return {};
}

export type DispatchResult =
  | { result: "shipped"; order: DispatchRow }
  | { result: "already"; order: DispatchRow }
  | { result: "blocked"; order: DispatchRow; reason: string }
  | { result: "not_found"; code: string }
  | { result: "error"; error: string };

export async function dispatchScan(code: string): Promise<DispatchResult> {
  await requireAdmin();
  const supabase = getServerSupabase();
  const { orderNumber, consignment } = parseCode(code);
  if (!orderNumber && !consignment) return { result: "not_found", code };

  let q = supabase.from("orders").select(COLS).is("deleted_at", null).limit(1);
  q = orderNumber ? q.eq("order_number", orderNumber) : q.eq("tracking_id", consignment!);
  const { data, error } = await q.maybeSingle();
  if (error) {
    if ((error as any).code === "42703" || /handed_at/i.test(error.message || "")) {
      return { result: "error", error: "ডাটাবেস আপডেট বাকি — supabase-migration-dispatch.sql চালান।" };
    }
    return { result: "error", error: error.message };
  }
  if (!data) return { result: "not_found", code: orderNumber || consignment || code };

  const order = toRow(data);
  if (order.handed_at) return { result: "already", order };
  if (!order.tracking_id || (data as any).courier !== "CarryBee") {
    return { result: "blocked", order, reason: "এই অর্ডার এখনো CarryBee-তে পাঠানো হয়নি।" };
  }
  if (["pending", "cancelled", "returned", "delivered"].includes(order.status)) {
    const why: Record<string, string> = {
      pending: "অর্ডারটা এখনো কনফার্ম হয়নি।",
      cancelled: "অর্ডারটা ক্যান্সেল করা।",
      returned: "অর্ডারটা রিটার্ন হয়ে গেছে।",
      delivered: "অর্ডারটা আগেই ডেলিভারড।",
    };
    return { result: "blocked", order, reason: why[order.status] };
  }

  // 1) Shipped (+ shipped SMS, same as the status menu).
  if (order.status !== "shipped") {
    const r = await setOrderStatus(order.id, "shipped");
    if (!r.ok) return { result: "error", error: r.error };
  }
  // 2) Count it as handed over.
  const now = new Date().toISOString();
  const up = await supabase.from("orders").update({ handed_at: now, no_entry_alerted_at: null }).eq("id", order.id);
  if (up.error) return { result: "error", error: up.error.message };
  // 3) Live courier status, so "not entered yet" shows right away.
  const live = await refreshOneOrderStatus(supabase, { ...(data as any), status: "shipped" }).catch(() => null);

  revalidatePath("/admin/dispatch");
  return {
    result: "shipped",
    order: {
      ...order,
      status: "shipped",
      handed_at: now,
      courier_status: live?.ok ? live.courierStatus ?? order.courier_status : order.courier_status,
      courier_last_raw: live?.ok ? live.raw ?? order.courier_last_raw : order.courier_last_raw,
      courier_status_at: live?.ok ? now : order.courier_status_at,
    },
  };
}

/** Scanned by mistake: take it out of the handover count (status stays shipped). */
export async function undoDispatch(id: string) {
  await requireAdmin();
  const { error } = await getServerSupabase().from("orders").update({ handed_at: null }).eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/dispatch");
  return { ok: true };
}

/** Re-check CarryBee now for the given day's handed parcels that the courier hasn't entered. */
export async function recheckDispatch(date?: string) {
  await requireAdmin();
  const supabase = getServerSupabase();
  const { from, to } = bdDay(date);
  const { data } = await supabase.from("orders").select(COLS).gte("handed_at", from).lte("handed_at", to)
    .or("courier_status.is.null,courier_status.in.(pickup_requested,pending,unknown)")
    .not("status", "in", "(delivered,returned,cancelled)").limit(60);
  const rows = (data ?? []) as any[];
  for (let i = 0; i < rows.length; i += 6) {
    await Promise.all(rows.slice(i, i + 6).map((o) => refreshOneOrderStatus(supabase, o).catch(() => null)));
  }
  revalidatePath("/admin/dispatch");
  return { ok: true, checked: rows.length };
}
