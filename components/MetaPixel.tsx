// components/MetaPixel.tsx
// Browser Pixel loader + a typed helper to fire browser events WITH an eventID.
//
// Loading strategy (good for BOTH performance and pixel health):
//   The Pixel script is NOT loaded during the initial paint (keeps it off the
//   LCP critical path). Instead it loads on the FIRST user interaction
//   (pointer / touch / scroll / key) OR after a short fallback timeout —
//   whichever comes first. This fires PageView reliably and early even on slow
//   mobile connections, instead of waiting for the full page `load` event
//   (which on a slow network can be 10s+, causing missed/late PageViews).

"use client";

import { useEffect } from "react";

// Pixel id is provided at runtime by the server (from admin settings) via the
// <MetaPixel pixelId=... /> prop, and cached module-side so trackBrowser() works too.
let PIXEL_ID: string | undefined = process.env.NEXT_PUBLIC_META_PIXEL_ID || undefined;

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
    _fbq?: unknown;
    __dcPixelLoaded?: boolean;
  }
}

/**
 * Fire a browser Pixel event with an explicit eventID for deduplication.
 * The eventID MUST equal the event_id sent to the server CAPI for the same action.
 * If the Pixel hasn't loaded yet (user hasn't interacted), we load it on demand
 * so the event is not lost.
 */
// Meta's standard events use fbq('track', …); anything else is a custom event
// and must use fbq('trackCustom', …).
const STANDARD_EVENTS = new Set([
  "PageView", "ViewContent", "AddToCart", "InitiateCheckout", "Purchase", "Lead",
  "Search", "CompleteRegistration", "Contact", "Subscribe", "AddToWishlist",
  "AddPaymentInfo", "StartTrial", "SubmitApplication", "Schedule", "Donate",
]);

export function trackBrowser(
  eventName: string,
  params?: Record<string, unknown>,
  eventId?: string
) {
  if (typeof window === "undefined") return;
  if (!window.fbq) loadPixel(); // ensure the pixel exists before we queue an event
  if (!window.fbq) return;
  const method = STANDARD_EVENTS.has(eventName) ? "track" : "trackCustom";
  window.fbq(method, eventName, params ?? {}, eventId ? { eventID: eventId } : undefined);
}

function getCookie(name: string): string | undefined {
  if (typeof document === "undefined") return undefined;
  const m = document.cookie.match(new RegExp("(?:^|; )" + name + "=([^;]*)"));
  return m ? decodeURIComponent(m[1]) : undefined;
}
function setCookie(name: string, value: string, days: number) {
  if (typeof document === "undefined") return;
  const exp = new Date(Date.now() + days * 864e5).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${exp}; path=/; SameSite=Lax`;
}

/**
 * Ensure our matching cookies exist BEFORE any event fires (even early server
 * events): a stable external id (dc_xid, ~2 years) and an _fbp if the Pixel
 * hasn't set one yet. Both dramatically raise Event Match Quality.
 */
export function ensureMatchCookies(): string | undefined {
  let xid = getCookie("dc_xid");
  if (!xid) {
    xid = (crypto as any)?.randomUUID ? crypto.randomUUID() : "xid-" + Date.now().toString(36) + Math.random().toString(36).slice(2);
    setCookie("dc_xid", xid, 730);
  }
  if (!getCookie("_fbp")) {
    const fbp = `fb.1.${Date.now()}.${Math.floor(1e9 + Math.random() * 9e9)}`;
    setCookie("_fbp", fbp, 90);
  }
  // Persist _fbc ONCE from an ad click (fbclid), so click attribution is stable
  // across every browser + server event for this session.
  if (typeof location !== "undefined" && !getCookie("_fbc")) {
    const fbclid = new URLSearchParams(location.search).get("fbclid");
    if (fbclid) setCookie("_fbc", `fb.1.${Date.now()}.${fbclid}`, 90);
  }
  return xid;
}

// ---- Manual Advanced Matching -------------------------------------------
// Customer info passed to the browser Pixel (the pixel normalizes + hashes it
// client-side). We accumulate it and re-init the pixel so later browser events
// (InitiateCheckout, Purchase) carry ph/fn/ln/ct/external_id.
let advancedMatching: Record<string, string> = {};

function normBdPhone(raw?: string): string | undefined {
  if (!raw) return undefined;
  let d = raw.replace(/\D/g, "");
  if (d.startsWith("00")) d = d.slice(2);
  if (d.startsWith("0")) d = "88" + d;
  else if (d.startsWith("1")) d = "880" + d;
  else if (!d.startsWith("880")) d = "880" + d;
  return d.length >= 12 ? d : undefined;
}

export interface AdvancedMatchInput {
  email?: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
  city?: string;
  state?: string;
  zip?: string;
}

/** Set/merge manual advanced matching, then (re)initialize the Pixel with it. */
export function setAdvancedMatching(u: AdvancedMatchInput) {
  if (typeof window === "undefined" || !PIXEL_ID) return;
  const add: Record<string, string> = {};
  if (u.email) add.em = u.email.trim().toLowerCase();
  const ph = normBdPhone(u.phone);
  if (ph) add.ph = ph;
  if (u.firstName) add.fn = u.firstName.trim().toLowerCase();
  if (u.lastName) add.ln = u.lastName.trim().toLowerCase();
  if (u.city) add.ct = u.city.trim().toLowerCase().replace(/\s+/g, "");
  if (u.state) add.st = u.state.trim().toLowerCase().replace(/\s+/g, "");
  if (u.zip) add.zp = u.zip.trim();

  const xid = ensureMatchCookies();
  advancedMatching = { ...advancedMatching, ...add, ...(xid ? { external_id: xid } : {}) };

  if (window.__dcPixelLoaded && window.fbq) {
    window.fbq("init", PIXEL_ID, advancedMatching); // update matching in place
  } else {
    loadPixel(); // first load will init with advancedMatching merged
  }
}

/** Current advanced matching (external id + any set customer fields). */
function currentMatching(xid?: string): Record<string, string> {
  return { ...(xid ? { external_id: xid } : {}), ...advancedMatching };
}

function loadPixel() {
  if (typeof window === "undefined" || window.__dcPixelLoaded || !PIXEL_ID) return;
  window.__dcPixelLoaded = true;
  const xid = ensureMatchCookies();

  /* eslint-disable */
  (function (f: any, b: any, e: any, v: any, n?: any, t?: any, s?: any) {
    if (f.fbq) return;
    n = f.fbq = function () {
      // @ts-ignore
      n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
    };
    if (!f._fbq) f._fbq = n;
    n.push = n;
    n.loaded = !0;
    n.version = "2.0";
    n.queue = [];
    t = b.createElement(e);
    t.async = !0;
    t.src = v;
    s = b.getElementsByTagName(e)[0];
    s.parentNode.insertBefore(t, s);
  })(window, document, "script", "https://connect.facebook.net/en_US/fbevents.js");
  /* eslint-enable */

  // Advanced matching: send the stable external id (+ any customer info set via
  // setAdvancedMatching) with every browser event.
  const am = currentMatching(xid);
  window.fbq!("init", PIXEL_ID, Object.keys(am).length ? am : undefined);
  firePageView();
}

/**
 * PageView deduplicated across browser + server. The browser Pixel event carries an
 * eventID and the SAME id is sent to the server Conversions API — this is what raises
 * "event coverage" (previously PageView had no eventID and no CAPI copy, so coverage
 * sat near ~46%). Fire-and-forget so it never slows the page.
 */
function firePageView() {
  if (typeof window === "undefined" || !window.fbq) return;
  const eventId =
    (crypto as any)?.randomUUID
      ? crypto.randomUUID()
      : "pv-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2);
  const url = window.location.href;
  const eventTime = Math.floor(Date.now() / 1000);
  const fbclid = new URLSearchParams(window.location.search).get("fbclid") ?? undefined;

  // 1) Browser Pixel PageView WITH an explicit eventID (the dedup key).
  window.fbq!("track", "PageView", {}, { eventID: eventId });

  // 2) Browser-copy log (fire-and-forget).
  fetch("/api/track-log", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ eventName: "PageView", eventId, payload: { url } }),
    keepalive: true,
  }).catch(() => {});

  // 3) Server PageView via CAPI with the SAME event_id → deduplicated + covered.
  fetch("/api/capi", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ eventName: "PageView", eventId, eventTime, url, fbclid }),
    keepalive: true,
  }).catch(() => {});
}

export function MetaPixel({ pixelId }: { pixelId?: string }) {
  if (pixelId) PIXEL_ID = pixelId; // make it available to loadPixel/trackBrowser

  useEffect(() => {
    if (!PIXEL_ID || window.__dcPixelLoaded) return;

    // Set matching cookies immediately (before the deferred pixel loads) so even
    // early server-side events (ViewContent etc.) carry external_id + _fbp.
    ensureMatchCookies();

    // Interaction signals — real visitors almost always fire one of these fast.
    const events: string[] = ["pointerdown", "touchstart", "scroll", "keydown", "mousemove"];
    // Leave signals — catch quick bouncers who never interact, so their PageView still counts.
    const leaveEvents: string[] = ["visibilitychange", "pagehide"];

    const trigger = () => {
      // For visibilitychange, only load when the tab is actually being hidden.
      cleanup();
      loadPixel();
    };
    const onLeave = () => {
      if (document.visibilityState === "hidden") { cleanup(); loadPixel(); }
    };
    function cleanup() {
      events.forEach((ev) => window.removeEventListener(ev, trigger));
      leaveEvents.forEach((ev) => document.removeEventListener(ev, onLeave));
      clearTimeout(timer);
    }
    events.forEach((ev) => window.addEventListener(ev, trigger, { once: true, passive: true }));
    leaveEvents.forEach((ev) => document.addEventListener(ev, onLeave));
    // Long safety fallback (kept well past the initial-load window so it never
    // weighs on TBT/LCP): fire PageView even for a totally idle open tab.
    const timer = setTimeout(trigger, 8000);

    return cleanup;
  }, []);

  if (!PIXEL_ID) return null;
  return (
    <noscript>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        height="1"
        width="1"
        style={{ display: "none" }}
        alt=""
        src={`https://www.facebook.com/tr?id=${PIXEL_ID}&ev=PageView&noscript=1`}
      />
    </noscript>
  );
}
