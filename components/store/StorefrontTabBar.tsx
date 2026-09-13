"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const TABS = [
  { href: "/", label: "হোম", d: "M3 10.5L12 3l9 7.5M5 9.5V21h14V9.5" },
  { href: "/products", label: "ক্যাটাগরি", d: "M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z" },
  { href: "/landing", label: "অফার", d: "M20 12l-8 8-9-9V3h8l9 9zM7.5 7.5h.01" },
  { href: "/account", label: "অ্যাকাউন্ট", d: "M12 8a4 4 0 100-8 4 4 0 000 8zM4 21c0-4 4-6 8-6M12 8a4 4 0 110 0" },
];

const MENU_LINKS = [
  { href: "/", label: "হোম" },
  { href: "/products", label: "সব পণ্য" },
  { href: "/landing", label: "অফার" },
  { href: "/track-order", label: "অর্ডার ট্র্যাক" },
  { href: "/account", label: "আমার অ্যাকাউন্ট" },
  { href: "/about", label: "আমাদের সম্পর্কে" },
  { href: "/contact", label: "যোগাযোগ" },
  { href: "/return-policy", label: "রিটার্ন পলিসি" },
];

export function StorefrontTabBar({ categoryIcon }: { categoryIcon?: string }) {
  const pathname = usePathname() || "/";
  const catIconUrl = categoryIcon ? `data:image/svg+xml,${encodeURIComponent(categoryIcon)}` : "";
  const [menuOpen, setMenuOpen] = useState(false);
  const hide =
    pathname.startsWith("/admin") ||
    pathname.startsWith("/order") ||
    pathname.startsWith("/landing") ||
    pathname.startsWith("/checkout") ||
    pathname.startsWith("/worker");

  useEffect(() => {
    if (hide) { document.body.classList.remove("has-store-tabs"); return; }
    document.body.classList.add("has-store-tabs");
    return () => document.body.classList.remove("has-store-tabs");
  }, [hide]);

  useEffect(() => { setMenuOpen(false); }, [pathname]);

  if (hide) return null;

  return (
    <>
      <style>{`@media (max-width:767px){ body.has-store-tabs{ padding-bottom:66px } } @keyframes dcMenuIn{from{transform:translateX(100%)}to{transform:translateX(0)}}`}</style>

      {menuOpen && (
        <div className="md:hidden fixed inset-0 z-[80] bg-black/40 backdrop-blur-sm" onClick={() => setMenuOpen(false)}>
          <div className="absolute top-0 right-0 h-full w-[80%] max-w-[320px] bg-white shadow-2xl flex flex-col"
            style={{ animation: "dcMenuIn .22s ease-out" }} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 h-14 border-b border-black/5 shrink-0">
              <p className="text-sm font-bold text-gray-800">মেনু</p>
              <button onClick={() => setMenuOpen(false)} aria-label="বন্ধ"
                className="h-9 w-9 grid place-items-center rounded-full text-gray-500 hover:bg-black/5 transition">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5"><path d="M6 6l12 12M18 6L6 18" /></svg>
              </button>
            </div>
            <nav className="flex-1 overflow-y-auto py-1">
              {MENU_LINKS.map((l) => (
                <a key={l.href + l.label} href={l.href}
                  className="flex items-center justify-between px-4 py-3.5 text-[14px] font-semibold text-gray-700 border-b border-black/5 hover:bg-cream/60 transition">
                  {l.label}
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4 text-gray-300"><path d="M9 6l6 6-6 6" /></svg>
                </a>
              ))}
            </nav>
          </div>
        </div>
      )}

      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white border-t border-black/5 flex px-1 pt-2 pb-2.5">
        {TABS.map((t) => {
          const active = t.href === "/" ? pathname === "/" : pathname.startsWith(t.href);
          const useCustom = t.href === "/products" && catIconUrl;
          return (
            <a key={t.href} href={t.href} className="flex-1 flex flex-col items-center gap-0.5 text-[10.5px] font-semibold"
              style={{ color: active ? "#3E9BD1" : "#9a94a1" }}>
              {useCustom
                ? <img src={catIconUrl} alt="" width={22} height={22} className="h-[22px] w-[22px] object-contain" style={{ opacity: active ? 1 : 0.75 }} />
                : <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d={t.d} /></svg>}
              {t.label}
            </a>
          );
        })}
        <button onClick={() => setMenuOpen((v) => !v)} aria-label="মেনু"
          className="flex-1 flex flex-col items-center gap-0.5 text-[10.5px] font-semibold"
          style={{ color: menuOpen ? "#3E9BD1" : "#9a94a1" }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 6h16M4 12h16M4 18h16" /></svg>
          মেনু
        </button>
      </nav>
    </>
  );
}
