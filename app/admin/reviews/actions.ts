"use server";

import { getServerSupabase } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/admin-auth";
import { revalidatePath } from "next/cache";

export async function deleteReview(id: string) {
  await requireAdmin();
  try {
    const svc = getServerSupabase();
    await svc.from("product_reviews").delete().eq("id", id);
    revalidatePath("/admin/reviews");
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e?.message ?? "ব্যর্থ।" };
  }
}
