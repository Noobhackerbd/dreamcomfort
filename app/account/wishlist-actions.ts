"use server";

// app/account/wishlist-actions.ts — account-synced wishlist.
// The heart on product cards calls toggleWishlist(); it silently no-ops for guests
// (they keep the localStorage wishlist), and syncs to the account when logged in.

import { getServerSupabase } from "@/lib/supabase/server";
import { getCustomerSession } from "@/lib/customer-auth";

export async function toggleWishlist(productId: string, add: boolean) {
  if (!productId) return { ok: false };
  const session = await getCustomerSession();
  if (!session) return { ok: true, skipped: true }; // guest — localStorage only
  try {
    const svc = getServerSupabase();
    if (add) await svc.from("customer_wishlist").upsert({ user_id: session.userId, product_id: productId });
    else await svc.from("customer_wishlist").delete().eq("user_id", session.userId).eq("product_id", productId);
    return { ok: true };
  } catch {
    return { ok: false };
  }
}

/** Merge a guest's localStorage wishlist into the account (called once on the wishlist page). */
export async function mergeWishlist(productIds: string[]) {
  const session = await getCustomerSession();
  if (!session || !Array.isArray(productIds) || productIds.length === 0) return { ok: true };
  try {
    const svc = getServerSupabase();
    const rows = Array.from(new Set(productIds.filter(Boolean))).slice(0, 200).map((product_id) => ({ user_id: session.userId, product_id }));
    if (rows.length) await svc.from("customer_wishlist").upsert(rows);
    return { ok: true };
  } catch {
    return { ok: false };
  }
}

export async function getWishlistProducts() {
  const session = await getCustomerSession();
  if (!session) return { ok: true, products: [] as any[] };
  try {
    const svc = getServerSupabase();
    const { data: rows } = await svc.from("customer_wishlist").select("product_id, created_at").eq("user_id", session.userId).order("created_at", { ascending: false });
    const ids = (rows ?? []).map((r: any) => r.product_id);
    if (!ids.length) return { ok: true, products: [] as any[] };
    const { data: products } = await svc.from("products").select("*").in("id", ids);
    // Preserve wishlist order (newest first).
    const order = new Map(ids.map((id: string, i: number) => [id, i]));
    const sorted = (products ?? []).sort((a: any, b: any) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
    return { ok: true, products: sorted };
  } catch {
    return { ok: true, products: [] as any[] };
  }
}
