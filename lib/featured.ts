// lib/featured.ts — "Featured products" hybrid ranking (server-only).
//
// Order of priority:
//   1) Admin hand-picked featured products (in the admin-set order)
//   2) Best-sellers — most units sold in confirmed/processing/shipped/delivered
//      orders over the last 60 days
//   3) Newest products (fallback), rating as a gentle tie-break
// Out-of-stock products are always excluded. Degrades gracefully if the
// order_items relation isn't queryable (just uses picks + newest).

import { getServerSupabase } from "@/lib/supabase/server";
import { getFeatured } from "@/lib/settings";
import type { Product } from "@/lib/types";

const VALID = new Set(["confirmed", "processing", "shipped", "delivered"]);

export async function getFeaturedProducts(limit = 8): Promise<Product[]> {
  const svc = getServerSupabase();

  const [cfg, poolRes, sellerRes] = await Promise.all([
    getFeatured(),
    svc.from("products").select("*").eq("is_active", true).order("created_at", { ascending: false }).limit(200),
    svc.from("order_items").select("product_id, quantity, orders(status, created_at)").limit(5000),
  ]);

  const pool = (poolRes.data as Product[]) ?? [];
  const inStock = pool.filter((p) => (p.stock ?? 0) > 0);
  const byId = new Map(inStock.map((p) => [p.id, p]));

  // Best-seller unit counts (recent + valid statuses only).
  const since = Date.now() - 60 * 24 * 3600 * 1000;
  const counts = new Map<string, number>();
  for (const r of ((sellerRes as any)?.data ?? []) as any[]) {
    const o = r.orders;
    if (!o || !VALID.has(o.status)) continue;
    if (o.created_at && new Date(o.created_at).getTime() < since) continue;
    const id = r.product_id;
    if (!id || !byId.has(id)) continue;
    counts.set(id, (counts.get(id) || 0) + (Number(r.quantity) || 0));
  }

  const chosen: string[] = [];
  const push = (id?: string | null) => { if (id && byId.has(id) && !chosen.includes(id)) chosen.push(id); };

  // 1) Manual featured picks (admin order)
  for (const id of cfg.productIds || []) push(id);
  // 2) Best-sellers by units sold (desc), rating as tie-break
  const sellers = [...counts.entries()].sort((a, b) => {
    if (b[1] !== a[1]) return b[1] - a[1];
    return Number(byId.get(b[0])?.rating || 0) - Number(byId.get(a[0])?.rating || 0);
  });
  for (const [id] of sellers) push(id);
  // 3) Newest fallback (pool is already created_at desc)
  for (const p of inStock) push(p.id);

  return chosen.slice(0, limit).map((id) => byId.get(id)!).filter(Boolean);
}
