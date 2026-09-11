"use client";

import { useState } from "react";

export function FaqAccordion({ items }: { items: { q: string; a: string }[] }) {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <div className="space-y-2.5">
      {items.map((f, i) => {
        const isOpen = open === i;
        return (
          <div key={i} className="rounded-2xl bg-white ring-1 ring-black/5 overflow-hidden">
            <button onClick={() => setOpen(isOpen ? null : i)} className="w-full flex items-center justify-between gap-3 px-5 py-4 text-left">
              <span className="font-semibold text-[15px] text-gray-900">{f.q}</span>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={"h-4 w-4 shrink-0 text-gray-400 transition-transform " + (isOpen ? "rotate-180" : "")}><path d="M6 9l6 6 6-6" /></svg>
            </button>
            {isOpen && <p className="px-5 pb-4 -mt-1 text-sm text-gray-600 leading-relaxed whitespace-pre-line">{f.a}</p>}
          </div>
        );
      })}
    </div>
  );
}
