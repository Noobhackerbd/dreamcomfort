"use server";

import { getServerSupabase } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/admin-auth";
import { revalidatePath } from "next/cache";
import { toSlug } from "@/lib/slug";
import { aiTranslate, bilingualize, hasBengali } from "@/lib/ai-translate";

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

  // ── AI bilingual fill ──────────────────────────────────────────────────────
  // The admin types the name/description in ONE language. Whichever language is
  // missing, AI fills it here so we always store both (the storefront reads the
  // stored columns, so rendering stays fast — no per-request translation).
  let nameBn = input.name_bn?.trim() || "";
  let nameEn = input.name_en?.trim() || "";
  if (nameBn && !nameEn) nameEn = (await aiTranslate(nameBn, "en")) || nameBn;
  else if (nameEn && !nameBn) nameBn = (await aiTranslate(nameEn, "bn")) || nameEn;

  let descBn = input.description_bn?.trim() || "";
  let descEn = input.description_en?.trim() || "";
  if (descBn && !descEn) descEn = (await aiTranslate(descBn, "en")) || "";
  else if (descEn && !descBn) descBn = (await aiTranslate(descEn, "bn")) || "";

  const row: Record<string, unknown> = {
    name_bn: nameBn || null,
    name_en: nameEn || nameBn || "Product",
    price: Number(input.price) || 0,
    compare_at_price: input.compare_at_price ? Number(input.compare_at_price) : null,
    stock: Math.max(0, Math.floor(Number(input.stock) || 0)),
    sku: input.sku?.trim() || null,
    category_id: input.category_id || null,
    description_bn: descBn || null,
    description_en: descEn || null,
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

/**
 * Preview AI translation for the product form (no DB write). Given whatever the
 * admin typed, returns both language versions so they can see/trust it.
 */
export async function previewTranslate(input: { name?: string; description?: string }): Promise<{
  ok: boolean; error?: string;
  name?: { bn: string; en: string }; description?: { bn: string; en: string };
}> {
  await requireAdmin();
  try {
    const { apiKey } = await getGeminiSettingsSafe();
    if (!apiKey) return { ok: false, error: "AI is not configured. Add a Gemini API key in Admin → Settings." };
    const name = (input.name || "").trim();
    const description = (input.description || "").trim();
    const [n, d] = await Promise.all([
      name ? bilingualize(name, "name") : Promise.resolve({ bn: "", en: "" }),
      description ? bilingualize(description, "description") : Promise.resolve({ bn: "", en: "" }),
    ]);
    return { ok: true, name: n, description: d };
  } catch (e: any) {
    return { ok: false, error: e?.message ?? "Translation failed." };
  }
}

// small helper so previewTranslate can check config without importing settings twice
async function getGeminiSettingsSafe(): Promise<{ apiKey: string }> {
  try { const { getGeminiSettings } = await import("@/lib/settings"); const s = await getGeminiSettings(); return { apiKey: s.apiKey }; }
  catch { return { apiKey: "" }; }
}

/**
 * Bulk backfill: translate existing products that are missing a language.
 * Processes up to `limit` products per call so it never times out; returns how
 * many were updated and whether more remain (call again to continue).
 */
export async function backfillTranslations(limit = 20): Promise<{ ok: boolean; updated: number; remaining: number; error?: string }> {
  await requireAdmin();
  const supabase = getServerSupabase();
  try {
    const { data, error } = await supabase
      .from("products")
      .select("id, name_bn, name_en, description_bn, description_en")
      .limit(500);
    if (error) return { ok: false, updated: 0, remaining: 0, error: error.message };

    const rows = (data as any[]) ?? [];
    // A product "needs" translation when a language is empty, or when name_en is
    // just a copy of name_bn (i.e. Bengali sitting in the English column).
    const needs = rows.filter((p) => {
      const nb = (p.name_bn || "").trim(), ne = (p.name_en || "").trim();
      const db = (p.description_bn || "").trim(), de = (p.description_en || "").trim();
      const nameNeed = (nb && (!ne || ne === nb || hasBengali(ne))) || (ne && !nb);
      const descNeed = (db && !de) || (de && !db);
      return nameNeed || descNeed;
    });

    const batch = needs.slice(0, Math.max(1, Math.min(50, limit)));
    let updated = 0;
    for (const p of batch) {
      let nb = (p.name_bn || "").trim(), ne = (p.name_en || "").trim();
      let db = (p.description_bn || "").trim(), de = (p.description_en || "").trim();
      // Name
      if (nb && (!ne || ne === nb || hasBengali(ne))) ne = (await aiTranslate(nb, "en")) || ne || nb;
      else if (ne && !nb) nb = (await aiTranslate(ne, "bn")) || nb || ne;
      // Description
      if (db && !de) de = (await aiTranslate(db, "en")) || de;
      else if (de && !db) db = (await aiTranslate(de, "bn")) || db;

      const { error: uErr } = await supabase.from("products").update({
        name_bn: nb || null, name_en: ne || nb || "Product",
        description_bn: db || null, description_en: de || null,
      }).eq("id", p.id);
      if (!uErr) updated++;
    }

    revalidatePath("/");
    revalidatePath("/products");
    return { ok: true, updated, remaining: Math.max(0, needs.length - batch.length) };
  } catch (e: any) {
    return { ok: false, updated: 0, remaining: 0, error: e?.message ?? "Backfill failed." };
  }
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
