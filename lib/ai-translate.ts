// lib/ai-translate.ts — server-side AI translation for product content.
// Runs on Claude (Haiku 4.5 — fast & cheap) via lib/llm.ts; falls back to Gemini only
// if no Claude key is configured.
//
// Every list is translated in ONE batched request (not one request per line), so a
// product save uses a handful of calls instead of 15–25 — cheaper and no rate limits.
import { llm, extractJson } from "@/lib/llm";

const BENGALI = /[ঀ-৿]/;
export function hasBengali(s: string): boolean {
  return BENGALI.test(s || "");
}

const LANG = { en: "English", bn: "Bengali (Bangla)" } as const;

/**
 * Translate many short texts in a single AI call. Returns an array of the same
 * length; any item that can't be translated falls back to its source text.
 */
export async function translateBatch(texts: string[], target: "en" | "bn"): Promise<string[]> {
  const src = (texts || []).map((t) => (t ?? "").toString());
  const idx = src.map((t, i) => (t.trim() ? i : -1)).filter((i) => i >= 0);
  if (!idx.length) return src;

  const items = idx.map((i) => src[i]);
  const prompt =
    `Translate each item of this JSON array into natural, fluent ${LANG[target]} for a Bangladeshi mom & baby online store's product listing. ` +
    `Keep meaning and length similar, keep numbers/units, don't transliterate brand names, don't add anything. ` +
    `Reply with ONLY a JSON array of exactly ${items.length} strings, in the same order.\n\n` +
    JSON.stringify(items);

  const res = await llm({ prompt, tier: "fast", maxTokens: Math.min(4096, 200 + items.join("").length * 3) });
  if (!res.ok) return src;
  const out = extractJson<unknown[]>(res.text);
  if (!Array.isArray(out) || out.length !== items.length) return src;

  const result = [...src];
  idx.forEach((i, k) => {
    const v = typeof out[k] === "string" ? (out[k] as string).trim() : "";
    if (v) result[i] = v;
  });
  return result;
}

/** Translate one short text. Returns "" if there's nothing to translate or AI is unavailable. */
export async function aiTranslate(text: string, target: "en" | "bn"): Promise<string> {
  const clean = (text || "").trim();
  if (!clean) return "";
  const [out] = await translateBatch([clean], target);
  return out && out !== clean ? out : (hasBengali(clean) === (target === "bn") ? clean : "");
}

/** Translate an array of short strings (one AI call; falls back to source). */
export async function translateStrings(arr: string[], target: "en" | "bn"): Promise<string[]> {
  return translateBatch(arr || [], target);
}

/** Translate spec rows ({label,value}) in one AI call. */
export async function translateSpecs(
  specs: { label: string; value: string }[], target: "en" | "bn"
): Promise<{ label: string; value: string }[]> {
  const list = specs || [];
  const flat = await translateBatch(list.flatMap((s) => [s.label, s.value]), target);
  return list.map((s, i) => ({ label: flat[i * 2] || s.label, value: flat[i * 2 + 1] || s.value }));
}

/** Translate FAQ rows ({q,a}) in one AI call. */
export async function translateFaq(
  faq: { q: string; a: string }[], target: "en" | "bn"
): Promise<{ q: string; a: string }[]> {
  const list = faq || [];
  const flat = await translateBatch(list.flatMap((f) => [f.q, f.a]), target);
  return list.map((f, i) => ({ q: flat[i * 2] || f.q, a: flat[i * 2 + 1] || f.a }));
}

/** Given whatever the admin typed (one language), produce both language versions. */
export async function bilingualize(
  primary: string,
  kind: "name" | "description" = "name"
): Promise<{ bn: string; en: string }> {
  void kind;
  const text = (primary || "").trim();
  if (!text) return { bn: "", en: "" };
  if (hasBengali(text)) {
    const en = (await aiTranslate(text, "en")) || text;
    return { bn: text, en };
  }
  const bn = (await aiTranslate(text, "bn")) || text;
  return { bn, en: text };
}
