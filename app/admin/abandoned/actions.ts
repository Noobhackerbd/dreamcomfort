"use server";

import { getServerSupabase } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/admin-auth";
import { revalidatePath } from "next/cache";

/** Manually mark a lead as recovered/converted (e.g. after a phone follow-up). */
export async function markAbandonedConverted(id: string) {
  await requireAdmin();
  const supabase = getServerSupabase();
  const { error } = await supabase.from("abandoned_carts").update({ status: "converted" }).eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/abandoned");
  return { ok: true };
}

/** Move a lead back to abandoned. */
export async function markAbandonedOpen(id: string) {
  await requireAdmin();
  const supabase = getServerSupabase();
  const { error } = await supabase.from("abandoned_carts").update({ status: "abandoned" }).eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/abandoned");
  return { ok: true };
}

/** Delete a lead. */
export async function deleteAbandoned(id: string) {
  await requireAdmin();
  const supabase = getServerSupabase();
  const { error } = await supabase.from("abandoned_carts").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/abandoned");
  return { ok: true };
}
