"use server";

// Admin → Returns. A returned parcel waits here as "not received" until the QR on its
// label (our order number, e.g. DC-12785) — or its CarryBee barcode — is scanned.
// Returns are listed from the day supabase-migration-returns.sql ran (returned_at is
// only stamped by the courier-status cron from then on).

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin-auth";
import { getServerSupabase } from "@/lib/supabase/server";

export interface ReturnRow {
  id: string;
  order_number: string;
  customer_name: string;
  customer_phone: string;
  total: number;
  status: string;
  returned_at: string | null;
  return_received_at: string | null;
  courier_flag: string | null;
  courier_flag_at: string | null;
  courier_last_raw: string | null;
  items: string;
}

const COLS =
  "id, order_number, customer_name, customer_phone, total, status, returned_at, return_received_at, courier_flag, courier_flag_at, courier_last_raw, order_items(product_name, quantity)";

function toRow(o: any): ReturnRow {
  return {
    id: o.id,
    order_number: o.order_number,
    customer_name: o.customer_name ?? "",
    customer_phone: o.customer_phone ?? "",
    total: Number(o.total || 0),
    status: o.status,
    returned_at: o.returned_at ?? null,
    return_received_at: o.return_received_at ?? null,
    courier_flag: o.courier_flag ?? null,
    courier_flag_at: o.courier_flag_at ?? null,
    courier_last_raw: o.courier_last_raw ?? null,
    items: ((o.order_items ?? []) as any[])
      .map((it) => `${it.product_name}${Number(it.quantity) > 1 ? " ×" + it.quantity : ""}`)
      .join(", "),
  };
}

export async function getReturns() {
  await requireAdmin();
  const supabase = getServerSupabase();
  const since = new Date(Date.now() - 30 * 86400000).toISOString();

  const [waiting, received, lateDelivered] = await Promise.all([
    supabase.from("orders").select(COLS).eq("status", "returned").not("returned_at", "is", null)
      .is("return_received_at", null).is("deleted_at", null).order("returned_at", { ascending: true }).limit(300),
    supabase.from("orders").select(COLS).not("return_received_at", "is", null).gte("return_received_at", since)
      .is("deleted_at", null).order("return_received_at", { ascending: false }).limit(300),
    supabase.from("orders").select(COLS).eq("courier_flag", "late_delivered").gte("courier_flag_at", since)
      .is("deleted_at", null).order("courier_flag_at", { ascending: false }).limit(100),
  ]);

  const err = waiting.error || received.error || lateDelivered.error;
  if (err) {
    const missing = (err as any).code === "42703" || /returned_at|return_received_at|courier_flag/i.test(err.message || "");
    return { ok: false as const, migrated: !missing, error: err.message, waiting: [], received: [], lateDelivered: [] };
  }
  return {
    ok: true as const,
    migrated: true,
    waiting: (waiting.data ?? []).map(toRow),
    received: (received.data ?? []).map(toRow),
    lateDelivered: (lateDelivered.data ?? []).map(toRow),
  };
}

/** "DC-12785", "dc12785", "12785", a tracking URL… → order number; else a consignment id. */
function parseCode(raw: string): { orderNumber?: string; consignment?: string } {
  const s = String(raw || "").trim();
  const m = s.match(/DC[-\s]?(\d{3,})/i);
  if (m) return { orderNumber: `DC-${m[1]}` };
  if (/^\d{3,7}$/.test(s)) return { orderNumber: `DC-${s}` };
  if (/^[A-Z0-9-]{6,}$/i.test(s)) return { consignment: s };
  return {};
}

export type ScanResult =
  | { result: "received"; order: ReturnRow; late?: boolean }
  | { result: "already"; order: ReturnRow }
  | { result: "not_returned"; order: ReturnRow }
  | { result: "not_found"; code: string }
  | { result: "error"; error: string };

export async function scanReturn(code: string): Promise<ScanResult> {
  await requireAdmin();
  const supabase = getServerSupabase();
  const { orderNumber, consignment } = parseCode(code);
  if (!orderNumber && !consignment) return { result: "not_found", code };

  let q = supabase.from("orders").select(COLS).is("deleted_at", null).limit(1);
  q = orderNumber ? q.eq("order_number", orderNumber) : q.eq("tracking_id", consignment!);
  const { data, error } = await q.maybeSingle();
  if (error) return { result: "error", error: error.message };
  if (!data) return { result: "not_found", code: orderNumber || consignment || code };

  const order = toRow(data);
  if (order.status !== "returned") return { result: "not_returned", order };
  if (order.return_received_at) return { result: "already", order };

  const now = new Date().toISOString();
  const patch: Record<string, unknown> = { return_received_at: now };
  if (!order.returned_at) patch.returned_at = now; // an older return scanned in — list it too
  const up = await supabase.from("orders").update(patch).eq("id", order.id);
  if (up.error) return { result: "error", error: up.error.message };
  revalidatePath("/admin/returns");
  return { result: "received", order: { ...order, ...(patch as any) } };
}

/** The parcel is physically back but the courier hasn't marked it returned (yet). */
export async function forceReceive(id: string) {
  await requireAdmin();
  const supabase = getServerSupabase();
  const { data: o } = await supabase.from("orders").select("returned_at").eq("id", id).maybeSingle();
  const now = new Date().toISOString();
  const { error } = await supabase
    .from("orders")
    .update({ status: "returned", returned_at: o?.returned_at || now, return_received_at: now })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/returns");
  return { ok: true };
}

export async function markReceived(id: string, received: boolean) {
  await requireAdmin();
  const supabase = getServerSupabase();
  const { error } = await supabase
    .from("orders")
    .update({ return_received_at: received ? new Date().toISOString() : null })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/returns");
  return { ok: true };
}
