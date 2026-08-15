"use client";

// components/admin/AutoRefresh.tsx — refresh the current server route on an interval
// (and when the tab regains focus) so lists update live without a manual reload.
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export function AutoRefresh({ seconds = 15 }: { seconds?: number }) {
  const router = useRouter();
  useEffect(() => {
    // Refresh immediately on mount so a stale (client-router-cached) render is
    // corrected the moment the page opens — no manual reload needed.
    router.refresh();
    const id = setInterval(() => {
      if (document.visibilityState === "visible") router.refresh();
    }, Math.max(5, seconds) * 1000);
    const onFocus = () => {
      if (document.visibilityState === "visible") router.refresh();
    };
    document.addEventListener("visibilitychange", onFocus);
    window.addEventListener("focus", onFocus);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onFocus);
      window.removeEventListener("focus", onFocus);
    };
  }, [router, seconds]);
  return null;
}
