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

/** Move a category up/down by swapping sort_order with its neighbour. */
export async function reorderCategory(id: string, direction: "up" | "down") {
  await requireAdmin();
  const supabase = getServerSupabase();
  const { data, error } = await supabase
    .from("categories")
    .select("id, sort_order")
    .order("sort_order", { ascending: true });
  if (error) return { ok: false, error: error.message };
  const list = data ?? [];
  const idx = list.findIndex((c: any) => c.id === id);
  if (idx === -1) return { ok: false, error: "Category not found." };
  const swapIdx = direction === "up" ? idx - 1 : idx + 1;
  if (swapIdx < 0 || swapIdx >= list.length) return { ok: true }; // already at the edge

  const a: any = list[idx];
  const b: any = list[swapIdx];
  // If neighbours share the same sort_order, nudge to make the swap take effect.
  const aOrder = Number(a.sort_order ?? 0);
  const bOrder = Number(b.sort_order ?? 0);
  const newA = bOrder === aOrder ? (direction === "up" ? aOrder - 1 : aOrder + 1) : bOrder;
  const newB = aOrder;
  await supabase.from("categories").update({ sort_order: newA }).eq("id", a.id);
  await supabase.from("categories").update({ sort_order: newB }).eq("id", b.id);
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
