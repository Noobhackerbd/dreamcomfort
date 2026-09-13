"use server";

// app/for-you-actions.ts — "For You" personalized product feed.
// Alibaba-style: ranks products by the customer's shown interest (categories of
// the products they recently viewed), newest-first within each tier, with a
// popular/newest fallback for first-time visitors. Stateless + paginated so the
// homepage "আরও দেখুন" (load more) button can page through it.

import { getServerSupabase } from "@/lib/supabase/server";
import type { Product } from "@/lib/types";

const PAGE = 8;
const POOL = 160; // candidate pool size (newest active products)

export async function getForYou(input: { seenIds?: string[]; offset?: number; limit?: number }): Promise<{ products: Product[]; hasMore: boolean }> {
  const svc = getServerSupabase();
  const seenIds = (input.seenIds || []).filter((x) => typeof x === "string" && x).slice(0, 30);
  const offset = Math.max(0, Number(input.offset) || 0);
  const limit = Math.min(24, Math.max(1, Number(input.limit) || PAGE));

  // Categories the customer showed interest in (from the products they viewed).
  let interestedCats: string[] = [];
  if (seenIds.length) {
    const { data } = await svc.from("products").select("category_id").in("id", seenIds);
    interestedCats = Array.from(new Set(((data as any[]) ?? []).map((r) => r.category_id).filter(Boolean)));
  }

  const { data: allData } = await svc.from("products").select("*").eq("is_active", true).order("created_at", { ascending: false }).limit(POOL);
  let pool = (allData as Product[]) ?? [];

  // Rank: interested-category products first (recency preserved), already-seen
  // ones nudged slightly lower so fresh picks surface.
  if (interestedCats.length) {
    const cats = new Set(interestedCats);
    const seen = new Set(seenIds);
    pool = pool
      .map((p, idx) => ({ p, idx, score: (cats.has((p as any).category_id) ? 0 : 1) + (seen.has(p.id) ? 0.5 : 0) }))
      .sort((a, b) => a.score - b.score || a.idx - b.idx)
      .map((x) => x.p);
  }

  const products = pool.slice(offset, offset + limit);
  const hasMore = offset + limit < pool.length;
  return { products, hasMore };
}
