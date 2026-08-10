"use client";

import { useEffect, useRef } from "react";
import { trackBrowser } from "@/components/MetaPixel";
import { playSuccess } from "@/lib/sound";

export function PurchasePixel({
  eventId,
  value,
  contentIds,
}: {
  eventId: string | null;
  value: number;
  contentIds: string[];
}) {
  const fired = useRef(false);
  useEffect(() => {
    if (!eventId || fired.current) return;
    fired.current = true;

    // Celebratory success chime.
    try { playSuccess(); } catch {}

    // Browser Purchase — same event_id as the server Purchase (fired in the
    // checkout Server Action) → Meta deduplicates the two into one event.
    trackBrowser(
      "Purchase",
      {
        currency: "BDT",
        value,
        content_ids: contentIds,
        content_type: "product",
      },
      eventId
    );

    // Log the browser copy for the Tracking Health page.
    fetch("/api/track-log", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        eventName: "Purchase",
        eventId,
        payload: { value },
      }),
      keepalive: true,
    }).catch(() => {});
  }, [eventId, value, contentIds]);
  return null;
}
