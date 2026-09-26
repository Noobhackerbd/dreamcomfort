// lib/ai-autofill.ts — AI auto-fill for the admin product form.
// From the product name (+ optional description and first product photo) Gemini
// drafts: English name, slug, category, description, highlights, specs, how-to-use,
// FAQ and SEO fields. Uses the same Gemini key as image search / translation.
//
// Guardrails (important for a baby/pregnancy store and for Meta ad policy): the model
// is told not to invent facts (materials, sizes, weights, certifications), prices,
// delivery promises or medical/health guarantees. Anything it can't infer is left empty.
import { getGeminiSettings } from "@/lib/settings";
import { toSlug } from "@/lib/slug";

export interface AutofillInput {
  name: string;
  description?: string;
  categories: { id: string; name: string }[];
  imageUrl?: string;
}

export interface AutofillResult {
  nameEn: string;
  slug: string;
  categoryId: string | null;
  description: string;
  highlights: string[];
  specs: { label: string; value: string }[];
  howToUse: string;
  faq: { q: string; a: string }[];
  metaTitle: string;
  metaDescription: string;
}

const MAX_IMAGE_BYTES = 4 * 1024 * 1024;

/** Only fetch our own product photos (Supabase Storage) — never arbitrary URLs. */
async function fetchImage(url?: string): Promise<{ data: string; mime: string } | null> {
  if (!url) return null;
  try {
    const u = new URL(url);
    if (u.protocol !== "https:" || !u.hostname.endsWith(".supabase.co")) return null;
    const r = await fetch(u.toString(), { signal: AbortSignal.timeout(8000) });
    if (!r.ok) return null;
    const mime = (r.headers.get("content-type") || "image/jpeg").split(";")[0];
    if (!mime.startsWith("image/")) return null;
    const buf = Buffer.from(await r.arrayBuffer());
    if (buf.length > MAX_IMAGE_BYTES) return null;
    return { data: buf.toString("base64"), mime };
  } catch {
    return null;
  }
}

const str = (v: unknown, max = 2000) => (typeof v === "string" ? v.trim().slice(0, max) : "");

export async function aiAutofillProduct(
  input: AutofillInput
): Promise<{ ok: true; data: AutofillResult } | { ok: false; error: string }> {
  const name = (input.name || "").trim();
  if (!name) return { ok: false, error: "Enter the product name first." };

  const { apiKey, model } = await getGeminiSettings();
  if (!apiKey) return { ok: false, error: "AI is not configured. Add a Gemini API key in Admin → Settings." };
  let MODEL = model || "gemini-3.6-flash";
  if (/gemini-(1\.5|2\.0)/.test(MODEL)) MODEL = "gemini-3.6-flash";

  const catList = input.categories.map((c) => `- ${c.id}: ${c.name}`).join("\n") || "(none)";
  const prompt = `You write product listings for "Dream Comfort", a Bangladeshi online store for mothers & babies (pregnancy pillows, baby care, bedding). Customers pay cash on delivery.

Product name: ${name}
${input.description ? `Admin's notes/description: ${input.description}\n` : ""}${input.imageUrl ? "A product photo is attached — use it to understand what the product is.\n" : ""}
Available categories (id: name):
${catList}

Write the listing in natural, warm, simple BENGALI (Bangla) — except "nameEn" and "slug" which are English.
Return ONLY a JSON object with exactly these keys:
{
  "nameEn": "short English product name (max 60 chars)",
  "slug": "english-url-slug-lowercase-with-dashes",
  "categoryId": "one id from the list above, or null if none fits",
  "description": "2-4 sentence Bengali description of what it is and who it's for",
  "highlights": ["3 to 5 short Bengali benefit points, max 40 chars each"],
  "specs": [{"label": "Bengali label", "value": "Bengali value"}],
  "howToUse": "short Bengali how-to-use / care text, or empty string",
  "faq": [{"q": "Bengali question", "a": "Bengali answer"}],
  "metaTitle": "Bengali SEO title, max 60 chars",
  "metaDescription": "Bengali SEO description, max 155 chars"
}

STRICT RULES:
- Do NOT invent facts you cannot see or infer: no made-up materials/fabric %, sizes, measurements, weights, brands, certifications, warranty or origin. If unsure, leave "specs" as [] or include only what is obvious from the name/photo/notes.
- NO medical or health guarantees (e.g. "cures back pain", "80% less pain"), no "best/No.1" claims, no prices, discounts or delivery-time promises.
- FAQ: 2-4 genuinely useful questions (use, care/washing, who it suits). Answers must not promise things you don't know — say "ধুতে পারবেন কিনা তা প্যাকেটে দেওয়া নির্দেশনা দেখুন" style when unsure.
- Output valid JSON only. No markdown, no comments.`;

  const img = await fetchImage(input.imageUrl);
  const parts: any[] = [{ text: prompt }];
  if (img) parts.push({ inline_data: { mime_type: img.mime, data: img.data } });

  let text = "";
  try {
    const r = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${encodeURIComponent(apiKey)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts }],
          generationConfig: {
            temperature: 0.4,
            maxOutputTokens: 2048,
            responseMimeType: "application/json",
            thinkingConfig: { thinkingBudget: 0 },
          },
        }),
        signal: AbortSignal.timeout(45000),
      }
    );
    const j: any = await r.json();
    if (!r.ok) return { ok: false, error: j?.error?.message || "AI request failed." };
    text = j?.candidates?.[0]?.content?.parts?.map((p: any) => p?.text || "").join("") || "";
  } catch (e: any) {
    return { ok: false, error: e?.name === "TimeoutError" ? "AI took too long — try again." : (e?.message ?? "AI request failed.") };
  }

  let raw: any;
  try {
    raw = JSON.parse(text.replace(/^```(?:json)?\s*|\s*```$/g, ""));
  } catch {
    return { ok: false, error: "AI returned an unexpected answer — please try again." };
  }

  // Sanitize everything (never trust model output shape).
  const validCat = input.categories.some((c) => c.id === raw?.categoryId) ? String(raw.categoryId) : null;
  const nameEn = str(raw?.nameEn, 80);
  const data: AutofillResult = {
    nameEn,
    slug: toSlug(str(raw?.slug, 80) || nameEn || name),
    categoryId: validCat,
    description: str(raw?.description, 1200),
    highlights: (Array.isArray(raw?.highlights) ? raw.highlights : []).map((h: unknown) => str(h, 80)).filter(Boolean).slice(0, 6),
    specs: (Array.isArray(raw?.specs) ? raw.specs : [])
      .map((s: any) => ({ label: str(s?.label, 40).replace(/:/g, ""), value: str(s?.value, 80) }))
      .filter((s: { label: string; value: string }) => s.label && s.value)
      .slice(0, 8),
    howToUse: str(raw?.howToUse, 800),
    faq: (Array.isArray(raw?.faq) ? raw.faq : [])
      .map((f: any) => ({ q: str(f?.q, 160).replace(/\|/g, "/"), a: str(f?.a, 400).replace(/\|/g, "/") }))
      .filter((f: { q: string; a: string }) => f.q && f.a)
      .slice(0, 5),
    metaTitle: str(raw?.metaTitle, 70),
    metaDescription: str(raw?.metaDescription, 170),
  };
  return { ok: true, data };
}
