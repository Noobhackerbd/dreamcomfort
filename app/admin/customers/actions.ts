"use server";

import { getServerSupabase } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/admin-auth";
import { revalidatePath } from "next/cache";

export interface CustomerOrderRow {
  id: string;
  order_number: string;
  status: string;
  total: number;
  created_at: string;
  is_booked: boolean;
}

/** Load one customer's order history (from the orders table, matched by phone). */
export async function getCustomerOrders(phone: string): Promise<
  | { ok: true; orders: CustomerOrderRow[] }
  | { ok: false; error: string }
> {
  await requireAdmin();
  const p = (phone || "").trim();
  if (!p) return { ok: false, error: "ফোন নম্বর নেই।" };
  const supabase = getServerSupabase();

  // Try excluding trashed orders; fall back if deleted_at column is missing.
  let res = await supabase
    .from("orders")
    .select("id, order_number, status, total, created_at, is_booked")
    .eq("customer_phone", p)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(100);
  if (res.error && ((res.error as any).code === "42703" || /deleted_at/i.test(res.error.message || ""))) {
    res = await supabase
      .from("orders")
      .select("id, order_number, status, total, created_at, is_booked")
      .eq("customer_phone", p)
      .order("created_at", { ascending: false })
      .limit(100);
  }
  if (res.error) return { ok: false, error: res.error.message };

  const orders: CustomerOrderRow[] = (res.data ?? []).map((o: any) => ({
    id: o.id,
    order_number: o.order_number,
    status: o.status,
    total: Number(o.total ?? 0),
    created_at: o.created_at,
    is_booked: !!o.is_booked,
  }));
  return { ok: true, orders };
}

/** Delete a customer record. (Their past orders are kept — they store name/phone directly.) */
export async function deleteCustomer(id: string) {
  await requireAdmin();
  if (!id) return { ok: false, error: "কাস্টমার আইডি নেই।" };
  const supabase = getServerSupabase();
  const { error } = await supabase.from("customers").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/customers");
  return { ok: true };
}
