// lib/messenger.ts — talking to Facebook Messenger (Send API + webhook signature).
import "server-only";
import { createHmac, timingSafeEqual } from "crypto";

const GRAPH = "https://graph.facebook.com/v23.0";

/**
 * Facebook signs every webhook POST with your App Secret (X-Hub-Signature-256). Without
 * this check anyone who finds the URL could post fake "customer" messages and make the
 * bot spend your AI credit or write into your inbox.
 */
export function verifySignature(rawBody: string, header: string | null, appSecret: string): boolean {
  if (!appSecret || !header || !header.startsWith("sha256=")) return false;
  const expected = createHmac("sha256", appSecret).update(rawBody, "utf8").digest("hex");
  const got = header.slice(7);
  if (got.length !== expected.length) return false;
  try {
    return timingSafeEqual(Buffer.from(got, "hex"), Buffer.from(expected, "hex"));
  } catch {
    return false;
  }
}

export interface SendResult { ok: boolean; mid?: string; error?: string; code?: number }

/**
 * Send a text reply. Messenger allows free replies for 24 hours after the customer's last
 * message. After that a human reply needs the HUMAN_AGENT tag (7 days, and your app must
 * be approved for it) — `outside24h` switches to that.
 */
export async function sendText(token: string, psid: string, text: string, outside24h = false): Promise<SendResult> {
  if (!token) return { ok: false, error: "Page access token is not set (AI Chat Bot → Connect)." };
  const body: Record<string, unknown> = {
    recipient: { id: psid },
    message: { text: text.slice(0, 2000) }, // Messenger's limit
  };
  if (outside24h) {
    body.messaging_type = "MESSAGE_TAG";
    body.tag = "HUMAN_AGENT";
  } else {
    body.messaging_type = "RESPONSE";
  }
  try {
    const r = await fetch(`${GRAPH}/me/messages?access_token=${encodeURIComponent(token)}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(15_000),
    });
    const j: any = await r.json().catch(() => ({}));
    if (!r.ok) {
      const msg = j?.error?.message || `Facebook error ${r.status}`;
      const code = Number(j?.error?.code || 0);
      // 10 / 2018278: outside the messaging window without permission
      const hint = code === 10 || /outside of allowed window|24 hour/i.test(msg)
        ? " — the customer's last message is more than 24 hours old. Ask them to message the page again."
        : "";
      return { ok: false, error: msg + hint, code };
    }
    return { ok: true, mid: j?.message_id };
  } catch (e: any) {
    return { ok: false, error: e?.message || "Could not reach Facebook." };
  }
}

/** Show "typing…" while the AI thinks — the customer sees the shop is answering. */
export async function sendTyping(token: string, psid: string): Promise<void> {
  if (!token) return;
  try {
    await fetch(`${GRAPH}/me/messages?access_token=${encodeURIComponent(token)}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ recipient: { id: psid }, sender_action: "typing_on" }),
      signal: AbortSignal.timeout(5_000),
    });
  } catch { /* cosmetic */ }
}

/** Customer's name + photo for the inbox. Facebook may refuse; then we show "Customer". */
export async function getProfile(token: string, psid: string): Promise<{ name: string | null; avatar: string | null }> {
  if (!token) return { name: null, avatar: null };
  try {
    const r = await fetch(
      `${GRAPH}/${encodeURIComponent(psid)}?fields=first_name,last_name,profile_pic&access_token=${encodeURIComponent(token)}`,
      { signal: AbortSignal.timeout(5_000) }
    );
    if (!r.ok) return { name: null, avatar: null };
    const j: any = await r.json();
    const name = [j.first_name, j.last_name].filter(Boolean).join(" ").trim() || null;
    return { name, avatar: j.profile_pic || null };
  } catch {
    return { name: null, avatar: null };
  }
}

/** Is a check of the token itself OK? Used by the Connect tab's "Test connection". */
export async function checkPageToken(token: string): Promise<{ ok: boolean; pageName?: string; error?: string }> {
  if (!token) return { ok: false, error: "Connect your Page first (AI Chat Bot → Connect → Continue with Facebook)." };
  try {
    const r = await fetch(`${GRAPH}/me?fields=id,name&access_token=${encodeURIComponent(token)}`, {
      signal: AbortSignal.timeout(8_000),
    });
    const j: any = await r.json().catch(() => ({}));
    if (!r.ok) return { ok: false, error: j?.error?.message || `Facebook error ${r.status}` };
    return { ok: true, pageName: j?.name };
  } catch (e: any) {
    return { ok: false, error: e?.message || "Could not reach Facebook." };
  }
}

const PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const PHOTO_MAX_BYTES = 5 * 1024 * 1024;

/**
 * Download a photo the customer sent, for the AI to look at. Only Facebook's own media
 * hosts are fetched (the link comes from a signed webhook, but there is no reason to
 * fetch anything else).
 */
export async function fetchPhoto(url: string): Promise<{ mediaType: string; data: string } | null> {
  try {
    const u = new URL(url);
    if (u.protocol !== "https:" || !/(^|\.)(fbcdn\.net|fbsbx\.com|facebook\.com)$/.test(u.hostname)) return null;
    const r = await fetch(u, { signal: AbortSignal.timeout(10_000), cache: "no-store" });
    if (!r.ok) return null;
    const type = (r.headers.get("content-type") || "").split(";")[0].trim().toLowerCase();
    if (!PHOTO_TYPES.includes(type)) return null;
    const buf = Buffer.from(await r.arrayBuffer());
    if (!buf.length || buf.length > PHOTO_MAX_BYTES) return null;
    return { mediaType: type, data: buf.toString("base64") };
  } catch {
    return null;
  }
}

/**
 * Product photos as a swipeable carousel: photo, name, price under it, and an
 * "অর্ডার করুন" button to the product page. Max 10 cards (Messenger's limit).
 */
export async function sendProductCards(
  token: string,
  psid: string,
  cards: { name: string; price: string; details: string; image: string; url: string }[],
): Promise<SendResult> {
  if (!token) return { ok: false, error: "Page access token is not set." };
  if (!cards.length) return { ok: false, error: "No products to show." };
  const cut = (v: string, n: number) => (v.length > n ? v.slice(0, n - 1) + "…" : v);
  const elements = cards.slice(0, 10).map((c) => {
    const subtitle = [c.price ? `💰 দাম: ${c.price}` : "", c.details ? `✨ ${c.details}` : ""].filter(Boolean).join("\n");
    const el: Record<string, unknown> = {
      title: cut(c.name, 80),
      subtitle: cut(subtitle || "🛍️ ড্রিম কমফোর্ট", 80),
      image_url: c.image,
    };
    if (c.url) {
      el.default_action = { type: "web_url", url: c.url };
      el.buttons = [{ type: "web_url", url: c.url, title: "🛒 অর্ডার করুন" }];
    }
    return el;
  });
  try {
    const r = await fetch(`${GRAPH}/me/messages?access_token=${encodeURIComponent(token)}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        recipient: { id: psid },
        messaging_type: "RESPONSE",
        message: { attachment: { type: "template", payload: { template_type: "generic", image_aspect_ratio: "square", elements } } },
      }),
      signal: AbortSignal.timeout(15_000),
    });
    const j: any = await r.json().catch(() => ({}));
    if (!r.ok) return { ok: false, error: j?.error?.message || `Facebook error ${r.status}`, code: Number(j?.error?.code || 0) };
    return { ok: true, mid: j?.message_id };
  } catch (e: any) {
    return { ok: false, error: e?.message || "Could not reach Facebook." };
  }
}

/** What the inbox stores for a carousel we sent: a short list + the photos. */
export function cardsSummary(cards: { name: string; price: string }[]): string {
  return ["🛍️ পণ্যের ছবি ও দাম পাঠানো হয়েছে:", ...cards.map((c) => `• ${c.name}${c.price ? ` — ${c.price}` : ""}`)].join("\n");
}

/** One picture by link (e.g. the price picture with all products). */
export async function sendImage(token: string, psid: string, url: string): Promise<SendResult> {
  if (!token) return { ok: false, error: "Page access token is not set." };
  try {
    const r = await fetch(`${GRAPH}/me/messages?access_token=${encodeURIComponent(token)}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        recipient: { id: psid },
        messaging_type: "RESPONSE",
        message: { attachment: { type: "image", payload: { url, is_reusable: true } } },
      }),
      signal: AbortSignal.timeout(20_000),
    });
    const j: any = await r.json().catch(() => ({}));
    if (!r.ok) return { ok: false, error: j?.error?.message || `Facebook error ${r.status}`, code: Number(j?.error?.code || 0) };
    return { ok: true, mid: j?.message_id };
  } catch (e: any) {
    return { ok: false, error: e?.message || "Could not reach Facebook." };
  }
}

/**
 * Several pictures in ONE message (max 30). Messenger shows them as a grid; the customer
 * taps to see each one full size.
 */
export async function sendImages(token: string, psid: string, urls: string[]): Promise<SendResult> {
  const list = urls.filter(Boolean).slice(0, 30);
  if (list.length <= 1) return list.length ? sendImage(token, psid, list[0]) : { ok: false, error: "No pictures." };
  if (!token) return { ok: false, error: "Page access token is not set." };
  try {
    const r = await fetch(`${GRAPH}/me/messages?access_token=${encodeURIComponent(token)}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        recipient: { id: psid },
        messaging_type: "RESPONSE",
        message: { attachments: list.map((url) => ({ type: "image", payload: { url, is_reusable: true } })) },
      }),
      signal: AbortSignal.timeout(25_000),
    });
    const j: any = await r.json().catch(() => ({}));
    if (!r.ok) return { ok: false, error: j?.error?.message || `Facebook error ${r.status}`, code: Number(j?.error?.code || 0) };
    return { ok: true, mid: j?.message_id };
  } catch (e: any) {
    return { ok: false, error: e?.message || "Could not reach Facebook." };
  }
}
