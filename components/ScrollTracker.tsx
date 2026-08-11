"use client";

import { useEffect } from "react";
import { fireEvent } from "@/components/track";

/**
 * Fires a "Scroll" engagement event (browser Pixel + server CAPI, shared
 * event_id) once per page load when the visitor scrolls to ~50% depth.
 * Storefront pages only. Useful for engagement custom audiences / retargeting.
 */
export function ScrollTracker() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (location.pathname.startsWith("/admin")) return;

    let fired = false;
    const onScroll = () => {
      if (fired) return;
      const viewport = window.innerHeight;
      const full = document.documentElement.scrollHeight;
      if (full <= viewport + 40) return; // page too short to scroll
      const reached = (window.scrollY + viewport) / full;
      if (reached >= 0.5) {
        fired = true;
        window.removeEventListener("scroll", onScroll);
        fireEvent("Scroll", { content_name: location.pathname, percent: 50 });
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return null;
}
