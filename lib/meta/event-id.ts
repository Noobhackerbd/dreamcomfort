// lib/meta/event-id.ts
// One shared event_id per event = the whole trick behind deduplication.
// Generate it once, send it to BOTH the browser Pixel (as eventID) and the
// server CAPI call (as event_id). For Purchase, store it on the order row.
//
// NOTE: no `import ... from "crypto"` here on purpose. This file is imported by
// client code (components/track.ts); a Node "crypto" import makes webpack ship a
// ~430 kB crypto/buffer/stream polyfill to every page that tracks events. The Web
// Crypto API (globalThis.crypto.randomUUID) exists in browsers AND in the Node.js
// runtime Vercel uses, so both helpers produce the same kind of RFC-4122 v4 UUID.

function fallbackUuid(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function webUuid(): string {
  const c = (globalThis as { crypto?: { randomUUID?: () => string } }).crypto;
  return c && typeof c.randomUUID === "function" ? c.randomUUID() : fallbackUuid();
}

/** Server-side event_id generator. */
export function newEventId(): string {
  return webUuid();
}

/** Browser-side event_id generator (client components). */
export function newBrowserEventId(): string {
  return webUuid();
}
