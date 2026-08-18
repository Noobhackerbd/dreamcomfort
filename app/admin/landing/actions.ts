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
  revalidatePath("/");
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
  list: { key: string; name: string; productSlugs: string[] }[]
) {
  await requireAdmin();
  const seen = new Set<string>();
  const clean = (list || [])
    .map((v) => ({
      key: slugifyKey(v.key),
      name: (v.name || v.key || "").trim() || slugifyKey(v.key),
      productSlugs: Array.isArray(v.productSlugs) ? v.productSlugs.filter(Boolean) : [],
    }))
    .filter((v) => v.key && !seen.has(v.key) && seen.add(v.key));

  try {
    await saveSetting("landing_variants", { list: clean });
  } catch (e: any) {
    return { ok: false, error: e?.message ?? "সেভ ব্যর্থ হয়েছে।" };
  }
  revalidatePath("/");
  revalidatePath("/admin/landing");
  clean.forEach((v) => revalidatePath("/" + v.key));
  return { ok: true, keys: clean.map((v) => v.key) };
}
