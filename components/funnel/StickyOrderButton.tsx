"use client";

import { useEffect, useState } from "react";
import { playConfirm } from "@/lib/sound";

/**
 * Mobile sticky order button. It actually SUBMITS the order form (not just scroll):
 * clicking it runs the same validation + placeOrder as the form's own button.
 * It also hides itself while the form is on screen, so the form's own order
 * button is never covered. Shows a fixed label (no price).
 */
export function StickyOrderButton() {
  const [submitVisible, setSubmitVisible] = useState(false);

  useEffect(() => {
    const btn = document.getElementById("order-submit");
    if (!btn) return;
    const io = new IntersectionObserver(
      ([entry]) => setSubmitVisible(entry.isIntersecting),
      { threshold: 0.6 }
    );
    io.observe(btn);
    return () => io.disconnect();
  }, []);

  // Only show the sticky bar when the form's own order button is NOT on screen.
  if (submitVisible) return null;

  function fieldsReady(): boolean {
    const val = (id: string) =>
      (document.getElementById(id) as HTMLInputElement | HTMLTextAreaElement | null)?.value ?? "";
    const name = val("dc-name").trim();
    const phone = val("dc-phone").replace(/\D/g, "");
    const address = val("dc-address").trim();
    return !!name && /^01\d{9}$/.test(phone) && address.length >= 5;
  }

  function onClick() {
    const form = document.getElementById("order-form") as HTMLFormElement | null;
    if (!form) return;

    if (fieldsReady()) {
      // Everything filled → place the order.
      playConfirm();
      form.requestSubmit();
      return;
    }

    // Not filled yet → bring the WHOLE form (including its order button) into view.
    form.scrollIntoView({ behavior: "smooth", block: "center" });
    const nameEl = document.getElementById("dc-name");
    // focus without overriding the scroll we just did
    setTimeout(() => (nameEl as HTMLElement | null)?.focus({ preventScroll: true }), 350);
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className="dc-btn lg:hidden fixed bottom-4 inset-x-3 z-50 flex items-center justify-center gap-2 rounded-2xl px-5 py-4 text-base font-bold"
    >
      <span className="text-xl">🛒</span>
      এখনই অর্ডার করুন
    </button>
  );
}
