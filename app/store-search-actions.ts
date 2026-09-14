"use server";

// app/store-search-actions.ts — storefront predictive search (instant dropdown).

import { getServerSupabase } from "@/lib/supabase/server";

export interface SearchHit {
  id: string; slug: string; name: string; price: number; image: string | null; category: string | null;
}

/** Popular search terms shown before the user types — top categories + newest products. */
export async function popularSearches(): Promise<{ terms: string[] }> {
  try {
    const svc = getServerSupabase();
    const [cats, prods] = await Promise.all([
      svc.from("categories").select("name_bn, name_en").order("sort_order", { ascending: true }).limit(8),
      svc.from("products").select("name_bn, name_en").eq("is_active", true).order("created_at", { ascending: false }).limit(6),
    ]);
    const seen = new Set<string>();
    const out: string[] = [];
    const push = (s?: string | null) => { const t = (s || "").trim(); const k = t.toLowerCase(); if (t && !seen.has(k)) { seen.add(k); out.push(t); } };
    for (const c of (cats.data ?? []) as any[]) push(c.name_bn || c.name_en);
    for (const p of (prods.data ?? []) as any[]) push(p.name_bn || p.name_en);
    return { terms: out.slice(0, 10) };
  } catch {
    return { terms: [] };
  }
}

/** Keyword suggestions (Daraz/Alibaba-style autocomplete) — category & product names that match. */
export async function searchSuggestions(query: string): Promise<{ ok: boolean; suggestions: string[] }> {
  const q = (query || "").trim();
  if (q.length < 1) return { ok: true, suggestions: [] };
  try {
    const svc = getServerSupabase();
    const like = `%${q.replace(/[%_]/g, "")}%`;
    const [catRes, prodRes] = await Promise.all([
      svc.from("categories").select("name_bn, name_en").or(`name_bn.ilike.${like},name_en.ilike.${like}`).limit(6),
      svc.from("products").select("name_bn, name_en").eq("is_active", true).or(`name_bn.ilike.${like},name_en.ilike.${like}`).limit(14),
    ]);
    const seen = new Set<string>();
    const out: string[] = [];
    const push = (s?: string | null) => {
      const t = (s || "").trim();
      const key = t.toLowerCase();
      if (t && !seen.has(key)) { seen.add(key); out.push(t); }
    };
    for (const c of (catRes.data ?? []) as any[]) push(c.name_bn || c.name_en);
    for (const p of (prodRes.data ?? []) as any[]) push(p.name_bn || p.name_en);
    return { ok: true, suggestions: out.slice(0, 10) };
  } catch {
    return { ok: true, suggestions: [] };
  }
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
