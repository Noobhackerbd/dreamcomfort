"use client";

import { useEffect, useState } from "react";
import { playConfirm } from "@/lib/sound";

/**
 * Mobile sticky order button. It actually SUBMITS the order form (not just scroll):
 * clicking it runs the same validation + placeOrder as the form's own button.
 * It also hides itself while the form is on screen, so the form's own order
 * button is never covered. Shows a fixed label (no price).
 */
export function StickyOrderButton({
  product,
}: {
  product?: { priceText: string; compareText: string | null; offText: string | null };
}) {
  const [formInView, setFormInView] = useState(false);

  useEffect(() => {
    let io: IntersectionObserver | null = null;
    // The order form may render a moment after this bar mounts, so keep trying
    // until #order-form exists, then observe it.
    const attach = () => {
      const form = document.getElementById("order-form");
      if (!form) return false;
      io = new IntersectionObserver(
        ([entry]) => setFormInView(entry.isIntersecting),
        { threshold: 0, rootMargin: "0px 0px -30% 0px" }
      );
      io.observe(form);
      return true;
    };
    if (attach()) return () => io?.disconnect();
    const id = window.setInterval(() => {
      if (attach()) window.clearInterval(id);
    }, 300);
    return () => {
      window.clearInterval(id);
      io?.disconnect();
    };
  }, []);

  // Hide the sticky bar while the order form is on screen; show it again once
  // the form is scrolled out of view.
  if (formInView) return null;

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
      className="lg:hidden fixed bottom-4 inset-x-3 z-50 flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-accent to-accent-dark px-6 py-4 text-base font-bold text-white shadow-[0_14px_30px_-8px_rgba(224,105,154,0.6)] transition hover:scale-[1.01] active:translate-y-px"
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 shrink-0" aria-hidden><circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" /><path d="M1 1h4l2.7 13.4a2 2 0 0 0 2 1.6h9.7a2 2 0 0 0 2-1.6L23 6H6" /></svg>
      <span className="inline-flex flex-wrap items-center justify-center gap-x-2 gap-y-0.5">
        এখনই অর্ডার করুন{product ? ` · ${product.priceText}` : ""}
        {product?.compareText && <span className="text-sm font-normal line-through opacity-75">{product.compareText}</span>}
        {product?.offText && <span className="rounded-full bg-white/25 px-2 py-0.5 text-xs font-bold">{product.offText}</span>}
      </span>
      <span aria-hidden>→</span>
    </button>
  );
}
