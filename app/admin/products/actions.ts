"use server";

import { getServerSupabase } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/admin-auth";
import { revalidatePath } from "next/cache";
import { toSlug } from "@/lib/slug";
import { aiTranslate, bilingualize, hasBengali, translateStrings, translateSpecs, translateFaq } from "@/lib/ai-translate";

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

const OPTIONAL_COLS = ["rating", "review_count", "highlights", "specs", "how_to_use", "faq", "video_url", "description_images", "highlights_en", "specs_en", "faq_en", "how_to_use_en"];
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

  // Premium page content — bilingual. Whichever language the admin typed, the other
  // is AI-generated so highlights / specs / FAQ / how-to-use also switch with the site.
  const hlSrc = parseHighlights(input.highlights_text) || [];
  const spSrc = parseSpecs(input.specs_text) || [];
  const faqSrc = parseFaq(input.faq_text) || [];
  const howSrc = input.how_to_use?.trim() || "";

  let highlightsBn: string[] | null = hlSrc.length ? hlSrc : null;
  let highlightsEn: string[] | null = null;
  if (hlSrc.length) {
    if (hasBengali(input.highlights_text || "")) highlightsEn = await translateStrings(hlSrc, "en");
    else { highlightsEn = hlSrc; highlightsBn = await translateStrings(hlSrc, "bn"); }
  }

  let specsBn: { label: string; value: string }[] | null = spSrc.length ? spSrc : null;
  let specsEn: { label: string; value: string }[] | null = null;
  if (spSrc.length) {
    if (hasBengali(input.specs_text || "")) specsEn = await translateSpecs(spSrc, "en");
    else { specsEn = spSrc; specsBn = await translateSpecs(spSrc, "bn"); }
  }

  let faqBn: { q: string; a: string }[] | null = faqSrc.length ? faqSrc : null;
  let faqEn: { q: string; a: string }[] | null = null;
  if (faqSrc.length) {
    if (hasBengali(input.faq_text || "")) faqEn = await translateFaq(faqSrc, "en");
    else { faqEn = faqSrc; faqBn = await translateFaq(faqSrc, "bn"); }
  }

  let howBn: string | null = howSrc || null;
  let howEn: string | null = null;
  if (howSrc) {
    if (hasBengali(howSrc)) howEn = (await aiTranslate(howSrc, "en")) || null;
    else { howEn = howSrc; howBn = (await aiTranslate(howSrc, "bn")) || howSrc; }
  }

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
    highlights: highlightsBn,
    highlights_en: highlightsEn,
    specs: specsBn,
    specs_en: specsEn,
    how_to_use: howBn,
    how_to_use_en: howEn,
    faq: faqBn,
    faq_en: faqEn,
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
  revalidatePath("/", "layout"); // purge every cached store page
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
export async function backfillTranslations(limit = 10): Promise<{ ok: boolean; updated: number; remaining: number; error?: string }> {
  await requireAdmin();
  const supabase = getServerSupabase();
  const arrLen = (x: any) => Array.isArray(x) && x.length > 0;
  try {
    // Try to read premium columns too; if they don't exist yet (migration not run),
    // fall back to name + description only.
    let hasPremium = true;
    let res: any = await supabase
      .from("products")
      .select("id, name_bn, name_en, description_bn, description_en, highlights, highlights_en, specs, specs_en, faq, faq_en, how_to_use, how_to_use_en")
      .limit(500);
    if (res.error && isMissingOptionalCol(res.error)) {
      hasPremium = false;
      res = await supabase.from("products").select("id, name_bn, name_en, description_bn, description_en").limit(500);
    }
    if (res.error) return { ok: false, updated: 0, remaining: 0, error: res.error.message };

    const rows = (res.data as any[]) ?? [];
    const premiumNeed = (p: any) =>
      hasPremium && (
        (arrLen(p.highlights) && !arrLen(p.highlights_en)) ||
        (arrLen(p.specs) && !arrLen(p.specs_en)) ||
        (arrLen(p.faq) && !arrLen(p.faq_en)) ||
        ((p.how_to_use || "").trim() && !(p.how_to_use_en || "").trim())
      );
    const needs = rows.filter((p) => {
      const nb = (p.name_bn || "").trim(), ne = (p.name_en || "").trim();
      const db = (p.description_bn || "").trim(), de = (p.description_en || "").trim();
      const nameNeed = (nb && (!ne || ne === nb || hasBengali(ne))) || (ne && !nb);
      const descNeed = (db && !de) || (de && !db);
      return nameNeed || descNeed || premiumNeed(p);
    });

    const batch = needs.slice(0, Math.max(1, Math.min(30, limit)));
    let updated = 0;
    for (const p of batch) {
      const upd: Record<string, unknown> = {};
      // Name
      let nb = (p.name_bn || "").trim(), ne = (p.name_en || "").trim();
      if (nb && (!ne || ne === nb || hasBengali(ne))) ne = (await aiTranslate(nb, "en")) || ne || nb;
      else if (ne && !nb) nb = (await aiTranslate(ne, "bn")) || nb || ne;
      upd.name_bn = nb || null; upd.name_en = ne || nb || "Product";
      // Description
      let db = (p.description_bn || "").trim(), de = (p.description_en || "").trim();
      if (db && !de) de = (await aiTranslate(db, "en")) || de;
      else if (de && !db) db = (await aiTranslate(de, "bn")) || db;
      upd.description_bn = db || null; upd.description_en = de || null;
      // Premium content (existing content is Bengali → generate English)
      if (hasPremium) {
        if (arrLen(p.highlights) && !arrLen(p.highlights_en)) upd.highlights_en = await translateStrings(p.highlights, "en");
        if (arrLen(p.specs) && !arrLen(p.specs_en)) upd.specs_en = await translateSpecs(p.specs, "en");
        if (arrLen(p.faq) && !arrLen(p.faq_en)) upd.faq_en = await translateFaq(p.faq, "en");
        const hw = (p.how_to_use || "").trim();
        if (hw && !(p.how_to_use_en || "").trim()) upd.how_to_use_en = (await aiTranslate(hw, "en")) || null;
      }
      const { error: uErr } = await supabase.from("products").update(upd).eq("id", p.id);
      if (!uErr) updated++;
    }

    revalidatePath("/", "layout"); // purge every cached store page
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
  revalidatePath("/", "layout"); // purge every cached store page
  return { ok: true };
}
