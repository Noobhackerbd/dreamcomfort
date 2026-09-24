"use server";

import { getServerSupabase } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/admin-auth";
import { revalidatePath } from "next/cache";

/** 10-digit subscriber core, so 01…/88…/+88… all match. */
function coreOf(p: string): string {
  let d = (p || "").replace(/\D/g, "");
  if (d.startsWith("88")) d = d.slice(2);
  if (d.startsWith("0")) d = d.slice(1);
  return d;
}

export interface RegOrder { id: string; order_number: string; status: string; total: number; created_at: string; is_booked: boolean }
export interface RegAddress { id: string; label: string | null; name: string | null; phone: string | null; address_line: string | null; area: string | null; city: string | null; is_default: boolean }
export interface RegWishItem { product_id: string; name: string; image: string | null; price: number; slug: string | null }

export interface RegisteredDetail {
  ok: true;
  orders: RegOrder[];
  addresses: RegAddress[];
  wishlist: RegWishItem[];
}

/** Full detail for one registered customer: their orders (by phone), saved addresses + wishlist (by account id). */
export async function getRegisteredDetail(input: { id: string; phone: string }): Promise<RegisteredDetail | { ok: false; error: string }> {
  await requireAdmin();
  const svc = getServerSupabase();
  const core = coreOf(input.phone);

  // Orders — matched by the 10-digit core (robust to stored format).
  let orders: RegOrder[] = [];
  if (core.length >= 9) {
    let res = await svc
      .from("orders")
      .select("id, order_number, status, total, created_at, is_booked, customer_phone")
      .ilike("customer_phone", `%${core}%`)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(200);
    if (res.error && ((res.error as any).code === "42703" || /deleted_at/i.test(res.error.message || ""))) {
      res = await svc
        .from("orders")
        .select("id, order_number, status, total, created_at, is_booked, customer_phone")
        .ilike("customer_phone", `%${core}%`)
        .order("created_at", { ascending: false })
        .limit(200);
    }
    orders = ((res.data ?? []) as any[])
      .filter((o) => coreOf(o.customer_phone) === core)
      .map((o) => ({ id: o.id, order_number: o.order_number, status: o.status, total: Number(o.total ?? 0), created_at: o.created_at, is_booked: !!o.is_booked }));
  }

  // Addresses + wishlist — keyed by the account id (= auth user id).
  const [addrRes, wishRes] = await Promise.all([
    svc.from("customer_addresses").select("id, label, name, phone, address_line, area, city, is_default").eq("user_id", input.id).order("is_default", { ascending: false }).limit(50),
    svc.from("customer_wishlist").select("product_id, created_at, products(name_bn, name_en, images, price, slug)").eq("user_id", input.id).order("created_at", { ascending: false }).limit(100),
  ]);

  const addresses: RegAddress[] = ((addrRes.data ?? []) as any[]).map((a) => ({
    id: a.id, label: a.label ?? null, name: a.name ?? null, phone: a.phone ?? null,
    address_line: a.address_line ?? null, area: a.area ?? null, city: a.city ?? null, is_default: !!a.is_default,
  }));

  const wishlist: RegWishItem[] = ((wishRes.data ?? []) as any[])
    .map((w) => ({
      product_id: w.product_id,
      name: w.products?.name_bn || w.products?.name_en || "",
      image: w.products?.images?.[0] ?? null,
      price: Number(w.products?.price ?? 0),
      slug: w.products?.slug ?? null,
    }))
    .filter((x) => x.name);

  return { ok: true, orders, addresses, wishlist };
}

/** Save private admin notes + tags on a registered customer. */
export async function saveCustomerAdminMeta(id: string, notes: string, tags: string[]): Promise<{ ok: true } | { ok: false; error: string; needsMigration?: boolean }> {
  await requireAdmin();
  if (!id) return { ok: false, error: "Customer id missing." };
  const svc = getServerSupabase();
  const { error } = await svc
    .from("customer_profiles")
    .update({ admin_notes: notes.trim() || null, admin_tags: tags.length ? tags : null })
    .eq("id", id);
  if (error) {
    if ((error as any).code === "42703" || /admin_notes|admin_tags/i.test(error.message || "")) {
      return { ok: false, needsMigration: true, error: "Run the migration to add admin_notes / admin_tags columns to customer_profiles." };
    }
    return { ok: false, error: error.message };
  }
  revalidatePath("/admin/registered");
  return { ok: true };
}
