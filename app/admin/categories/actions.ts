"use server";

import { getServerSupabase } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/admin-auth";
import { revalidatePath } from "next/cache";

function slugify(input: string): string {
  const base = input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9ঀ-৿]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return base || "category";
}

export async function saveCategory(input: {
  id?: string;
  name_bn: string;
  name_en: string;
  sort_order: number;
}) {
  await requireAdmin();
  const supabase = getServerSupabase();
  const row = {
    name_bn: input.name_bn?.trim() || null,
    name_en: input.name_en?.trim() || input.name_bn?.trim() || "Category",
    sort_order: Math.floor(Number(input.sort_order) || 0),
  };
  if (input.id) {
    const { error } = await supabase.from("categories").update(row).eq("id", input.id);
    if (error) return { ok: false, error: error.message };
  } else {
    const slug = slugify(input.name_en || input.name_bn);
    const { error } = await supabase.from("categories").insert({ ...row, slug });
    if (error) return { ok: false, error: error.message };
  }
  revalidatePath("/admin/categories");
  revalidatePath("/");
  return { ok: true };
}

export async function deleteCategory(id: string) {
  await requireAdmin();
  const supabase = getServerSupabase();
  const { error } = await supabase.from("categories").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/categories");
  return { ok: true };
}
