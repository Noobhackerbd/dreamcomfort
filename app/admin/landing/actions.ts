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
