// lib/ai.ts — Anthropic vision helper used by the "AI order from screenshot" feature.
// Reads a Messenger/WhatsApp order screenshot and extracts the customer's
// name / phone / address so the admin only has to pick the product + amount.

import { getAiSettings } from "@/lib/settings";

export async function aiConfigured(): Promise<boolean> {
  const s = await getAiSettings();
  return !!s.apiKey;
}

export interface ExtractedOrder {
  name: string;
  phone: string;
  address: string;
  area: string;
  city: string;
  note: string;
}

const EXTRACT_PROMPT = `You extract a delivery order from a screenshot for a Bangladeshi online shop.
The image is a Messenger/WhatsApp chat or an order note. Text may be in Bengali, English, or "Banglish" (Bengali written in English letters), and numbers may be in Bengali digits (০-৯).

Read the WHOLE image carefully — top to bottom — before answering. The customer often writes their details across several lines or messages, sometimes after labels like "নাম/Name", "মোবাইল/নম্বর/Phone/Number", "ঠিকানা/Address". Combine multi-line address parts into one address.

Return ONLY a single JSON object with EXACTLY these keys and nothing else:
{"name": "", "phone": "", "address": "", "area": "", "city": "", "note": ""}

Field rules:
- name: the CUSTOMER's full name (not the shop/page name).
- phone: the customer's Bangladeshi mobile number as ENGLISH digits only, local format 01XXXXXXXXX (11 digits). Convert Bengali digits to English. Strip spaces, dashes, +88 or 88 country code (88017... → 017...). If several numbers appear, choose the customer's delivery number, not the shop's.
- address: the FULL delivery address — house/road/village + landmark, joined into one line. Include everything the customer gave for delivery.
- area: thana/upazila/area if present (e.g. Mirpur, Savar). Else "".
- city: district/city if present (e.g. Dhaka, Chattogram). Else "".
- note: any special delivery instruction. Else "".

Do NOT invent values. If a field is truly not in the image, use "". Prefer extracting SOMETHING for name/phone/address if it is present anywhere in the image — do not leave them empty just because they lack a label.
Return ONLY the JSON object. No markdown, no explanation.`;

/** Convert Bengali/Arabic-Indic digits to ASCII and keep only 0-9. */
function toEnglishDigits(s: string): string {
  const bn = "০১২৩৪৫৬৭৮৯";
  return String(s || "")
    .replace(/[০-৯]/g, (d) => String(bn.indexOf(d)))
    .replace(/\D/g, "");
}

/** Normalize an extracted BD phone to local 01XXXXXXXXX when possible. */
function normalizePhone(raw: string): string {
  let d = toEnglishDigits(raw);
  if (d.startsWith("00")) d = d.slice(2);
  if (d.startsWith("880")) d = "0" + d.slice(3);
  else if (d.length === 10 && d.startsWith("1")) d = "0" + d;
  return d;
}

/** Send the screenshot to Anthropic and parse the extracted order JSON. */
export async function extractOrderFromImage(
  base64: string,
  mediaType: string
): Promise<{ ok: boolean; data?: ExtractedOrder; error?: string }> {
  const s = await getAiSettings();
  if (!s.apiKey) return { ok: false, error: "AI API key সেট করা নেই (Settings এ যোগ করুন)।" };

  // Retired legacy models (claude-3-*) no longer exist on the API — remap to a current one.
  let model = (s.model || "").trim() || "claude-sonnet-5";
  if (/^claude-(3|2|instant)/i.test(model)) model = "claude-sonnet-5";

  const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif"];
  const mt = allowed.includes(mediaType) ? mediaType : "image/jpeg";

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": s.apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model,
        max_tokens: 800,
        messages: [
          {
            role: "user",
            content: [
              { type: "image", source: { type: "base64", media_type: mt, data: base64 } },
              { type: "text", text: EXTRACT_PROMPT },
            ],
          },
          // Prefill the reply with "{" so the model is forced to output only JSON.
          { role: "assistant", content: "{" },
        ],
      }),
    });

    const data = await res.json().catch(() => null);
    if (!res.ok) {
      return { ok: false, error: data?.error?.message || `AI অনুরোধ ব্যর্থ (${res.status})।` };
    }

    // Concatenate every text block, and re-add the prefilled "{".
    const raw: string = Array.isArray(data?.content)
      ? data.content.filter((c: any) => c?.type === "text").map((c: any) => c.text).join("")
      : "";
    const full = "{" + raw;
    const match = full.match(/\{[\s\S]*\}/);
    if (!match) return { ok: false, error: "স্ক্রিনশট থেকে তথ্য পড়া যায়নি। আবার চেষ্টা করুন।" };

    let p: any;
    try {
      p = JSON.parse(match[0]);
    } catch {
      // salvage: cut to the last closing brace
      const cut = match[0].slice(0, match[0].lastIndexOf("}") + 1);
      try { p = JSON.parse(cut); } catch { return { ok: false, error: "স্ক্রিনশট থেকে তথ্য পড়া যায়নি। আবার চেষ্টা করুন।" }; }
    }
    return {
      ok: true,
      data: {
        name: String(p.name ?? "").trim(),
        phone: normalizePhone(String(p.phone ?? "")),
        address: String(p.address ?? "").trim(),
        area: String(p.area ?? "").trim(),
        city: String(p.city ?? "").trim(),
        note: String(p.note ?? "").trim(),
      },
    };
  } catch (e: any) {
    return { ok: false, error: e?.message ?? "AI নেটওয়ার্ক সমস্যা।" };
  }
}
