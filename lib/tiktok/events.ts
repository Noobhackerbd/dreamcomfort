// lib/tiktok/events.ts
// Server-side TikTok Events API (EAPI v1.3) sender — the TikTok equivalent of the Meta
// Conversions API. Pass the SAME event_id you send to the browser TikTok Pixel so TikTok
// deduplicates the browser + server copies into one event.

import crypto from "crypto";
import { hashField, hashPhone, RawUserData } from "@/lib/meta/hash";
import { getTikTokSettings } from "@/lib/settings";

const EAPI_URL = "https://business-api.tiktok.com/open_api/v1.3/event/track/";

/** True when both the pixel id and the Events API access token are set (admin or env). */
export async function tiktokEapiConfigured(): Promise<boolean> {
  const s = await getTikTokSettings();
  return !!s.pixelId && !!s.accessToken;
}

export type TikTokEventName =
  | "ViewContent"
  | "AddToCart"
  | "InitiateCheckout"
  | "PlaceAnOrder"
  | "CompletePayment"
  | "Search";

export interface TikTokContent {
  content_id?: string;
  content_type?: string;
  content_name?: string;
  quantity?: number;
  price?: number;
}
export interface TikTokProps {
  currency?: string;
  value?: number;
  contents?: TikTokContent[];
  content_type?: string;
  query?: string;
}
export interface TikTokSignals {
  ttclid?: string;
  ttp?: string;
  ip?: string;
  userAgent?: string;
}

function sha256Lower(s: string): string {
  return crypto.createHash("sha256").update(s.trim().toLowerCase(), "utf8").digest("hex");
}

export interface SendTikTokInput {
  eventName: TikTokEventName;
  eventId: string; // MUST match the browser Pixel's event_id
  url: string;
  eventTime?: number; // unix seconds
  user?: RawUserData; // raw PII (hashed here)
  signals?: TikTokSignals; // ttclid/ttp/ip/ua (not hashed)
  properties?: TikTokProps;
}

/** Send one event to the TikTok Events API. Best-effort; never throws. */
export async function sendTikTokEvent(input: SendTikTokInput): Promise<{ ok: boolean; error?: string }> {
  const { pixelId: pixel, accessToken: token, testEventCode } = await getTikTokSettings();
  if (!pixel || !token) return { ok: false, error: "TikTok Events API কনফিগার করা হয়নি (অ্যাডমিন সেটিংসে টোকেন দিন)।" };

  const u = input.user ?? {};
  const user: Record<string, unknown> = {
    email: hashField(u.email),
    phone: hashPhone(u.phone), // E.164 digits (8801…) sha256
    external_id: u.externalId ? sha256Lower(String(u.externalId)) : undefined,
    ttclid: input.signals?.ttclid,
    ttp: input.signals?.ttp,
    ip: input.signals?.ip,
    user_agent: input.signals?.userAgent,
  };
  Object.keys(user).forEach((k) => user[k] === undefined && delete user[k]);

  const body = {
    event_source: "web",
    event_source_id: pixel,
    // When set, events appear in TikTok Events Manager → Test Events (for verifying the
    // server integration). Leave empty when live.
    ...(testEventCode ? { test_event_code: testEventCode } : {}),
    data: [
      {
        event: input.eventName,
        event_time: input.eventTime ?? Math.floor(Date.now() / 1000),
        event_id: input.eventId,
        user,
        page: { url: input.url },
        ...(input.properties ? { properties: input.properties } : {}),
      },
    ],
  };

  try {
    const res = await fetch(EAPI_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Access-Token": token },
      body: JSON.stringify(body),
      cache: "no-store",
    });
    const json: any = await res.json().catch(() => ({}));
    if (json?.code !== 0) return { ok: false, error: json?.message ?? `HTTP ${res.status}` };
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e?.message ?? "network error" };
  }
}

/** Convert Meta-style customData (content_ids / contents) into TikTok properties. */
export function toTikTokProps(customData?: {
  currency?: string;
  value?: number;
  content_ids?: string[];
  contents?: { id: string; quantity: number; item_price?: number }[];
}): TikTokProps {
  const contents =
    customData?.contents?.map((c) => ({
      content_id: c.id,
      content_type: "product",
      quantity: c.quantity,
      price: c.item_price,
    })) ??
    (customData?.content_ids ?? []).map((id) => ({ content_id: id, content_type: "product" }));
  return {
    currency: customData?.currency,
    value: customData?.value,
    content_type: "product",
    contents,
  };
}
