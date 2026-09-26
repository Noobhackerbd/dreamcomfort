// app/api/image-search/route.ts — visual product search.
// Sends the uploaded photo to the AI (Claude Haiku via lib/llm.ts; Gemini only if no
// Claude key is set), gets a few search keywords, then
// finds the first keyword that matches a real product and returns it so the
// storefront can show results. The Gemini API key comes from the admin Settings
// page (settings key "gemini"), falling back to the GEMINI_API_KEY env var.
// No key set → returns not_configured (the button shows a friendly message).
import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";
import { llm, llmProvider } from "@/lib/llm";

export const runtime = "nodejs";
export const maxDuration = 30;

const PROMPT =
  "You are a product search assistant for a Bangladeshi mom & baby online store " +
  "(pregnancy pillows, baby care, feeders, blankets, etc.). Look at the image and " +
  "give 3 short search keywords to find matching products in the catalog. Prefer " +
  "Bengali (Bangla) terms since the catalog is in Bengali, and include one English " +
  "term. Output ONLY the keywords, comma-separated, no numbering, no extra text. " +
  "Each keyword must be 1-3 words. Example: প্রেগনেন্সি পিলো, বেবি পিলো, pregnancy pillow";

export async function POST(req: NextRequest) {
  if (!(await llmProvider())) return NextResponse.json({ ok: false, reason: "not_configured" });

  let image = "", mime = "image/jpeg";
  try {
    const body = (await req.json()) as { image?: string; mime?: string };
    image = body.image || "";
    mime = body.mime || "image/jpeg";
  } catch {
    return NextResponse.json({ ok: false, reason: "bad_request" }, { status: 400 });
  }
  if (!image) return NextResponse.json({ ok: false, reason: "no_image" }, { status: 400 });

  // 1) Ask the AI what the product is.
  let keywords: string[] = [];
  const res = await llm({ prompt: PROMPT, image: { data: image, mime }, tier: "fast", maxTokens: 128, timeoutMs: 25000 });
  if (!res.ok) return NextResponse.json({ ok: false, reason: "vision_failed", detail: res.error });
  keywords = res.text.split(/[,\n]/).map((s) => s.replace(/^[-*•\d.\s]+/, "").trim()).filter(Boolean).slice(0, 5);
  if (keywords.length === 0) return NextResponse.json({ ok: false, reason: "no_keywords" });

  // 2) Return the first keyword that actually matches a product.
  try {
    const svc = getServerSupabase();
    for (const kw of keywords) {
      const like = `%${kw.replace(/[%_]/g, "")}%`;
      const { data } = await svc
        .from("products")
        .select("slug")
        .eq("is_active", true)
        .or(`name_bn.ilike.${like},name_en.ilike.${like}`)
        .limit(1);
      if (data && data.length) return NextResponse.json({ ok: true, q: kw });
    }
  } catch {
    /* fall through */
  }
  // Nothing matched — still send the best guess so the user sees the search term.
  return NextResponse.json({ ok: true, q: keywords[0], noMatch: true });
}
