"use client";

import { useEffect, useRef, useState } from "react";

const LINKS = [
  { href: "/", label: "হোম" },
  { href: "/products", label: "সব পণ্য" },
  { href: "/landing", label: "অফার" },
  { href: "/track-order", label: "অর্ডার ট্র্যাক" },
  { href: "/account", label: "আমার অ্যাকাউন্ট" },
  { href: "/about", label: "আমাদের সম্পর্কে" },
  { href: "/contact", label: "যোগাযোগ" },
  { href: "/return-policy", label: "রিটার্ন পলিসি" },
];

/** Desktop-only header menu (dropdown). Mobile uses the bottom tab bar's মেনু. */
export function HeaderMenu() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDoc(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); }
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") setOpen(false); }
    if (open) { document.addEventListener("mousedown", onDoc); document.addEventListener("keydown", onKey); }
    return () => { document.removeEventListener("mousedown", onDoc); document.removeEventListener("keydown", onKey); };
  }, [open]);

  return (
    <div ref={ref} className="relative hidden md:block">
      <button onClick={() => setOpen((v) => !v)} aria-label="মেনু"
        className="flex items-center gap-1.5 h-9 px-3 rounded-full text-gray-700 hover:bg-black/5 text-sm font-semibold transition">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" className="h-[18px] w-[18px]" strokeLinecap="round"><path d="M4 6h16M4 12h16M4 18h16" /></svg>
        মেনু
      </button>
      {open && (
        <div className="absolute right-0 top-11 z-[60] w-52 rounded-xl bg-white shadow-xl ring-1 ring-black/5 py-1.5">
          {LINKS.map((l) => (
            <a key={l.href + l.label} href={l.href} className="block px-4 py-2 text-[13.5px] font-medium text-gray-700 hover:bg-cream/60 transition">{l.label}</a>
          ))}
        </div>
      )}
    </div>
  );
}
