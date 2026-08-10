// lib/meta/event-id.ts
// One shared event_id per event = the whole trick behind deduplication.
// Generate it once, send it to BOTH the browser Pixel (as eventID) and the
// server CAPI call (as event_id). For Purchase, store it on the order row.

import { randomUUID } from "crypto";

/** Server-side event_id generator. */
export function newEventId(): string {
  return randomUUID();
}

/** Browser-side event_id generator (client components). */
export function newBrowserEventId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  // fallback
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
