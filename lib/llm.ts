// lib/llm.ts — one place for every text/vision AI call in the store.
//
// Provider: Claude (Anthropic) whenever an Anthropic key is set in Admin → Settings → AI
// (settings key "ai", env ANTHROPIC_API_KEY). Falls back to Google Gemini only if no
// Claude key exists. Used by: product auto-fill, AI translation, image search.
//
// Tiers:
//   "fast"    → Claude Haiku 4.5 (cheapest/fastest) — translation, image-search keywords
//   "quality" → the model chosen in Settings (default Claude Sonnet 5) — product copywriting
import { getAiSettings, getGeminiSettings } from "@/lib/settings";

export const CLAUDE_FAST_MODEL = "claude-haiku-4-5-20251001";
const CLAUDE_DEFAULT_MODEL = "claude-sonnet-5";

export interface LlmImage { data: string; mime: string } // base64 (no data: prefix)

export interface LlmRequest {
  prompt: string;
  system?: string;
  image?: LlmImage | null;
  maxTokens?: number;
  tier?: "fast" | "quality";
  timeoutMs?: number;
}

export type LlmResult = { ok: true; text: string; provider: "claude" | "gemini" } | { ok: false; error: string };

const CLAUDE_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

/** Which provider will be used (for UI hints / "not configured" messages). */
export async function llmProvider(): Promise<"claude" | "gemini" | null> {
  const ai = await getAiSettings();
  if ((ai.apiKey || "").trim()) return "claude";
  const g = await getGeminiSettings();
  if ((g.apiKey || "").trim()) return "gemini";
  return null;
}

async function callClaude(apiKey: string, settingsModel: string, req: LlmRequest): Promise<LlmResult> {
  let model = req.tier === "fast" ? CLAUDE_FAST_MODEL : (settingsModel || "").trim() || CLAUDE_DEFAULT_MODEL;
  if (/^claude-(3|2|instant)/i.test(model)) model = CLAUDE_DEFAULT_MODEL; // retired models

  const content: any[] = [];
  if (req.image) {
    const mt = CLAUDE_IMAGE_TYPES.includes(req.image.mime) ? req.image.mime : "image/jpeg";
    content.push({ type: "image", source: { type: "base64", media_type: mt, data: req.image.data } });
  }
  content.push({ type: "text", text: req.prompt });

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({
        model,
        max_tokens: req.maxTokens ?? 1024,
        ...(req.system ? { system: req.system } : {}),
        messages: [{ role: "user", content }],
      }),
      signal: AbortSignal.timeout(req.timeoutMs ?? 45000),
    });
    const data: any = await res.json().catch(() => null);
    if (!res.ok) {
      const msg = data?.error?.message || `Claude request failed (${res.status}).`;
      return { ok: false, error: res.status === 429 ? `Claude rate limit reached — please try again in a minute. (${msg})` : msg };
    }
    const text = Array.isArray(data?.content)
      ? data.content.filter((c: any) => c?.type === "text").map((c: any) => c.text).join("")
      : "";
    return { ok: true, text: text.trim(), provider: "claude" };
  } catch (e: any) {
    return { ok: false, error: e?.name === "TimeoutError" ? "AI took too long — please try again." : (e?.message ?? "Claude request failed.") };
  }
}

async function callGemini(apiKey: string, settingsModel: string, req: LlmRequest): Promise<LlmResult> {
  let model = settingsModel || "gemini-3.6-flash";
  if (/gemini-(1\.5|2\.0)/.test(model)) model = "gemini-3.6-flash";
  const parts: any[] = [{ text: req.system ? `${req.system}\n\n${req.prompt}` : req.prompt }];
  if (req.image) parts.push({ inline_data: { mime_type: req.image.mime, data: req.image.data } });
  try {
    const r = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts }],
          generationConfig: { temperature: 0.3, maxOutputTokens: req.maxTokens ?? 1024, thinkingConfig: { thinkingBudget: 0 } },
        }),
        signal: AbortSignal.timeout(req.timeoutMs ?? 45000),
      }
    );
    const j: any = await r.json().catch(() => null);
    if (!r.ok) return { ok: false, error: j?.error?.message || `Gemini request failed (${r.status}).` };
    const text = j?.candidates?.[0]?.content?.parts?.map((p: any) => p?.text || "").join("") || "";
    return { ok: true, text: text.trim(), provider: "gemini" };
  } catch (e: any) {
    return { ok: false, error: e?.name === "TimeoutError" ? "AI took too long — please try again." : (e?.message ?? "Gemini request failed.") };
  }
}

/** Run one AI request on the configured provider (Claude preferred). */
export async function llm(req: LlmRequest): Promise<LlmResult> {
  const ai = await getAiSettings();
  if ((ai.apiKey || "").trim()) return callClaude(ai.apiKey.trim(), ai.model, req);
  const g = await getGeminiSettings();
  if ((g.apiKey || "").trim()) return callGemini(g.apiKey.trim(), g.model, req);
  return { ok: false, error: "AI is not configured. Add your Claude (Anthropic) API key in Admin → Settings → AI." };
}

/** Pull the first JSON object/array out of a model reply (handles ```json fences / stray text). */
export function extractJson<T = any>(text: string): T | null {
  const t = (text || "").replace(/```(?:json)?/gi, "").trim();
  const ia = t.indexOf("["), io = t.indexOf("{");
  const order: (readonly ["{", "}"] | readonly ["[", "]"])[] =
    ia !== -1 && (io === -1 || ia < io) ? [["[", "]"], ["{", "}"]] : [["{", "}"], ["[", "]"]];
  for (const [open, close] of order) {
    const a = t.indexOf(open);
    const b = t.lastIndexOf(close);
    if (a !== -1 && b > a) {
      try { return JSON.parse(t.slice(a, b + 1)) as T; } catch { /* try next */ }
    }
  }
  try { return JSON.parse(t) as T; } catch { return null; }
}
