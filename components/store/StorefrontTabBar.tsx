"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

const TABS = [
  { href: "/", label: "হোম", d: "M3 10.5L12 3l9 7.5M5 9.5V21h14V9.5" },
  { href: "/products", label: "ক্যাটাগরি", d: "M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z" },
  { href: "/landing", label: "অফার", d: "M20 12l-8 8-9-9V3h8l9 9zM7.5 7.5h.01" },
  { href: "/track-order", label: "আমার অর্ডার", d: "M3 4h18v16H3zM3 9h18M8 4v5" },
  { href: "/contact", label: "অ্যাকাউন্ট", d: "M12 8a4 4 0 100-8 4 4 0 000 8zM4 21c0-4 4-6 8-6M12 8a4 4 0 110 0" },
];

export function StorefrontTabBar() {
  const pathname = usePathname() || "/";
  const hide =
    pathname.startsWith("/admin") ||
    pathname.startsWith("/order") ||
    pathname.startsWith("/landing") ||
    pathname.startsWith("/checkout");

  useEffect(() => {
    if (hide) { document.body.classList.remove("has-store-tabs"); return; }
    document.body.classList.add("has-store-tabs");
    return () => document.body.classList.remove("has-store-tabs");
  }, [hide]);

  if (hide) return null;

  return (
    <>
      <style>{`@media (max-width:767px){ body.has-store-tabs{ padding-bottom:66px } }`}</style>
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white border-t border-black/5 flex px-1 pt-2 pb-2.5">
        {TABS.map((t) => {
          const active = t.href === "/" ? pathname === "/" : pathname.startsWith(t.href);
          return (
            <a key={t.href} href={t.href} className="flex-1 flex flex-col items-center gap-0.5 text-[10.5px] font-semibold"
              style={{ color: active ? "#3E9BD1" : "#9a94a1" }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d={t.d} /></svg>
              {t.label}
            </a>
          );
        })}
      </nav>
    </>
  );
}
