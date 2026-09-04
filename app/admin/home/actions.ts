"use server";

import { requireAdmin } from "@/lib/admin-auth";
import { saveSetting } from "@/lib/settings";
import type { HomeBannersSettings } from "@/lib/settings";
import { revalidatePath } from "next/cache";

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
