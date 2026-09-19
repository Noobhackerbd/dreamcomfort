"use client";

import { useState } from "react";

/** Share this product — native share sheet on mobile, copy-link fallback on desktop. */
export function ShareButton({ title, className }: { title?: string; className?: string }) {
  const [copied, setCopied] = useState(false);

  async function onShare() {
    const url = typeof window !== "undefined" ? window.location.href : "";
    try {
      if (typeof navigator !== "undefined" && (navigator as any).share) {
        await (navigator as any).share({ title: title || document.title, url });
        return;
      }
    } catch { return; }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {}
  }

  return (
    <button onClick={onShare} aria-label="শেয়ার করুন" title="শেয়ার করুন"
      className={className || "h-9 w-9 grid place-items-center rounded-full border border-black/10 bg-white text-gray-500 hover:border-accent hover:text-accent transition"}>
      {copied ? (
        <svg viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.2" className="h-[18px] w-[18px]"><path d="M5 13l4 4L19 7" /></svg>
      ) : (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="h-[18px] w-[18px]">
          <circle cx="18" cy="5" r="2.6" /><circle cx="6" cy="12" r="2.6" /><circle cx="18" cy="19" r="2.6" />
          <path d="M8.3 10.8l7.4-4.3M8.3 13.2l7.4 4.3" />
        </svg>
      )}
    </button>
  );
}
