"use server";

// app/product/review-actions.ts — customer product reviews (with optional photos).

import { getServerSupabase } from "@/lib/supabase/server";
import { getCustomerSession } from "@/lib/customer-auth";

export interface Review {
  id: string; name: string | null; rating: number; body: string | null; images: string[] | null; created_at: string;
}

/** Upload one review photo (base64, already downscaled client-side) → public URL. */
export async function uploadReviewPhoto(base64: string, mediaType: string) {
  try {
    const svc = getServerSupabase();
    const ext = (mediaType.split("/")[1] || "jpg").replace(/[^a-z0-9]/gi, "") || "jpg";
    const path = `reviews/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const bytes = Buffer.from(base64, "base64");
    const { error } = await svc.storage.from("product-images").upload(path, bytes, { contentType: mediaType || "image/jpeg", cacheControl: "3600", upsert: false });
    if (error) return { ok: false, error: error.message };
    const { data } = svc.storage.from("product-images").getPublicUrl(path);
    return { ok: true, url: data.publicUrl };
  } catch (e: any) {
    return { ok: false, error: e?.message ?? "আপলোড ব্যর্থ।" };
  }
}

export async function submitReview(input: { productId: string; name: string; rating: number; body: string; images?: string[] }) {
  const name = (input.name || "").trim();
  const rating = Math.min(5, Math.max(1, Math.round(Number(input.rating) || 0)));
  const body = (input.body || "").trim().slice(0, 2000);
  if (!input.productId) return { ok: false, error: "পণ্য পাওয়া যায়নি।" };
  if (!name) return { ok: false, error: "নাম দিন।" };
  if (!rating) return { ok: false, error: "রেটিং দিন।" };
  if (body.length < 3) return { ok: false, error: "রিভিউ লিখুন।" };
  const session = await getCustomerSession();
  try {
    const svc = getServerSupabase();
    const { error } = await svc.from("product_reviews").insert({
      product_id: input.productId, user_id: session?.userId ?? null,
      name, rating, body, images: (input.images || []).slice(0, 4), status: "approved",
    });
    if (error) return { ok: false, error: error.message };
    // Keep products.rating (avg) + review_count in sync so the PRODUCT CARD shows
    // the rating too — the card reads products.rating, not the reviews table.
    await syncProductRating(svc, input.productId);
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e?.message ?? "ব্যর্থ।" };
  }
}

/** Recompute a product's average rating + review count from approved reviews. */
async function syncProductRating(svc: ReturnType<typeof getServerSupabase>, productId: string) {
  try {
    const { data } = await svc.from("product_reviews").select("rating").eq("product_id", productId).eq("status", "approved");
    const ratings = (data ?? []).map((r: any) => Number(r.rating) || 0).filter((n: number) => n > 0);
    const count = ratings.length;
    const avg = count ? Math.round((ratings.reduce((a: number, b: number) => a + b, 0) / count) * 10) / 10 : null;
    await svc.from("products").update({ rating: avg, review_count: count }).eq("id", productId);
  } catch {}
}

export async function getReviews(productId: string): Promise<{ reviews: Review[]; count: number; average: number }> {
  try {
    const svc = getServerSupabase();
    const { data } = await svc.from("product_reviews")
      .select("id, name, rating, body, images, created_at")
      .eq("product_id", productId).eq("status", "approved")
      .order("created_at", { ascending: false }).limit(50);
    const reviews = (data ?? []) as Review[];
    const count = reviews.length;
    const average = count ? Math.round((reviews.reduce((s, r) => s + Number(r.rating || 0), 0) / count) * 10) / 10 : 0;
    return { reviews, count, average };
  } catch {
    return { reviews: [], count: 0, average: 0 };
  }
}
