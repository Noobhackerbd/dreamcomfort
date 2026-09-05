"use client";

import { useEffect, useRef } from "react";
import { trackBrowser, setAdvancedMatching } from "@/components/MetaPixel";
import { trackTikTok, identifyTikTok } from "@/components/TikTokPixel";
import { playSuccess } from "@/lib/sound";

export function PurchasePixel({
  eventId,
  value,
  contentIds,
  customer,
  suppress = false,
}: {
  eventId: string | null;
  value: number;
  contentIds: string[];
  customer?: { name?: string; phone?: string; city?: string; email?: string };
  suppress?: boolean;
}) {
  const fired = useRef(false);
  useEffect(() => {
    if (!eventId || fired.current) return;
    fired.current = true;

    // Ad-quality gate: a low courier-ratio customer's Purchase is suppressed on the
    // server too — play the success chime for the customer, but send no Pixel/CAPI.
    if (suppress) {
      try { playSuccess(); } catch {}
      return;
    }

    // Manual advanced matching — attach the real customer info to the browser
    // Purchase so its match quality is high.
    if (customer) {
      const parts = (customer.name || "").trim().split(/\s+/);
      setAdvancedMatching({
        phone: customer.phone,
        firstName: parts[0],
        lastName: parts.length > 1 ? parts.slice(1).join(" ") : undefined,
        city: customer.city,
        email: customer.email,
      });
    }

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

    // TikTok browser CompletePayment — same event_id as the server copy (deduped).
    if (customer) identifyTikTok({ phone: customer.phone, email: customer.email });
    trackTikTok(
      "CompletePayment",
      {
        currency: "BDT",
        value,
        content_type: "product",
        contents: contentIds.map((id) => ({ content_id: id, content_type: "product" })),
      },
      eventId
    );
  }, [eventId, value, contentIds]);
  return null;
}
