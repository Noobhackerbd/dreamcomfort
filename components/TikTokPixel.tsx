// components/TikTokPixel.tsx
// Browser TikTok Pixel loader + typed helpers to fire events WITH an event_id (for
// deduplication against the server Events API). Loaded lazily (on first interaction or a
// short timeout) so it stays off the initial-paint critical path — same strategy as the
// Meta Pixel, for speed.
"use client";

import { useEffect } from "react";

let TT_PIXEL_ID: string | undefined =
  process.env.NEXT_PUBLIC_TIKTOK_PIXEL_ID || "DA6Q9UBC77UES9741GT0";

declare global {
  interface Window {
    ttq?: any;
    TiktokAnalyticsObject?: string;
    __dcTTLoaded?: boolean;
  }
}

function normPhone(raw: string): string {
  let d = (raw || "").replace(/\D/g, "");
  if (d.startsWith("00")) d = d.slice(2);
  if (d.startsWith("0")) d = "88" + d;
  else if (d.startsWith("1")) d = "880" + d;
  else if (!d.startsWith("880")) d = "880" + d;
  return "+" + d;
}

/** Fire a TikTok Pixel event with an explicit event_id (must equal the server copy's). */
export function trackTikTok(eventName: string, params?: Record<string, unknown>, eventId?: string) {
  if (typeof window === "undefined") return;
  if (!window.ttq) loadTikTok();
  if (!window.ttq) return;
  try {
    window.ttq.track(eventName, params ?? {}, eventId ? { event_id: eventId } : undefined);
  } catch {
    /* ignore */
  }
}

/** Advanced matching — attach customer info so TikTok can match events to users. */
export function identifyTikTok(u: { email?: string; phone?: string; externalId?: string }) {
  if (typeof window === "undefined") return;
  if (!window.ttq) loadTikTok();
  if (!window.ttq) return;
  const id: Record<string, string> = {};
  if (u.email) id.email = u.email.trim().toLowerCase();
  if (u.phone) id.phone_number = normPhone(u.phone);
  if (u.externalId) id.external_id = u.externalId;
  try {
    if (Object.keys(id).length) window.ttq.identify(id);
  } catch {
    /* ignore */
  }
}

function loadTikTok() {
  if (typeof window === "undefined" || window.__dcTTLoaded || !TT_PIXEL_ID) return;
  window.__dcTTLoaded = true;
  /* eslint-disable */
  (function (w: any, d: any, t: any) {
    w.TiktokAnalyticsObject = t;
    var ttq = (w[t] = w[t] || []);
    ttq.methods = ["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie","holdConsent","revokeConsent","grantConsent"];
    ttq.setAndDefer = function (t: any, e: any) { t[e] = function () { t.push([e].concat(Array.prototype.slice.call(arguments, 0))); }; };
    for (var i = 0; i < ttq.methods.length; i++) ttq.setAndDefer(ttq, ttq.methods[i]);
    ttq.instance = function (t: any) { for (var e = ttq._i[t] || [], n = 0; n < ttq.methods.length; n++) ttq.setAndDefer(e, ttq.methods[n]); return e; };
    ttq.load = function (e: any, n: any) {
      var r = "https://analytics.tiktok.com/i18n/pixel/events.js", o = n && n.partner;
      ttq._i = ttq._i || {}; ttq._i[e] = []; ttq._i[e]._u = r; ttq._t = ttq._t || {}; ttq._t[e] = +new Date(); ttq._o = ttq._o || {}; ttq._o[e] = n || {};
      n = d.createElement("script"); n.type = "text/javascript"; n.async = !0; n.src = r + "?sdkid=" + e + "&lib=" + t;
      e = d.getElementsByTagName("script")[0]; e.parentNode.insertBefore(n, e);
    };
    ttq.load(TT_PIXEL_ID);
    ttq.page();
  })(window, document, "ttq");
  /* eslint-enable */
}

export function TikTokPixel({ pixelId }: { pixelId?: string }) {
  if (pixelId) TT_PIXEL_ID = pixelId;

  useEffect(() => {
    if (!TT_PIXEL_ID || window.__dcTTLoaded) return;
    const events = ["pointerdown", "touchstart", "scroll", "keydown", "mousemove"];
    const trigger = () => { cleanup(); loadTikTok(); };
    function cleanup() {
      events.forEach((ev) => window.removeEventListener(ev, trigger));
      clearTimeout(timer);
    }
    events.forEach((ev) => window.addEventListener(ev, trigger, { once: true, passive: true }));
    const timer = setTimeout(trigger, 3500);
    return cleanup;
  }, []);

  return null;
}
