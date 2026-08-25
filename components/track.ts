// components/track.ts — client-side dual-fire helper.
// One call = one shared event_id used for: the browser Pixel event, a browser-copy
// log row, and the server CAPI event (which logs its own server-copy row). Meta
// deduplicates the browser + server copies because the event_id is identical.

import { trackBrowser } from "@/components/MetaPixel";
import { trackTikTok } from "@/components/TikTokPixel";
import { newBrowserEventId } from "@/lib/meta/event-id";
import type { CustomData } from "@/lib/meta/capi";
import type { RawUserData } from "@/lib/meta/hash";

function currentFbclid(): string | undefined {
  if (typeof window === "undefined") return undefined;
  return new URLSearchParams(window.location.search).get("fbclid") ?? undefined;
}
function currentTtclid(): string | undefined {
  if (typeof window === "undefined") return undefined;
  return new URLSearchParams(window.location.search).get("ttclid") ?? undefined;
}

// Our internal event names → TikTok standard events (conversion-relevant only).
const TIKTOK_EVENT_MAP: Record<string, string> = {
  ViewContent: "ViewContent",
  AddToCart: "AddToCart",
  InitiateCheckout: "InitiateCheckout",
  Search: "Search",
};

/** Convert Meta customData → TikTok properties (contents[].content_id, value, currency). */
function toTikTokProps(cd?: CustomData) {
  const contents =
    (cd?.contents as { id: string; quantity: number; item_price?: number }[] | undefined)?.map((c) => ({
      content_id: c.id,
      content_type: "product",
      quantity: c.quantity,
      price: c.item_price,
    })) ?? (cd?.content_ids ?? []).map((id) => ({ content_id: id, content_type: "product" }));
  return { currency: cd?.currency, value: cd?.value, content_type: "product", contents };
}

/**
 * Fire an event to the browser Pixel AND the server Conversions API with a shared
 * event_id. Returns the event_id (useful for tests/logging).
 */
export function fireEvent(
  eventName: "ViewContent" | "AddToCart" | "InitiateCheckout" | "Lead" | "Search" | "Scroll",
  customData?: CustomData,
  user?: RawUserData
): string {
  const eventId = newBrowserEventId();
  const url = typeof window !== "undefined" ? window.location.href : "";
  // Stamp the event time ONCE on the client so the browser + server copies share it.
  const eventTime = Math.floor(Date.now() / 1000);

  // 1) Browser Pixel (with explicit eventID for dedup).
  trackBrowser(eventName, customData as Record<string, unknown> | undefined, eventId);

  // 2) Log the browser copy (fire-and-forget).
  fetch("/api/track-log", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ eventName, eventId, payload: { url } }),
    keepalive: true,
  }).catch(() => {});

  // 3) Server copy via CAPI (fire-and-forget; server logs its own row).
  fetch("/api/capi", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ eventName, eventId, eventTime, url, fbclid: currentFbclid(), user, customData }),
    keepalive: true,
  }).catch(() => {});

  // 4) TikTok — browser Pixel + server Events API with the SAME event_id (deduped).
  const ttName = TIKTOK_EVENT_MAP[eventName];
  if (ttName) {
    const props = toTikTokProps(customData);
    trackTikTok(ttName, props as Record<string, unknown>, eventId);
    fetch("/api/tiktok", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ eventName: ttName, eventId, eventTime, url, ttclid: currentTtclid(), user, properties: props }),
      keepalive: true,
    }).catch(() => {});
  }

  return eventId;
}
