// lib/sms/index.ts — order SMS through Automas (api.automas.com.bd), the same Bangladeshi
// gateway the phone-login codes use (supabase/functions/send-sms).
//
// Settings (Admin → SMS, stored in settings key "sms"):
//   enabled, apiKey, senderId, and which events send an SMS
//   (order_placed / confirmed / shipped / delivered). Manual SMS always send when enabled.
// AUTOMAS_API_KEY / AUTOMAS_SENDER_ID env vars, when set, override the saved key / sender.
//
// Every attempt is written to sms_logs (status sent / failed / skipped + gateway reply).
import "server-only";
import { getServerSupabase } from "@/lib/supabase/server";

export interface SmsResult {
  ok: boolean;
  status: "sent" | "failed" | "skipped";
  providerResponse?: string;
  error?: string;
}

export type SmsEvent = "order_placed" | "confirmed" | "shipped" | "delivered" | "manual" | "test";

export interface SmsConfig {
  enabled: boolean;
  apiKey: string;
  senderId: string;
  events: { order_placed: boolean; confirmed: boolean; shipped: boolean; delivered: boolean };
}

export const DEFAULT_SMS_CONFIG: SmsConfig = {
  enabled: false,
  apiKey: "",
  senderId: "",
  events: { order_placed: false, confirmed: true, shipped: true, delivered: false },
};

export async function getSmsConfig(): Promise<SmsConfig> {
  let saved: Partial<SmsConfig> = {};
  try {
    const { data } = await getServerSupabase().from("settings").select("value").eq("key", "sms").maybeSingle();
    saved = (data?.value as Partial<SmsConfig>) || {};
  } catch { /* table missing → defaults */ }
  return {
    ...DEFAULT_SMS_CONFIG,
    ...saved,
    apiKey: process.env.AUTOMAS_API_KEY || saved.apiKey || "",
    senderId: process.env.AUTOMAS_SENDER_ID || saved.senderId || "",
    events: { ...DEFAULT_SMS_CONFIG.events, ...(saved.events || {}) },
  };
}

/** Normalize any BD phone to 8801XXXXXXXXX (digits only). */
export function normalizeBdPhone(raw: string): string {
  let d = (raw || "").replace(/\D/g, "");
  if (d.startsWith("00")) d = d.slice(2);
  if (d.startsWith("0")) d = "88" + d;
  else if (d.startsWith("1")) d = "880" + d;
  else if (!d.startsWith("880")) d = "880" + d;
  return d;
}

const V4 = "https://api.automas.com.bd/smsapiv4";
const V3 = "https://api.automas.com.bd/smsapiv3";

const AUTOMAS_CODES: Record<number, string> = {
  101: "মেসেজের দৈর্ঘ্য ঠিক নেই", 102: "Sender ID ঠিক নেই", 103: "লগইন ব্যর্থ", 104: "ইউজার ঠিক নেই",
  105: "ফোন নম্বর ঠিক নেই", 106: "API key ভুল", 107: "অ্যাকাউন্ট বন্ধ", 108: "এই সার্ভারের IP অনুমোদিত নয়",
  109: "API চালু নেই", 110: "নম্বরটা DND-তে", 111: "মেসেজে স্প্যাম শব্দ", 1000: "ব্যালেন্স শেষ",
  2300: "অপারেটর রুট সমস্যা", 2400: "API চালু নেই", 3300: "Automas সিস্টেম সমস্যা",
};

/** Automas replies `[{status:0,…}]` or `{response:[{status:0,…}]}`; 0 = sent. */
function automasStatus(text: string): number | null {
  try {
    const j = JSON.parse(text);
    const first = Array.isArray(j) ? j[0] : Array.isArray(j?.response) ? j.response[0] : j?.response ?? j;
    const s = first?.status;
    return typeof s === "number" ? s : /^\d+$/.test(String(s ?? "")) ? Number(s) : null;
  } catch {
    const m = text.match(/"?status"?\s*[:=]\s*"?(\d+)/i);
    return m ? Number(m[1]) : null;
  }
}

async function call(url: string, init?: RequestInit) {
  const res = await fetch(url, { ...init, cache: "no-store", signal: AbortSignal.timeout(15000) });
  const text = (await res.text()).slice(0, 500);
  return { http: res.status, text, status: automasStatus(text) };
}

/** Send one SMS now. Bangla text goes as Unicode. */
export async function sendSms(rawPhone: string, message: string, cfg?: SmsConfig): Promise<SmsResult> {
  const c = cfg ?? (await getSmsConfig());
  if (!c.apiKey || !c.senderId) {
    return { ok: false, status: "skipped", providerResponse: "SMS not configured (Admin → SMS: API key + Sender ID)" };
  }
  const local = normalizeBdPhone(rawPhone).replace(/^88/, ""); // 01XXXXXXXXX
  if (!/^01\d{9}$/.test(local)) return { ok: false, status: "failed", error: "ফোন নম্বর ঠিক নেই", providerResponse: rawPhone };
  const unicode = /[^\x00-\x7F]/.test(message);

  try {
    // 1) JSON endpoint (the one the login-code function already uses successfully).
    const a = await call(V4, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ api_key: c.apiKey, senderid: c.senderId, type: unicode ? "unicode" : "text", scheduledDateTime: "", msg: message, contacts: local }),
    });
    if (a.status === 0) return { ok: true, status: "sent", providerResponse: a.text };
    // Account problems won't be fixed by another endpoint.
    if (a.status != null && [102, 103, 104, 106, 107, 108, 109, 1000].includes(a.status)) {
      return { ok: false, status: "failed", error: AUTOMAS_CODES[a.status], providerResponse: a.text };
    }
    // 2) Plain endpoint, where Unicode is documented as type=8 / smsformat=8.
    const q = new URLSearchParams({ apikey: c.apiKey, sender: c.senderId, msisdn: local, smstext: message });
    if (unicode) { q.set("type", "8"); q.set("smsformat", "8"); }
    const b = await call(`${V3}?${q}`);
    if (b.status === 0) return { ok: true, status: "sent", providerResponse: b.text };
    const code = b.status ?? a.status;
    return {
      ok: false, status: "failed",
      error: code != null ? AUTOMAS_CODES[code] || `Automas ${code}` : "Automas উত্তর বোঝা যায়নি",
      providerResponse: `v4: ${a.text} | v3: ${b.text}`.slice(0, 500),
    };
  } catch (e: any) {
    return { ok: false, status: "failed", error: e?.message || "নেটওয়ার্ক সমস্যা" };
  }
}

/** Send (if this event is switched on) and log. Never throws. */
export async function sendSmsAsync(params: { phone: string; message: string; orderId?: string | null; event?: SmsEvent }): Promise<SmsResult> {
  const event = params.event ?? "manual";
  let result: SmsResult;
  try {
    const cfg = await getSmsConfig();
    const eventOn = event === "manual" || event === "test" || (cfg.events as any)[event] === true;
    if (!cfg.enabled && event !== "test") result = { ok: false, status: "skipped", providerResponse: "SMS বন্ধ (Admin → SMS)" };
    else if (!eventOn) result = { ok: false, status: "skipped", providerResponse: `${event} SMS বন্ধ` };
    else result = await sendSms(params.phone, params.message, cfg);
  } catch (e: any) {
    result = { ok: false, status: "failed", error: e?.message };
  }
  try {
    await getServerSupabase().from("sms_logs").insert({
      order_id: params.orderId ?? null,
      phone: normalizeBdPhone(params.phone),
      message: params.message,
      status: result.status,
      provider_response: [result.error, result.providerResponse].filter(Boolean).join(" · ").slice(0, 1000) || null,
    });
  } catch { /* logging is best-effort */ }
  return result;
}

/** Send in the background but keep the serverless function alive until it's done
 *  (Vercel's waitUntil); a bare un-awaited promise can be frozen mid-send. */
export function queueSms(params: Parameters<typeof sendSmsAsync>[0]): void {
  const p = sendSmsAsync(params).catch(() => null);
  try {
    const ctx = (globalThis as any)[Symbol.for("@vercel/request-context")]?.get?.();
    if (typeof ctx?.waitUntil === "function") ctx.waitUntil(p);
  } catch { /* best-effort */ }
}
