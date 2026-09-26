"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useL } from "@/components/i18n/I18nProvider";
import { LanguageSwitcher } from "@/components/i18n/LanguageSwitcher";
import { T } from "@/components/i18n/T";

/** Clean, simple white line-icons on a flat brand-blue bar (matches the
 *  reference design). Same buttons/behaviour as before — only the look changed. */
const Icons = {
  home: () => (
    <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3.5 10.7 12 3.5l8.5 7.2" />
      <path d="M5.6 9.4V19a1.4 1.4 0 0 0 1.4 1.4h2.6V15a1 1 0 0 1 1-1h2.8a1 1 0 0 1 1 1v5.4H17a1.4 1.4 0 0 0 1.4-1.4V9.4" />
    </svg>
  ),
  grid: () => (
    <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3.4" y="3.4" width="7.2" height="7.2" rx="2" />
      <rect x="13.4" y="3.4" width="7.2" height="7.2" rx="2" />
      <rect x="3.4" y="13.4" width="7.2" height="7.2" rx="2" />
      <rect x="13.4" y="13.4" width="7.2" height="7.2" rx="2" />
    </svg>
  ),
  gift: () => (
    <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4.5 11.5V19a1.5 1.5 0 0 0 1.5 1.5h12a1.5 1.5 0 0 0 1.5-1.5v-7.5" />
      <rect x="3" y="7.5" width="18" height="4" rx="1.4" />
      <path d="M12 7.5v13" />
      <path d="M12 7.5S10.9 3.5 8.4 3.5 6.2 7.5 9 7.5" />
      <path d="M12 7.5s1.1-4 3.6-4 2.2 4-.6 4" />
    </svg>
  ),
  user: () => (
    <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="3.6" />
      <path d="M5 20a7 7 0 0 1 14 0" />
    </svg>
  ),
  menu: () => (
    <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4.5 7.5h15M4.5 12h15M4.5 16.5h15" />
    </svg>
  ),
};

const TABS = [
  { href: "/", en: "Home", bn: "হোম", icon: Icons.home },
  { href: "/products", en: "Category", bn: "ক্যাটাগরি", icon: Icons.grid },
  { href: "/landing", en: "Offer", bn: "অফার", icon: Icons.gift },
  { href: "/account", en: "Account", bn: "অ্যাকাউন্ট", icon: Icons.user },
];

const MENU_LINKS = [
  { href: "/", en: "Home", bn: "হোম" },
  { href: "/products", en: "All Products", bn: "সব পণ্য" },
  { href: "/landing", en: "Offer", bn: "অফার" },
  { href: "/track-order", en: "Track Order", bn: "অর্ডার ট্র্যাক" },
  { href: "/account", en: "My Account", bn: "আমার অ্যাকাউন্ট" },
  { href: "/about", en: "About Us", bn: "আমাদের সম্পর্কে" },
  { href: "/contact", en: "Contact", bn: "যোগাযোগ" },
  { href: "/return-policy", en: "Return Policy", bn: "রিটার্ন পলিসি" },
];

/** Icon holder. Flat like the reference — active just brightens + springs. */
function IconWrap({ active, children }: { active: boolean; children: React.ReactNode }) {
  return (
    <span className={"relative z-[2] grid place-items-center h-[24px] " + (active ? "dc-tab-on" : "")}>
      <span className="dc-tab-ico">{children}</span>
    </span>
  );
}

export function StorefrontTabBar({ categoryIcon }: { categoryIcon?: string }) {
  const { L } = useL();
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

  // Apple-style floating frosted-glass pill. Active = brand blue; inactive = grey.
  const ACTIVE = "#2F90CC";
  const INACTIVE = "#5b6470";

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        @media (max-width:767px){ body.has-store-tabs{ padding-bottom:80px } }
        @keyframes dcMenuIn{from{transform:translateX(100%)}to{transform:translateX(0)}}
        @keyframes dcTabPop{0%{transform:scale(.82)}55%{transform:scale(1.16)}100%{transform:scale(1)}}
        .dc-tab-bar{
          background:rgba(255,255,255,.55);
          -webkit-backdrop-filter:blur(22px) saturate(1.8);
          backdrop-filter:blur(22px) saturate(1.8);
          border:1px solid rgba(255,255,255,.65);
          box-shadow:0 10px 30px -12px rgba(20,40,70,.45);
        }
        @supports not ((backdrop-filter:blur(1px)) or (-webkit-backdrop-filter:blur(1px))){
          .dc-tab-bar{ background:rgba(255,255,255,.92) }
        }
        .dc-tab-item{position:relative}
        .dc-tab-item .dc-pill{
          position:absolute;z-index:1;top:-3px;left:50%;transform:translateX(-50%) scale(.85);transform-origin:center;
          width:52px;height:30px;border-radius:15px;background:rgba(47,144,204,.16);
          opacity:0;transition:opacity .2s ease, transform .2s cubic-bezier(.34,1.56,.64,1);
        }
        .dc-tab-item.on .dc-pill{opacity:1;transform:translateX(-50%) scale(1)}
        .dc-tab-item > .dc-lbl{position:relative;z-index:2}
        .dc-tab-ico{display:inline-flex;transition:transform .2s ease}
        .dc-tab-on .dc-tab-ico{animation:dcTabPop .42s cubic-bezier(.34,1.56,.64,1)}
        @media (prefers-reduced-motion: reduce){ .dc-tab-on .dc-tab-ico{animation:none} }
      ` }} />

      {menuOpen && (
        <div className="md:hidden fixed inset-0 z-[80] bg-black/40 backdrop-blur-sm" onClick={() => setMenuOpen(false)}>
          <div className="absolute top-0 right-0 h-full w-[80%] max-w-[320px] bg-white shadow-2xl flex flex-col"
            style={{ animation: "dcMenuIn .22s ease-out" }} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 h-14 border-b border-black/5 shrink-0">
              <p className="text-sm font-bold text-gray-800"><T en="Menu" bn="মেনু" /></p>
              <button onClick={() => setMenuOpen(false)} aria-label={L("Close", "বন্ধ")}
                className="h-9 w-9 grid place-items-center rounded-full text-gray-500 hover:bg-black/5 transition">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5"><path d="M6 6l12 12M18 6L6 18" /></svg>
              </button>
            </div>
            <nav className="flex-1 overflow-y-auto py-1">
              {MENU_LINKS.map((l) => (
                <Link key={l.href + l.en} href={l.href} prefetch
                  className="flex items-center justify-between px-4 py-3.5 text-[14px] font-semibold text-gray-700 border-b border-black/5 hover:bg-cream/60 transition">
                  <T en={l.en} bn={l.bn} />
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4 text-gray-300"><path d="M9 6l6 6-6 6" /></svg>
                </Link>
              ))}
            </nav>
            <div className="px-4 py-3.5 border-t border-black/5 shrink-0">
              <p className="text-[12px] font-semibold text-gray-500 mb-2"><T en="Language" bn="ভাষা" /></p>
              <LanguageSwitcher />
            </div>
          </div>
        </div>
      )}

      <nav className="dc-tab-bar md:hidden fixed bottom-3 left-3 right-3 z-40 flex px-1.5 py-2 rounded-[24px]">
        {TABS.map((t) => {
          const active = t.href === "/" ? pathname === "/" : pathname.startsWith(t.href);
          const color = active ? ACTIVE : INACTIVE;
          const useCustom = t.href === "/products" && catIconUrl;
          const icon = useCustom
            ? <img src={catIconUrl} alt="" width={21} height={21} className="h-[21px] w-[21px] object-contain"
                style={{ filter: "brightness(0)", opacity: active ? 1 : 0.5 }} />
            : <span style={{ color }}>{t.icon()}</span>;
          // Account opens the login popup (redirects to /account if already signed in).
          if (t.href === "/account") {
            return (
              <button key={t.href} onClick={() => window.dispatchEvent(new Event("dc:open-login"))}
                className={"dc-tab-item flex-1 flex flex-col items-center gap-0.5 text-[10px] font-semibold" + (active ? " on" : "")}
                style={{ color }}>
                <span className="dc-pill" />
                <IconWrap active={active}>{icon}</IconWrap><span className="dc-lbl"><T en={t.en} bn={t.bn} /></span>
              </button>
            );
          }
          return (
            <Link key={t.href} href={t.href} prefetch
              className={"dc-tab-item flex-1 flex flex-col items-center gap-0.5 text-[10px] font-semibold" + (active ? " on" : "")}
              style={{ color }}>
              <span className="dc-pill" />
              <IconWrap active={active}>{icon}</IconWrap><span className="dc-lbl"><T en={t.en} bn={t.bn} /></span>
            </Link>
          );
        })}
        <button onClick={() => setMenuOpen((v) => !v)} aria-label={L("Menu","মেনু")}
          className={"dc-tab-item flex-1 flex flex-col items-center gap-0.5 text-[10px] font-semibold" + (menuOpen ? " on" : "")}
          style={{ color: menuOpen ? ACTIVE : INACTIVE }}>
          <span className="dc-pill" />
          <IconWrap active={menuOpen}>
            <span style={{ color: menuOpen ? ACTIVE : INACTIVE }}>{Icons.menu()}</span>
          </IconWrap>
          <span className="dc-lbl"><T en="Menu" bn="মেনু" /></span>
        </button>
      </nav>
    </>
  );
}
