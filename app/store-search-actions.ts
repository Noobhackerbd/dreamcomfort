"use server";

// app/store-search-actions.ts — storefront predictive search (instant dropdown).

import { getServerSupabase } from "@/lib/supabase/server";

export interface SearchHit {
  id: string; slug: string; name: string; price: number; image: string | null; category: string | null;
}

export async function searchProducts(query: string): Promise<{ ok: boolean; hits: SearchHit[] }> {
  const q = (query || "").trim();
  if (q.length < 2) return { ok: true, hits: [] };
  try {
    const svc = getServerSupabase();
    const like = `%${q.replace(/[%_]/g, "")}%`;
    let rows: any[] = [];
    // Try with an embedded category name; fall back if the relation isn't available.
    const withCat = await svc.from("products")
      .select("id, slug, name_bn, name_en, price, images, categories(name_bn, name_en)")
      .eq("is_active", true).or(`name_bn.ilike.${like},name_en.ilike.${like}`).limit(8);
    if (withCat.error) {
      const plain = await svc.from("products").select("id, slug, name_bn, name_en, price, images").eq("is_active", true).or(`name_bn.ilike.${like},name_en.ilike.${like}`).limit(8);
      rows = plain.data ?? [];
    } else {
      rows = withCat.data ?? [];
    }
    const hits: SearchHit[] = rows.map((p: any) => ({
      id: p.id, slug: p.slug, name: p.name_bn || p.name_en, price: Number(p.price),
      image: p.images?.[0] ?? null,
      category: p.categories ? (p.categories.name_bn || p.categories.name_en || null) : null,
    }));
    return { ok: true, hits };
  } catch {
    return { ok: true, hits: [] };
  }
}
