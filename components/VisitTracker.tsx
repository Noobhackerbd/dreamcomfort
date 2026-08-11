"use client";

import { useEffect } from "react";

/** Records one visitor row per browser session (storefront pages only). */
export function VisitTracker() {
  useEffect(() => {
    try {
      const path = location.pathname;
      if (path.startsWith("/admin")) return;
      if (sessionStorage.getItem("dc_visit_sent")) return;
      sessionStorage.setItem("dc_visit_sent", "1");
      const m = document.cookie.match(/(?:^|; )dc_xid=([^;]*)/);
      const visitorId = m ? decodeURIComponent(m[1]) : "";
      fetch("/api/visit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ visitorId, path }),
        keepalive: true,
      }).catch(() => {});
    } catch {
      /* ignore */
    }
  }, []);
  return null;
}
