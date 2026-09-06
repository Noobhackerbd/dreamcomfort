"use client";

// Captures the traffic source from the landing URL and stores it in a first-party
// `dc_src` cookie (last-touch, 30 days). placeOrder reads this cookie to stamp each
// order's source, so the admin can see which orders came from TikTok / Facebook / etc.

import { useEffect } from "react";

function setCookie(name: string, value: string, days: number) {
  try {
    const exp = new Date(Date.now() + days * 864e5).toUTCString();
    document.cookie = `${name}=${encodeURIComponent(value)}; expires=${exp}; path=/; SameSite=Lax`;
  } catch {}
}

function detect(): string | null {
  try {
    const p = new URLSearchParams(window.location.search);
    if (p.get("ttclid")) return "tiktok";
    if (p.get("fbclid")) return "facebook";
    if (p.get("gclid")) return "google";
    const utm = (p.get("utm_source") || "").toLowerCase().trim();
    if (utm) {
      if (/tiktok|tt/.test(utm)) return "tiktok";
      if (/facebook|fb|meta|instagram|^ig$/.test(utm)) return "facebook";
      if (/google|gads|adwords/.test(utm)) return "google";
      return utm.replace(/[^a-z0-9_-]/g, "").slice(0, 20) || "other";
    }
    // Referrer fallback (only when there's no explicit tag).
    const ref = (document.referrer || "").toLowerCase();
    if (ref) {
      if (/tiktok/.test(ref)) return "tiktok";
      if (/facebook|instagram|fb\.com|\.fb\b/.test(ref)) return "facebook";
      if (/google\./.test(ref)) return "google";
    }
    return null;
  } catch {
    return null;
  }
}

export function SourceTracker() {
  useEffect(() => {
    const src = detect();
    if (src) setCookie("dc_src", src, 30); // last-touch wins
  }, []);
  return null;
}
