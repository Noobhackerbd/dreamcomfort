"use client";

import { useEffect } from "react";

/**
 * Drives the sticky header's "scrolled" state without ever re-rendering React.
 * A passive scroll listener throttled through requestAnimationFrame just flips
 * a data attribute on the header element; all the visual change is pure CSS.
 * This keeps scrolling on the main thread cheap (no React work per frame).
 */
export function HeaderScroll() {
  useEffect(() => {
    const el = document.querySelector<HTMLElement>(".site-header");
    if (!el) return;
    let ticking = false;
    const update = () => {
      el.dataset.scrolled = window.scrollY > 6 ? "true" : "false";
      ticking = false;
    };
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(update);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    update();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return null;
}
