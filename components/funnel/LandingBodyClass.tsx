"use client";

import { useEffect } from "react";

/**
 * Adds `dc-landing` to <body> so the global site header is hidden on the funnel,
 * plus the theme class so the page background and any portaled overlay (the
 * order-confirming screen) use that landing's palette.
 *
 * In-page colours do NOT depend on this: the themed wrapper <div> is rendered on
 * the server, so there is never a flash of the wrong palette.
 */
export function LandingBodyClass({ theme = "pillow" }: { theme?: "pillow" | "bee" }) {
  useEffect(() => {
    const classes = ["dc-landing", ...(theme === "bee" ? ["dc-theme-bee"] : [])];
    document.body.classList.add(...classes);
    return () => document.body.classList.remove(...classes);
  }, [theme]);
  return null;
}
