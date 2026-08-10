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

const PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID;

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
export function trackBrowser(
  eventName: string,
  params?: Record<string, unknown>,
  eventId?: string
) {
  if (typeof window === "undefined") return;
  if (!window.fbq) loadPixel(); // ensure the pixel exists before we queue an event
  if (!window.fbq) return;
  window.fbq("track", eventName, params ?? {}, eventId ? { eventID: eventId } : undefined);
}

function loadPixel() {
  if (typeof window === "undefined" || window.__dcPixelLoaded || !PIXEL_ID) return;
  window.__dcPixelLoaded = true;

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

  window.fbq!("init", PIXEL_ID);
  window.fbq!("track", "PageView");
}

export function MetaPixel() {
  useEffect(() => {
    if (!PIXEL_ID || window.__dcPixelLoaded) return;

    const events: (keyof WindowEventMap)[] = ["pointerdown", "touchstart", "scroll", "keydown", "mousemove"];
    const trigger = () => {
      cleanup();
      loadPixel();
    };
    function cleanup() {
      events.forEach((ev) => window.removeEventListener(ev, trigger));
      clearTimeout(timer);
    }
    events.forEach((ev) => window.addEventListener(ev, trigger, { once: true, passive: true }));
    // Fallback: if the visitor never interacts, still fire PageView shortly after paint.
    const timer = setTimeout(trigger, 2500);

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
