"use client";

import { useEffect, useState } from "react";
import { playConfirm } from "@/lib/sound";

/**
 * Mobile sticky order button. It actually SUBMITS the order form (not just scroll):
 * clicking it runs the same validation + placeOrder as the form's own button.
 * It also hides itself while the form is on screen, so the form's own order
 * button is never covered.
 */
export function StickyOrderButton({ label }: { label: string }) {
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
      className="lg:hidden fixed bottom-4 inset-x-3 z-50 dc-pulse flex items-center justify-center gap-2 rounded-2xl bg-accent-dark text-white px-5 py-4 text-base font-bold shadow-[0_10px_30px_-4px_rgba(231,123,166,0.85)] ring-2 ring-white"
    >
      <span className="text-xl">🛒</span>
      {label}
    </button>
  );
}
