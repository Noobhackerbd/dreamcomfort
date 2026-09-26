"use client";

import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useL } from "@/components/i18n/I18nProvider";

/**
 * First-visit promotional popup (admin-uploaded banner).
 *
 * Performance: this renders NOTHING during the initial paint. It waits until the
 * browser is idle (requestIdleCallback / short timeout) AFTER the page has loaded
 * before it even mounts the image, so it never competes with LCP or blocks the
 * first render. The banner image is only requested once the popup actually opens.
 *
 * Frequency: shown once per browser session by default. If the visitor ticks
 * "আর দেখাবেন না" (don't show again) it's suppressed permanently — until the admin
 * uploads a NEW banner (rev changes), which brings everyone back once.
 */
export function PromoPopup({
  enabled, image, link, rev,
}: { enabled: boolean; image: string; link?: string; rev: number }) {
  const { L } = useL();
  const pathname = usePathname() || "/";
  const [open, setOpen] = useState(false);
  const [dontShow, setDontShow] = useState(false);

  const OFF_KEY = "dc-promo-off";     // localStorage: permanent opt-out (stores rev)
  const SEEN_KEY = "dc-promo-seen";   // sessionStorage: already shown this session (stores rev)

  const blocked =
    pathname.startsWith("/admin") ||
    pathname.startsWith("/order") ||
    pathname.startsWith("/landing") ||
    pathname.startsWith("/checkout") ||
    pathname.startsWith("/worker");

  useEffect(() => {
    if (!enabled || !image || blocked) return;
    const r = String(rev || 0);

    let shouldShow = true;
    try {
      if (localStorage.getItem(OFF_KEY) === r) shouldShow = false;         // opted out of THIS banner
      else if (sessionStorage.getItem(SEEN_KEY) === r) shouldShow = false; // already seen this session
    } catch { /* storage blocked — still show */ }
    if (!shouldShow) return;

    // Defer until the page is idle so the popup never slows down loading.
    let done = false;
    const show = () => {
      if (done) return; done = true;
      try { sessionStorage.setItem(SEEN_KEY, r); } catch {}
      setOpen(true);
    };
    const ric: any = (window as any).requestIdleCallback;
    const idle = ric ? ric(show, { timeout: 1600 }) : null;
    const t = setTimeout(show, 900); // fallback / floor delay
    return () => {
      clearTimeout(t);
      if (idle && (window as any).cancelIdleCallback) (window as any).cancelIdleCallback(idle);
    };
  }, [enabled, image, rev, blocked]);

  // Lock body scroll while the popup is open.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") close(); };
    window.addEventListener("keydown", onKey);
    return () => { document.body.style.overflow = prev; window.removeEventListener("keydown", onKey); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function close() {
    if (dontShow) { try { localStorage.setItem(OFF_KEY, String(rev || 0)); } catch {} }
    setOpen(false);
  }

  if (!open) return null;

  const img = (
    <Image
      src={image}
      alt={L("Offer", "অফার")}
      width={0}
      height={0}
      sizes="(max-width:768px) 90vw, 400px"
      className="block w-full h-auto"
      priority
    />
  );

  return (
    <div
      className="fixed inset-0 z-[100] grid place-items-center p-4 bg-black/60 backdrop-blur-[2px]"
      style={{ animation: "dcPromoFade .2s ease-out" }}
      onClick={close}
      role="dialog"
      aria-modal="true"
    >
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes dcPromoFade{from{opacity:0}to{opacity:1}}
        @keyframes dcPromoPop{0%{transform:scale(.92);opacity:0}100%{transform:scale(1);opacity:1}}
      ` }} />

      <div
        className="relative w-full max-w-[400px] overflow-hidden rounded-2xl bg-white shadow-2xl"
        style={{ animation: "dcPromoPop .28s cubic-bezier(.34,1.4,.64,1)" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close (X) */}
        <button
          onClick={close}
          aria-label={L("Close", "বন্ধ করুন")}
          className="absolute top-2.5 right-2.5 z-10 h-8 w-8 grid place-items-center rounded-full bg-white/90 text-gray-600 shadow-md hover:bg-white transition"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="h-4 w-4"><path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" /></svg>
        </button>

        {/* Banner */}
        {link ? <a href={link} onClick={() => setOpen(false)} className="block">{img}</a> : img}

        {/* Don't-show-again bar */}
        <button
          type="button"
          onClick={() => setDontShow((v) => !v)}
          className="flex w-full items-center justify-center gap-2 py-3 text-[13px] font-semibold text-white transition"
          style={{ background: "#F0530E" }}
        >
          <span className="grid place-items-center h-[18px] w-[18px] rounded-[5px] border-2 border-white/90">
            {dontShow && <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="h-3 w-3"><path d="M5 12l4 4 10-10" strokeLinecap="round" strokeLinejoin="round" /></svg>}
          </span>
          {L("Don't show again", "আর দেখাবেন না")}
        </button>
      </div>
    </div>
  );
}
