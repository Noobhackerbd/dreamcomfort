// lib/meta/fb-cookies.ts
// Helpers for _fbp / _fbc and client IP + user-agent.
// These values (NOT hashed) dramatically raise Event Match Quality.

import { cookies, headers } from "next/headers";

/** Read _fbp cookie (Facebook browser id). */
export function getFbp(): string | undefined {
  return cookies().get("_fbp")?.value;
}

/**
 * Read _fbc cookie, or reconstruct it from an fbclid query param.
 * Meta fbc format: fb.1.<unix_ms>.<fbclid>
 */
export function getFbc(fbclid?: string | null): string | undefined {
  const cookie = cookies().get("_fbc")?.value;
  if (cookie) return cookie;
  if (fbclid) return `fb.1.${Date.now()}.${fbclid}`;
  return undefined;
}

/** Best-effort client IP from proxy headers (Vercel sets x-forwarded-for). */
export function getClientIp(): string | undefined {
  const h = headers();
  const fwd = h.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return h.get("x-real-ip") ?? undefined;
}

/** Client user-agent from request headers. */
export function getClientUserAgent(): string | undefined {
  return headers().get("user-agent") ?? undefined;
}

/** Stable first-party external id (set client-side as dc_xid), used to match events. */
export function getExternalId(): string | undefined {
  return cookies().get("dc_xid")?.value || undefined;
}

/** Convenience: grab all four server-side matching signals at once. */
export function getServerMatchSignals(fbclid?: string | null) {
  return {
    fbp: getFbp(),
    fbc: getFbc(fbclid),
    client_ip_address: getClientIp(),
    client_user_agent: getClientUserAgent(),
  };
}
