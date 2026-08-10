// components/track.ts — client-side dual-fire helper.
// One call = one shared event_id used for: the browser Pixel event, a browser-copy
// log row, and the server CAPI event (which logs its own server-copy row). Meta
// deduplicates the browser + server copies because the event_id is identical.

import { trackBrowser } from "@/components/MetaPixel";
import { newBrowserEventId } from "@/lib/meta/event-id";
import type { CustomData } from "@/lib/meta/capi";
import type { RawUserData } from "@/lib/meta/hash";

function currentFbclid(): string | undefined {
  if (typeof window === "undefined") return undefined;
  return new URLSearchParams(window.location.search).get("fbclid") ?? undefined;
}

/**
 * Fire an event to the browser Pixel AND the server Conversions API with a shared
 * event_id. Returns the event_id (useful for tests/logging).
 */
export function fireEvent(
  eventName: "ViewContent" | "AddToCart" | "InitiateCheckout" | "Lead" | "Search",
  customData?: CustomData,
  user?: RawUserData
): string {
  const eventId = newBrowserEventId();
  const url = typeof window !== "undefined" ? window.location.href : "";

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
    body: JSON.stringify({ eventName, eventId, url, fbclid: currentFbclid(), user, customData }),
    keepalive: true,
  }).catch(() => {});

  return eventId;
}
