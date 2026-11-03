// lib/whatsapp.ts — WhatsApp Cloud API for the AI Chat Bot (same Facebook app as Messenger).
//
// Sending: POST /{phone-number-id}/messages with the WhatsApp access token.
// Receiving: Facebook calls /api/whatsapp (signed with the same App Secret as Messenger).
// Customer photos arrive as a media id: we download them with the token, keep a copy in
// Storage for the inbox, and hand the data to the AI.
import "server-only";
import { getServerSupabase } from "@/lib/supabase/server";
import { fbApp, type ChatbotSettings, type ProductCard } from "@/lib/chatbot";
import type { SendResult } from "@/lib/chat-engine";

const GRAPH = "https://graph.facebook.com/v23.0";
const auth = (s: ChatbotSettings) => ({ authorization: `Bearer ${s.waToken}` });

async function call(s: ChatbotSettings, path: string, init?: { method?: string; body?: unknown; query?: Record<string, string>; timeout?: number }) {
  const url = new URL(GRAPH + path);
  for (const [k, v] of Object.entries(init?.query ?? {})) url.searchParams.set(k, v);
  const r = await fetch(url, {
    method: init?.method ?? "GET",
    headers: { ...auth(s), ...(init?.body ? { "content-type": "application/json" } : {}) },
    body: init?.body ? JSON.stringify(init.body) : undefined,
    cache: "no-store",
    signal: AbortSignal.timeout(init?.timeout ?? 15_000),
  });
  const j: any = await r.json().catch(() => ({}));
  return { ok: r.ok && !j?.error, status: r.status, j };
}

async function send(s: ChatbotSettings, to: string, message: Record<string, unknown>): Promise<SendResult> {
  if (!s.waToken || !s.waPhoneNumberId) return { ok: false, error: "WhatsApp is not connected (AI Chat Bot → Connect)." };
  try {
    const { ok, status, j } = await call(s, `/${encodeURIComponent(s.waPhoneNumberId)}/messages`, {
      method: "POST",
      body: { messaging_product: "whatsapp", recipient_type: "individual", to, ...message },
    });
    if (!ok) {
      const msg = j?.error?.message || `WhatsApp error ${status}`;
      const code = Number(j?.error?.code || 0);
      // 131047: more than 24 hours since the customer's last message
      const hint = code === 131047 || /24 hours|re-engagement/i.test(msg)
        ? " — the customer's last message is more than 24 hours old. WhatsApp only allows approved templates after that."
        : "";
      return { ok: false, error: msg + hint, code };
    }
    return { ok: true, mid: j?.messages?.[0]?.id };
  } catch (e: any) {
    return { ok: false, error: e?.message || "Could not reach WhatsApp." };
  }
}

export const waSendText = (s: ChatbotSettings, to: string, text: string) =>
  send(s, to, { type: "text", text: { body: text.slice(0, 4096), preview_url: true } });

export const waSendImage = (s: ChatbotSettings, to: string, url: string, caption?: string) =>
  send(s, to, { type: "image", image: { link: url, ...(caption ? { caption: caption.slice(0, 1024) } : {}) } });

/** Photos one after another — WhatsApp groups several in a row into an album. */
export async function waSendImages(s: ChatbotSettings, to: string, urls: string[], captions: string[] = []): Promise<SendResult> {
  let first: SendResult | null = null;
  let lastErr = "";
  for (const [i, u] of urls.slice(0, 30).entries()) {
    const r = await waSendImage(s, to, u, captions[i]);
    if (r.ok && !first) first = r;
    if (!r.ok) lastErr = r.error || "";
  }
  return first ?? { ok: false, error: lastErr || "No pictures." };
}

/** Product photos with name, price and link written under each. */
export function waSendCards(s: ChatbotSettings, to: string, cards: ProductCard[]) {
  return waSendImages(s, to, cards.map((c) => c.image), cards.map((c) =>
    [c.name, c.price ? `💰 দাম: ${c.price}` : "", c.details ? `✨ ${c.details.slice(0, 200)}` : "", c.url ? `🛒 অর্ডার: ${c.url}` : ""]
      .filter(Boolean).join("\n")));
}

/** Blue ticks + "typing…" while the AI answers. Cosmetic. */
export async function waTyping(s: ChatbotSettings, messageId: string | null) {
  if (!messageId || !s.waToken || !s.waPhoneNumberId) return;
  try {
    await call(s, `/${encodeURIComponent(s.waPhoneNumberId)}/messages`, {
      method: "POST",
      body: { messaging_product: "whatsapp", status: "read", message_id: messageId, typing_indicator: { type: "text" } },
      timeout: 5_000,
    });
  } catch { /* cosmetic */ }
}

const PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"];

/** A customer's photo by its media id: the data for the AI + a copy in Storage for the inbox. */
export async function waFetchPhoto(s: ChatbotSettings, mediaId: string): Promise<{ mediaType: string; data: string; url: string | null } | null> {
  try {
    const meta = await call(s, `/${encodeURIComponent(mediaId)}`);
    const link: string | undefined = meta.j?.url;
    if (!meta.ok || !link) return null;
    const host = new URL(link).hostname;
    if (!/(^|\.)(fbsbx\.com|fbcdn\.net|whatsapp\.net)$/.test(host)) return null;
    const r = await fetch(link, { headers: auth(s), cache: "no-store", signal: AbortSignal.timeout(15_000) });
    const type = (r.headers.get("content-type") || meta.j?.mime_type || "").split(";")[0].trim().toLowerCase();
    if (!r.ok || !PHOTO_TYPES.includes(type)) return null;
    const buf = Buffer.from(await r.arrayBuffer());
    if (!buf.length || buf.length > 5 * 1024 * 1024) return null;
    let url: string | null = null;
    try {
      const db = getServerSupabase();
      const path = `chat/wa-${Date.now()}-${Math.floor(Math.random() * 1e6)}.${type.split("/")[1] || "jpg"}`;
      const up = await db.storage.from("product-images").upload(path, buf, { contentType: type, cacheControl: "604800" });
      if (!up.error) url = db.storage.from("product-images").getPublicUrl(path).data.publicUrl;
    } catch { /* inbox copy is optional */ }
    return { mediaType: type, data: buf.toString("base64"), url };
  } catch {
    return null;
  }
}

/** Is the number reachable with this token? Used by Connect. */
export async function waCheck(s: ChatbotSettings): Promise<{ ok: boolean; display?: string; name?: string; error?: string }> {
  if (!s.waToken || !s.waPhoneNumberId) return { ok: false, error: "Add the Phone number ID and access token first." };
  try {
    const { ok, j, status } = await call(s, `/${encodeURIComponent(s.waPhoneNumberId)}`, { query: { fields: "display_phone_number,verified_name" } });
    if (!ok) return { ok: false, error: j?.error?.message || `WhatsApp error ${status}` };
    return { ok: true, display: j?.display_phone_number, name: j?.verified_name };
  } catch (e: any) {
    return { ok: false, error: e?.message || "Could not reach WhatsApp." };
  }
}

/**
 * Wire it up: the WhatsApp Business Account sends its messages to our app, and the app
 * sends them to /api/whatsapp. Returns warnings for any step Facebook refused.
 */
export async function waConnect(s: ChatbotSettings, origin: string): Promise<string[]> {
  const warnings: string[] = [];
  if (s.waBusinessId) {
    const sub = await call(s, `/${encodeURIComponent(s.waBusinessId)}/subscribed_apps`, { method: "POST" }).catch(() => null);
    if (!sub?.ok) warnings.push(`Could not subscribe the WhatsApp Business Account to the app: ${sub?.j?.error?.message || "unknown error"}.`);
  } else {
    warnings.push("Add the WhatsApp Business Account ID so the account can be subscribed to the app.");
  }
  const app = fbApp(s);
  const callback = `${origin}/api/whatsapp`;
  if (!/^https:\/\//.test(origin) || /localhost|127\.0\.0\.1/.test(origin)) {
    warnings.push(`You are on a local address, so the webhook was not registered. Connect again from https://www.dreamcomfortbd.com/admin/chatbot.`);
  } else if (!app.appSecret) {
    warnings.push("The Facebook App secret is missing, so the webhook could not be registered.");
  } else {
    try {
      const u = new URL(`${GRAPH}/${encodeURIComponent(app.appId)}/subscriptions`);
      for (const [k, v] of Object.entries({
        object: "whatsapp_business_account", callback_url: callback, fields: "messages,smb_message_echoes",
        verify_token: s.verifyToken, access_token: `${app.appId}|${app.appSecret}`,
      })) u.searchParams.set(k, v);
      const r = await fetch(u, { method: "POST", cache: "no-store", signal: AbortSignal.timeout(15_000) });
      const j: any = await r.json().catch(() => ({}));
      if (!r.ok || j?.error) warnings.push(`Could not register the WhatsApp webhook: ${j?.error?.message || r.status}. Add it by hand: WhatsApp → Configuration → callback URL ${callback} + the verify token, and subscribe to "messages".`);
    } catch (e: any) {
      warnings.push(`Could not register the WhatsApp webhook: ${e?.message}.`);
    }
  }
  return warnings;
}
