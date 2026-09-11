"use server";

// app/account/recent-actions.ts — fetch products by id (for the "Recently viewed" grid,
// whose ids live in the browser's localStorage).

import { getServerSupabase } from "@/lib/supabase/server";

export async function getProductsByIds(ids: string[]) {
  const clean = Array.from(new Set((ids || []).filter(Boolean))).slice(0, 24);
  if (!clean.length) return { ok: true, products: [] as any[] };
  try {
    const svc = getServerSupabase();
    const { data } = await svc.from("products").select("*").in("id", clean);
    const order = new Map(clean.map((id, i) => [id, i]));
    const sorted = (data ?? []).sort((a: any, b: any) => (order.get(a.id) ?? 999) - (order.get(b.id) ?? 999));
    return { ok: true, products: sorted };
  } catch {
    return { ok: true, products: [] as any[] };
  }
}
