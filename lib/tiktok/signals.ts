// lib/tiktok/signals.ts — server-side TikTok match signals: ttclid, ttp cookie, IP, UA.
import { cookies } from "next/headers";
import { getClientIp, getClientUserAgent } from "@/lib/meta/fb-cookies";
import type { TikTokSignals } from "./events";

/** ttclid (from cookie or URL param), _ttp cookie, client IP + user-agent. */
export function getTikTokSignals(ttclidParam?: string | null): TikTokSignals {
  const c = cookies();
  const ttp = c.get("_ttp")?.value || undefined;
  const ttclid = c.get("ttclid")?.value || ttclidParam || undefined;
  return {
    ttp,
    ttclid: ttclid || undefined,
    ip: getClientIp(),
    userAgent: getClientUserAgent(),
  };
}
