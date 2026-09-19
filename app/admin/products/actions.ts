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
  description_images?: string[]; // extra photos shown inside the product description
  rating?: number | null;
  review_count?: number | null;
  // Rich product-page content (optional, entered as text; parsed here).
  highlights_text?: string;   // one per line
  specs_text?: string;        // "label: value" per line
  how_to_use?: string;
  faq_text?: string;          // "Question | Answer" per line
  video_url?: string;
}

const OPTIONAL_COLS = ["rating", "review_count", "highlights", "specs", "how_to_use", "faq", "video_url", "description_images"];
/** True when the error is a "column doesn't exist" for one of the optional/newer columns. */
function isMissingOptionalCol(error: any): boolean {
  return !!error && (error.code === "42703" || new RegExp(OPTIONAL_COLS.join("|"), "i").test(error.message || ""));
}

function parseHighlights(t?: string): string[] | null {
  const arr = (t || "").split("\n").map((s) => s.trim()).filter(Boolean);
  return arr.length ? arr : null;
}
function parseSpecs(t?: string): { label: string; value: string }[] | null {
  const arr = (t || "").split("\n").map((l) => l.trim()).filter(Boolean).map((l) => {
    const i = l.indexOf(":");
    return i > 0 ? { label: l.slice(0, i).trim(), value: l.slice(i + 1).trim() } : null;
  }).filter(Boolean) as { label: string; value: string }[];
  return arr.length ? arr : null;
}
function parseFaq(t?: string): { q: string; a: string }[] | null {
  const arr = (t || "").split("\n").map((l) => l.trim()).filter(Boolean).map((l) => {
    const i = l.indexOf("|");
    return i > 0 ? { q: l.slice(0, i).trim(), a: l.slice(i + 1).trim() } : null;
  }).filter(Boolean) as { q: string; a: string }[];
  return arr.length ? arr : null;
}

export async function saveProduct(input: ProductInput) {
  await requireAdmin();
  const supabase = getServerSupabase();

  const rating = input.rating == null || input.rating === ("" as any) ? null : Math.min(5, Math.max(0, Number(input.rating)));
  const reviewCount = input.review_count == null || input.review_count === ("" as any) ? null : Math.max(0, Math.floor(Number(input.review_count)));

  const row: Record<string, unknown> = {
    name_bn: input.name_bn?.trim() || null,
    name_en: input.name_en?.trim() || input.name_bn?.trim() || "Product",
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
    description_images: input.description_images && input.description_images.length ? input.description_images : null,
    rating,
    review_count: reviewCount,
    highlights: parseHighlights(input.highlights_text),
    specs: parseSpecs(input.specs_text),
    how_to_use: input.how_to_use?.trim() || null,
    faq: parseFaq(input.faq_text),
    video_url: input.video_url?.trim() || null,
  };
  const stripOptional = (o: Record<string, unknown>) => { for (const c of OPTIONAL_COLS) delete o[c]; return o; };

  if (input.id) {
    const update: Record<string, unknown> = { ...row };
    if (input.slug?.trim()) update.slug = slugify(input.slug);
    let { error } = await supabase.from("products").update(update).eq("id", input.id);
    if (error && isMissingOptionalCol(error)) {
      // Newer columns not migrated yet — save the rest so the product still updates.
      ({ error } = await supabase.from("products").update(stripOptional({ ...update })).eq("id", input.id));
    }
    if (error) return { ok: false, error: error.message };
  } else {
    const slug = slugify(input.slug || input.name_en || input.name_bn || "");
    let { error } = await supabase.from("products").insert({ ...row, slug });
    if (error && isMissingOptionalCol(error)) {
      ({ error } = await supabase.from("products").insert({ ...stripOptional({ ...row }), slug }));
    }
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
