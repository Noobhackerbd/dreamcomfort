// lib/ai-translate.ts — server-side AI translation for product name & description.
// Uses the same Google Gemini key configured in Admin → Settings (key "gemini"),
// the same one image-search already uses. Text-only, fast, thinking disabled.
import { getGeminiSettings } from "@/lib/settings";

const BENGALI = /[ঀ-৿]/;
export function hasBengali(s: string): boolean {
  return BENGALI.test(s || "");
}

/**
 * Translate a short product text to the target language.
 * Returns "" if there's nothing to translate or AI isn't configured — callers
 * fall back gracefully so a missing key never blocks saving a product.
 */
export async function aiTranslate(text: string, target: "en" | "bn"): Promise<string> {
  const clean = (text || "").trim();
  if (!clean) return "";
  const { apiKey, model } = await getGeminiSettings();
  if (!apiKey) return "";
  let MODEL = model || "gemini-3.6-flash";
  if (/gemini-(1\.5|2\.0)/.test(MODEL)) MODEL = "gemini-3.6-flash";

  const targetName = target === "en" ? "English" : "Bengali (Bangla)";
  const prompt =
    `You are translating product text for a Bangladeshi mom & baby online store. ` +
    `Translate the text below into natural, fluent ${targetName} suitable for an e-commerce product listing. ` +
    `Keep it concise, keep the meaning, do not add anything, do not transliterate brand names. ` +
    `Output ONLY the translation — no quotes, no labels, no notes.\n\nTEXT:\n${clean}`;

  try {
    const r = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${encodeURIComponent(apiKey)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.2, maxOutputTokens: 600, thinkingConfig: { thinkingBudget: 0 } },
        }),
      }
    );
    const j: any = await r.json();
    if (!r.ok) return "";
    const t: string = j?.candidates?.[0]?.content?.parts?.[0]?.text || "";
    return t.trim();
  } catch {
    return "";
  }
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
