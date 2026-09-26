"use server";

import { requireAdmin } from "@/lib/admin-auth";
import { saveSetting } from "@/lib/settings";
import type { HomeBannersSettings } from "@/lib/settings";
import { revalidatePath } from "next/cache";

export async function saveFeatured(input: { productIds: string[] }) {
  await requireAdmin();
  try {
    const productIds = Array.from(new Set((input.productIds || []).filter((x) => typeof x === "string" && x))).slice(0, 30);
    await saveSetting("featured", { productIds });
  } catch (e: any) {
    return { ok: false, error: e?.message ?? "Save failed. Is the settings table present (supabase-migration-2.sql)?" };
  }
  revalidatePath("/admin/home");
  revalidatePath("/");
  return { ok: true };
}

export async function saveHomeStrip(input: { gif: string; link?: string }) {
  await requireAdmin();
  try {
    await saveSetting("home_strip", { gif: (input.gif || "").trim(), link: (input.link || "").trim() });
  } catch (e: any) {
    return { ok: false, error: e?.message ?? "Save failed. Is the settings table present (supabase-migration-2.sql)?" };
  }
  revalidatePath("/admin/home");
  revalidatePath("/");
  return { ok: true };
}

export async function savePromoPopup(input: { enabled: boolean; image: string; link?: string }) {
  await requireAdmin();
  try {
    await saveSetting("promo_popup", {
      enabled: !!input.enabled,
      image: (input.image || "").trim(),
      link: (input.link || "").trim(),
      rev: Date.now(), // bump so visitors who dismissed the previous banner see this one
    });
  } catch (e: any) {
    return { ok: false, error: e?.message ?? "Save failed. Is the settings table present (supabase-migration-2.sql)?" };
  }
  revalidatePath("/admin/home");
  revalidatePath("/");
  return { ok: true };
}

export async function saveFlashSale(input: { title: string; productIds: string[]; endsAt?: string }) {
  await requireAdmin();
  try {
    const title = (input.title || "").trim().slice(0, 60) || "ফ্ল্যাশ সেল";
    const productIds = Array.from(new Set((input.productIds || []).filter((x) => typeof x === "string" && x))).slice(0, 30);
    let endsAt = "";
    if (input.endsAt) { const t = new Date(input.endsAt); if (!isNaN(t.getTime())) endsAt = t.toISOString(); }
    await saveSetting("flash_sale", { title, productIds, endsAt });
  } catch (e: any) {
    return { ok: false, error: e?.message ?? "Save failed. Is the settings table present (supabase-migration-2.sql)?" };
  }
  revalidatePath("/admin/home");
  revalidatePath("/");
  return { ok: true };
}

export async function saveHomeBanners(banners: HomeBannersSettings) {
  await requireAdmin();
  const clean = (arr: any[]) =>
    (arr || [])
      .filter((b) => b && typeof b.image === "string" && b.image.trim())
      .map((b) => ({ image: b.image.trim(), link: (b.link || "").trim() || undefined }));
  try {
    await saveSetting("home_banners", { hero: clean(banners?.hero || []), offers: clean(banners?.offers || []) });
  } catch (e: any) {
    return { ok: false, error: e?.message ?? "Save failed. Is the settings table present (supabase-migration-2.sql)?" };
  }
  revalidatePath("/admin/home");
  revalidatePath("/");
  return { ok: true };
}
