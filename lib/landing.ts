// lib/landing.ts — landing/funnel page config (stored in settings 'landing').
import { getServerSupabase } from "@/lib/supabase/server";

export interface LandingReview {
  name: string;
  text: string;
  stars: number;
  image?: string;
}

export interface LandingBenefit {
  icon: string;
  title: string;
  text: string;
}

export interface LandingConfig {
  productSlug: string; // legacy single-product (kept for back-compat)
  productSlugs: string[]; // products featured on the landing (in order)
  logoUrl: string;
  headline: string;
  subheadline: string;
  heroImages: string[];
  badges: string[];
  benefits: LandingBenefit[];
  guaranteeTitle: string;
  guaranteeText: string;
  reviews: LandingReview[];
  ctaText: string;
  urgencyText: string;
  statText: string;
  /** Set when this config came from a named landing variant (e.g. "baby-pillow"). */
  landingKey?: string;
  /** Per-area delivery charge override for this landing (null = the global setting). */
  shippingOverride?: { inside: number | null; outside: number | null };
  /** Headline + stat for the reviews panel ("" = the site-wide default). */
  reviewTitle?: string;
  reviewStat?: string;
}

export const DEFAULT_LANDING: LandingConfig = {
  productSlug: "",
  productSlugs: [],
  logoUrl: "/logo.png",
  headline: "প্রিমিয়াম ডাবল লেয়ার প্রেগন্যান্সি পিলো",
  subheadline: "ডাবল লেয়ার প্রিমিয়াম সাপোর্টে সারারাত আরামের ঘুম — পিঠ, কোমর ও পায়ের ব্যথা থেকে মুক্তি। মা ও গর্ভের শিশুর জন্য নিরাপদ, নরম ও আরামদায়ক।",
  heroImages: [],
  badges: ["ক্যাশ অন ডেলিভারি", "সারা দেশে ফ্রি ডেলিভারি", "৩ দিনের মানিব্যাক গ্যারান্টি"],
  benefits: [
    { icon: "🛌", title: "আরামদায়ক ঘুম", text: "সঠিক পজিশনে ঘুমানোর পূর্ণ সাপোর্ট" },
    { icon: "💪", title: "ব্যথা কমায়", text: "পিঠ ও কোমরের চাপ ৮০% পর্যন্ত কমায়" },
    { icon: "🤰", title: "গর্ভবতী মায়েদের জন্য", text: "প্রেগন্যান্সিতে বিশেষভাবে উপযোগী" },
    { icon: "🌿", title: "প্রিমিয়াম ও নিরাপদ", text: "নরম, টেকসই ও স্কিন-ফ্রেন্ডলি ম্যাটেরিয়াল" },
  ],
  guaranteeTitle: "৩ দিনের মানিব্যাক গ্যারান্টি",
  guaranteeText: "পণ্য পছন্দ না হলে ৩ দিনের মধ্যে ফেরত দিন — কোনো প্রশ্ন ছাড়াই সম্পূর্ণ টাকা ফেরত।",
  reviews: [
    { name: "Sadia R.", text: "গর্ভাবস্থায় রাতে ঘুমাতে খুব কষ্ট হতো। এই পিলো ব্যবহারের পর অনেক আরাম পাচ্ছি।", stars: 5 },
    { name: "Nusrat J.", text: "কোমরের ব্যথা অনেক কমেছে। কাপড়ও খুব নরম। ধন্যবাদ Dream Comfort!", stars: 5 },
    { name: "Tania A.", text: "দ্রুত ডেলিভারি পেয়েছি, ক্যাশ অন ডেলিভারিতে অর্ডার করেছি। মান দারুণ।", stars: 5 },
  ],
  reviewTitle: "",
  reviewStat: "",
  ctaText: "অর্ডার কনফার্ম করুন",
  urgencyText: "🔥 সীমিত স্টক — আজই অর্ডার করুন!",
  statText: "৫০০০+ সন্তুষ্ট মা",
};

export async function getLandingConfig(): Promise<LandingConfig> {
  try {
    const supabase = getServerSupabase();
    const { data } = await supabase.from("settings").select("value").eq("key", "landing").single();
    if (data?.value) return { ...DEFAULT_LANDING, ...(data.value as Partial<LandingConfig>) };
  } catch {
    /* settings table not present yet */
  }
  return DEFAULT_LANDING;
}

/* ---------------- Extra landing pages (variants) ----------------
 * Same design as the homepage; only the featured products differ. Stored in the
 * settings row `landing_variants` = { list: [{ key, name, productSlugs }] }.
 * Reachable at /<key> (e.g. /landing2). */
export type LandingTheme = "pillow" | "bee";

export interface LandingVariant {
  key: string;
  name: string;
  productSlugs: string[];
  /** Visual design of the page. "pillow" = the original pink/blue funnel. */
  theme: LandingTheme;
  /**
   * Delivery charge for THIS landing page, in taka, per area. null = use the
   * global Settings → Shipping value for that area. Read server-side at checkout
   * (never trusted from the browser), so a customer can't change what they pay.
   */
  shippingInside: number | null;
  shippingOutside: number | null;
  /**
   * Whose customer reviews this page shows.
   *   inherit — the main landing's reviews (the default; right for a page selling the
   *             same product as the homepage funnel)
   *   custom  — this page's own list below
   *   none    — hide the reviews section entirely
   * A "custom" page with an empty list also hides the section, so a new landing never
   * shows reviews written for a different product.
   */
  reviewMode: "inherit" | "custom" | "none";
  reviews: LandingReview[];
  /** Headline + stat on the reviews panel. Empty = the site-wide default. */
  reviewTitle: string;
  reviewStat: string;
}

/** "" / null / rubbish → null (no override); anything numeric → a whole, non-negative taka amount. */
function toFee(raw: unknown): number | null {
  if (raw === null || raw === undefined || raw === "") return null;
  const n = Number(raw);
  return Number.isFinite(n) ? Math.max(0, Math.round(n)) : null;
}

export async function getLandingVariants(): Promise<LandingVariant[]> {
  try {
    const supabase = getServerSupabase();
    const { data } = await supabase.from("settings").select("value").eq("key", "landing_variants").single();
    const list = (data?.value as any)?.list;
    if (Array.isArray(list)) {
      return list
        .filter((v) => v && typeof v.key === "string" && v.key.trim())
        .map((v) => ({
          key: String(v.key).trim(),
          name: String(v.name || v.key),
          productSlugs: Array.isArray(v.productSlugs) ? v.productSlugs : [],
          theme: v.theme === "bee" ? ("bee" as const) : ("pillow" as const),
          // `shippingFee` is the older single-value form — still read as a fallback.
          shippingInside: toFee(v.shippingInside ?? v.shippingFee),
          shippingOutside: toFee(v.shippingOutside ?? v.shippingFee),
          reviewMode: v.reviewMode === "custom" || v.reviewMode === "none" ? v.reviewMode : "inherit",
          reviews: Array.isArray(v.reviews) ? (v.reviews as LandingReview[]) : [],
          reviewTitle: typeof v.reviewTitle === "string" ? v.reviewTitle : "",
          reviewStat: typeof v.reviewStat === "string" ? v.reviewStat : "",
        }));
    }
  } catch {
    /* no variants yet */
  }
  return [];
}

/** Config for a named landing variant — base landing config with its own products.
 *  Returns null if the key is not a registered variant. */
export async function getLandingConfigForVariant(key: string): Promise<LandingConfig | null> {
  const variants = await getLandingVariants();
  const v = variants.find((x) => x.key.toLowerCase() === key.toLowerCase());
  if (!v) return null;
  const base = await getLandingConfig();
  return { ...base, ...variantOverlay(v, base) };
}

/** The fields a landing variant overrides on the base config. */
function variantOverlay(v: LandingVariant, base: LandingConfig): Partial<LandingConfig> {
  return {
    productSlugs: v.productSlugs,
    productSlug: v.productSlugs[0] ?? base.productSlug,
    landingKey: v.key,
    shippingOverride: { inside: v.shippingInside, outside: v.shippingOutside },
    // "custom" uses this page's own list (empty → the section is hidden), "none" hides it,
    // "inherit" keeps the main landing's reviews.
    reviews: v.reviewMode === "none" ? [] : v.reviewMode === "custom" ? v.reviews : base.reviews,
    reviewTitle: v.reviewTitle || base.reviewTitle || "",
    reviewStat: v.reviewStat || base.reviewStat || "",
  };
}

/** Config + the variant record (theme, delivery charge) for a landing key. */
export async function getLandingVariantPage(
  key: string
): Promise<{ config: LandingConfig; variant: LandingVariant } | null> {
  const variant = await getLandingVariant(key);
  if (!variant) return null;
  const base = await getLandingConfig();
  return { variant, config: { ...base, ...variantOverlay(variant, base) } };
}

/** One landing variant by its URL key (case-insensitive), or null. */
export async function getLandingVariant(key: string): Promise<LandingVariant | null> {
  const k = (key || "").trim().toLowerCase();
  if (!k) return null;
  const variants = await getLandingVariants();
  return variants.find((v) => v.key.toLowerCase() === k) ?? null;
}

/**
 * What a landing page charges for delivery to `area`, or null when it has no
 * override (then the global Settings → Shipping value applies). Checkout calls this
 * with the landing key the order came from — the amount itself never travels from
 * the browser, so it cannot be tampered with.
 */
export async function getLandingShippingFee(
  key: string | undefined | null,
  area: "inside" | "outside"
): Promise<number | null> {
  if (!key) return null;
  try {
    const v = await getLandingVariant(key);
    if (!v) return null;
    return (area === "outside" ? v.shippingOutside : v.shippingInside) ?? null;
  } catch {
    return null;
  }
}
