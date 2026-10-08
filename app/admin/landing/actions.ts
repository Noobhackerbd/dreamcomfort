"use server";

import { requireAdmin } from "@/lib/admin-auth";
import { saveSetting } from "@/lib/settings";
import type { LandingConfig } from "@/lib/landing";
import { revalidatePath } from "next/cache";

export async function saveLanding(config: LandingConfig) {
  await requireAdmin();
  try {
    await saveSetting("landing", config);
  } catch (e: any) {
    return { ok: false, error: e?.message ?? "সেভ ব্যর্থ হয়েছে।" };
  }
  revalidatePath("/", "layout"); // purge every cached store page
  revalidatePath("/admin/landing");
  return { ok: true };
}

function slugifyKey(input: string): string {
  return String(input || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

export async function saveLandingVariants(
  list: {
    key: string;
    name: string;
    productSlugs: string[];
    theme?: string;
    /** "" / null = no override for that area (use the global Settings → Shipping value). */
    shippingInside?: number | string | null;
    shippingOutside?: number | string | null;
    reviewMode?: string;
    reviews?: { name?: string; text?: string; stars?: number | string; image?: string }[];
    reviewTitle?: string;
    reviewStat?: string;
  }[]
) {
  await requireAdmin();
  const seen = new Set<string>();
  const clean = (list || [])
    .map((v) => {
      // Clamped + rounded here so a stray value can never reach checkout.
      const fee = (raw: unknown) => {
        if (raw === null || raw === undefined || String(raw).trim() === "") return null;
        const n = Number(raw);
        return Number.isFinite(n) ? Math.max(0, Math.round(n)) : null;
      };
      return {
        key: slugifyKey(v.key),
        name: (v.name || v.key || "").trim() || slugifyKey(v.key),
        productSlugs: Array.isArray(v.productSlugs) ? v.productSlugs.filter(Boolean) : [],
        theme: v.theme === "bee" ? "bee" : "pillow",
        shippingInside: fee(v.shippingInside),
        shippingOutside: fee(v.shippingOutside),
        reviewMode: v.reviewMode === "custom" || v.reviewMode === "none" ? v.reviewMode : "inherit",
        // Drop blank rows so an empty editor row never renders as a blank review.
        reviews: (Array.isArray(v.reviews) ? v.reviews : [])
          .map((r) => ({
            name: (r?.name || "").trim(),
            text: (r?.text || "").trim(),
            stars: Math.min(5, Math.max(1, Math.round(Number(r?.stars) || 5))),
            image: (r?.image || "").trim(),
          }))
          .filter((r) => r.text),
        reviewTitle: (v.reviewTitle || "").trim(),
        reviewStat: (v.reviewStat || "").trim(),
      };
    })
    .filter((v) => v.key && !seen.has(v.key) && seen.add(v.key));

  try {
    await saveSetting("landing_variants", { list: clean });
  } catch (e: any) {
    return { ok: false, error: e?.message ?? "সেভ ব্যর্থ হয়েছে।" };
  }
  revalidatePath("/", "layout"); // purge every cached store page
  revalidatePath("/admin/landing");
  clean.forEach((v) => { revalidatePath("/" + v.key); revalidatePath(`/${v.key}/c/[color]`, "page"); });
  return { ok: true, keys: clean.map((v) => v.key) };
}
