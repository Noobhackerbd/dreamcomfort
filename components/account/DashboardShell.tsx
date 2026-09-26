"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { logoutCustomer } from "@/app/account/actions";
import { useL } from "@/components/i18n/I18nProvider";

type NavKey = "overview" | "orders" | "wishlist" | "recent" | "coupons" | "addresses" | "support" | "profile";

const NAV: { key: NavKey; href: string; en: string; bn: string; icon: JSX.Element }[] = [
  { key: "overview", href: "/account", en: "Dashboard", bn: "ড্যাশবোর্ড", icon: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="h-[18px] w-[18px]"><path d="M3 12l9-8 9 8" /><path d="M5 10v10h14V10" /></svg>
  ) },
  { key: "orders", href: "/account/orders", en: "My Orders", bn: "আমার অর্ডার", icon: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="h-[18px] w-[18px]"><path d="M6 2h9l5 5v15H6z" /><path d="M14 2v6h6M9 13h6M9 17h6" /></svg>
  ) },
  { key: "wishlist", href: "/account/wishlist", en: "Wishlist", bn: "উইশলিস্ট", icon: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="h-[18px] w-[18px]"><path d="M12 21s-7-4.5-9.5-8.5C1 9.5 2.5 6 6 6c2 0 3.2 1.2 4 2.3C10.8 7.2 12 6 14 6c3.5 0 5 3.5 3.5 6.5C19 16.5 12 21 12 21z" /></svg>
  ) },
  { key: "recent", href: "/account/recent", en: "Recently Viewed", bn: "সম্প্রতি দেখা", icon: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="h-[18px] w-[18px]"><path d="M3 12a9 9 0 1 0 3-6.7L3 8" /><path d="M3 3v5h5M12 8v4l3 2" /></svg>
  ) },
  { key: "coupons", href: "/account/coupons", en: "Coupons", bn: "কুপন", icon: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="h-[18px] w-[18px]"><path d="M4 8V6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v2a2 2 0 0 0 0 4v2a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-2a2 2 0 0 0 0-4z" /><path d="M14 4v16" strokeDasharray="2 2" /></svg>
  ) },
  { key: "addresses", href: "/account/addresses", en: "Addresses", bn: "ঠিকানা", icon: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="h-[18px] w-[18px]"><path d="M12 21s-7-6-7-11a7 7 0 0 1 14 0c0 5-7 11-7 11z" /><circle cx="12" cy="10" r="2.5" /></svg>
  ) },
  { key: "support", href: "/account/support", en: "Support", bn: "সাপোর্ট", icon: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="h-[18px] w-[18px]"><path d="M21 15a2 2 0 0 1-2 2H8l-4 4V5a2 2 0 0 1 2-2h13a2 2 0 0 1 2 2z" /></svg>
  ) },
  { key: "profile", href: "/account/profile", en: "Profile", bn: "প্রোফাইল", icon: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="h-[18px] w-[18px]"><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 4-6 8-6s8 2 8 6" /></svg>
  ) },
];

export function DashboardShell({ active, name, email, children }: { active: NavKey; name: string; email: string; children: React.ReactNode }) {
  const { L } = useL();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const initial = (name || email || "?").trim().charAt(0).toUpperCase();

  // Short labels for the mobile tile grid (fit on one line under each icon).
  const SHORT: Record<NavKey, { en: string; bn: string }> = {
    overview: { en: "Home", bn: "ড্যাশবোর্ড" }, orders: { en: "Orders", bn: "অর্ডার" }, wishlist: { en: "Wishlist", bn: "উইশলিস্ট" }, recent: { en: "Recent", bn: "সম্প্রতি" },
    coupons: { en: "Coupons", bn: "কুপন" }, addresses: { en: "Address", bn: "ঠিকানা" }, support: { en: "Support", bn: "সাপোর্ট" }, profile: { en: "Profile", bn: "প্রোফাইল" },
  };

  async function logout() {
    setBusy(true);
    await logoutCustomer();
    router.replace("/");
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-4 md:py-8">
      <div className="grid gap-4 md:gap-6 md:grid-cols-[260px_minmax(0,1fr)] min-w-0">
        {/* Sidebar / profile card */}
        <aside className="min-w-0 md:sticky md:top-24 h-max">
          <div className="rounded-2xl bg-white border border-black/[0.06] shadow-[0_1px_2px_rgba(0,0,0,0.04)] overflow-hidden">
            {/* Profile header with brand gradient */}
            <div className="flex items-center gap-3 p-4 bg-gradient-to-br from-brand-soft to-white">
              <div className="h-12 w-12 shrink-0 rounded-full bg-gradient-to-br from-brand to-brand-dark text-white grid place-items-center font-display text-lg font-bold shadow-[0_4px_10px_-3px_rgba(47,144,204,0.55)]">{initial}</div>
              <div className="min-w-0">
                <p className="font-semibold text-gray-900 truncate">{name || L("Customer","গ্রাহক")}</p>
                <p className="text-xs text-gray-500 truncate">{email}</p>
              </div>
            </div>

            {/* Desktop nav */}
            <nav className="hidden md:flex md:flex-col gap-0.5 p-2.5 pt-1 border-t border-black/[0.05]">
              {NAV.map((n) => (
                <a key={n.key} href={n.href}
                  className={"flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors " +
                    (active === n.key ? "bg-brand text-white shadow-[0_4px_12px_-4px_rgba(47,144,204,0.6)]" : "text-gray-600 hover:bg-brand-soft/60 hover:text-brand-dark")}>
                  {n.icon}{L(n.en, n.bn)}
                </a>
              ))}
              <a href="/track-order" className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-gray-600 hover:bg-brand-soft/60 hover:text-brand-dark transition-colors">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="h-[18px] w-[18px]"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>
                {L("Track Order","অর্ডার ট্র্যাক")}
              </a>
              <button onClick={logout} disabled={busy}
                className="mt-0.5 flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-60 text-left transition-colors">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="h-[18px] w-[18px]"><path d="M15 12H4M9 7l-5 5 5 5M14 4h5v16h-5" /></svg>
                {busy ? "..." : L("Log Out","লগ আউট")}
              </button>
            </nav>
          </div>

          {/* Mobile nav: icon-tile grid (wraps, no horizontal scroll) */}
          <div className="md:hidden mt-3 grid grid-cols-4 gap-2">
            {NAV.map((n) => {
              const on = active === n.key;
              return (
                <a key={n.key} href={n.href}
                  className={"flex flex-col items-center justify-start gap-1.5 rounded-xl border py-2.5 px-1 transition-colors " +
                    (on ? "border-brand bg-brand-soft" : "border-black/[0.06] bg-white")}>
                  <span className={"h-9 w-9 grid place-items-center rounded-full shrink-0 " + (on ? "bg-brand text-white" : "bg-brand-soft text-brand-dark")}>{n.icon}</span>
                  <span className="text-[10.5px] font-semibold text-center leading-tight text-gray-700 line-clamp-2">{L(SHORT[n.key].en, SHORT[n.key].bn)}</span>
                </a>
              );
            })}
            <a href="/track-order" className="flex flex-col items-center justify-start gap-1.5 rounded-xl border border-black/[0.06] bg-white py-2.5 px-1">
              <span className="h-9 w-9 grid place-items-center rounded-full bg-brand-soft text-brand-dark shrink-0">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="h-[18px] w-[18px]"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>
              </span>
              <span className="text-[10.5px] font-semibold text-center leading-tight text-gray-700">{L("Track","ট্র্যাক")}</span>
            </a>
            <button onClick={logout} disabled={busy} className="flex flex-col items-center justify-start gap-1.5 rounded-xl border border-red-100 bg-white py-2.5 px-1 disabled:opacity-60">
              <span className="h-9 w-9 grid place-items-center rounded-full bg-red-50 text-red-500 shrink-0">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="h-[18px] w-[18px]"><path d="M15 12H4M9 7l-5 5 5 5M14 4h5v16h-5" /></svg>
              </span>
              <span className="text-[10.5px] font-semibold text-center leading-tight text-red-500">{L("Log Out","লগ আউট")}</span>
            </button>
          </div>
        </aside>

        {/* Content */}
        <section className="min-w-0">{children}</section>
      </div>
    </div>
  );
}
