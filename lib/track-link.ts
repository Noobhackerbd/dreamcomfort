// lib/track-link.ts — short, unguessable public tracking links for SMS:
//   https://www.dreamcomfortbd.com/t/12701k3x9qa   (order DC-12701)
// The code is the order number's digits + 6 signed characters, so nobody can look up
// someone else's order by changing the number, and no phone number goes in the URL.
import "server-only";
import { createHmac, timingSafeEqual } from "crypto";

const SITE = (process.env.NEXT_PUBLIC_SITE_URL || "https://www.dreamcomfortbd.com").replace(/\/$/, "");
const SIG_LEN = 6;

function secret(): string {
  return process.env.TRACK_LINK_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || "dc-track";
}

function sign(digits: string): string {
  const h = createHmac("sha256", secret()).update("track:" + digits).digest();
  // base36, lowercase letters + digits — short and SMS-safe
  return BigInt("0x" + h.subarray(0, 8).toString("hex")).toString(36).padStart(SIG_LEN, "0").slice(0, SIG_LEN);
}

/** "DC-12701" → "12701k3x9qa" (null when the order number has no digits). */
export function trackCode(orderNumber: string): string | null {
  const digits = String(orderNumber || "").replace(/\D/g, "");
  return digits ? digits + sign(digits) : null;
}

export function trackUrl(orderNumber: string): string {
  const code = trackCode(orderNumber);
  return code ? `${SITE}/t/${code}` : `${SITE}/track-order`;
}

/** "12701k3x9qa" → "DC-12701", or null when the signature doesn't match. */
export function orderFromTrackCode(code: string): string | null {
  const c = String(code || "").toLowerCase().trim();
  const m = c.match(/^(\d+)([0-9a-z]{6})$/);
  if (!m) return null;
  const expected = sign(m[1]);
  if (expected.length !== m[2].length || !timingSafeEqual(Buffer.from(expected), Buffer.from(m[2]))) return null;
  return `DC-${m[1]}`;
}
