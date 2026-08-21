"use server";

import { getServerSupabase } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/admin-auth";
import { revalidatePath } from "next/cache";
import { toSlug } from "@/lib/slug";

function slugify(input: string): string {
  // English/ASCII slug — Bengali names are transliterated to Latin so ?color= links work.
  return toSlug(input) || "product-" + Math.floor(Math.random() * 100000);
}

export interface ProductInput {
  id?: string;
  slug?: string;
  name_bn: string;
  name_en: string;
  price: number;
  compare_at_price?: number | null;
  stock: number;
  sku?: string;
  category_id?: string | null;
  description_bn?: string;
  description_en?: string;
  meta_title?: string;
  meta_description?: string;
  is_active: boolean;
  images: string[];
}

export async function saveProduct(input: ProductInput) {
  await requireAdmin();
  const supabase = getServerSupabase();

  const row = {
    name_bn: input.name_bn?.trim() || null,
    name_en: input.name_en?.trim() || input.name_bn?.trim() || "পণ্য",
    price: Number(input.price) || 0,
    compare_at_price: input.compare_at_price ? Number(input.compare_at_price) : null,
    stock: Math.max(0, Math.floor(Number(input.stock) || 0)),
    sku: input.sku?.trim() || null,
    category_id: input.category_id || null,
    description_bn: input.description_bn?.trim() || null,
    description_en: input.description_en?.trim() || null,
    meta_title: input.meta_title?.trim() || null,
    meta_description: input.meta_description?.trim() || null,
    is_active: !!input.is_active,
    images: input.images ?? [],
  };

  if (input.id) {
    const update: Record<string, unknown> = { ...row };
    if (input.slug?.trim()) update.slug = slugify(input.slug);
    const { error } = await supabase.from("products").update(update).eq("id", input.id);
    if (error) return { ok: false, error: error.message };
  } else {
    const slug = slugify(input.slug || input.name_en || input.name_bn || "");
    const { error } = await supabase.from("products").insert({ ...row, slug });
    if (error) return { ok: false, error: error.message };
  }

  revalidatePath("/admin/products");
  revalidatePath("/");
  return { ok: true };
}

export async function deleteProduct(id: string) {
  await requireAdmin();
  const supabase = getServerSupabase();
  const { error } = await supabase.from("products").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/products");
  revalidatePath("/");
  return { ok: true };
}
