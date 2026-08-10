"use client";

import { useEffect } from "react";

/** Adds `dc-landing` to <body> so the global site header is hidden on the funnel. */
export function LandingBodyClass() {
  useEffect(() => {
    document.body.classList.add("dc-landing");
    return () => document.body.classList.remove("dc-landing");
  }, []);
  return null;
}
