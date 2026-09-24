"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { logoutCustomer } from "@/app/account/actions";

type NavKey = "overview" | "orders" | "wishlist" | "recent" | "coupons" | "addresses" | "support" | "profile";

const NAV: { key: NavKey; href: string; label: string; icon: JSX.Element }[] = [
  { key: "overview", href: "/account", label: "ড্যাশবোর্ড", icon: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="h-[18px] w-[18px]"><path d="M3 12l9-8 9 8" /><path d="M5 10v10h14V10" /></svg>
  ) },
  { key: "orders", href: "/account/orders", label: "আমার অর্ডার", icon: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="h-[18px] w-[18px]"><path d="M6 2h9l5 5v15H6z" /><path d="M14 2v6h6M9 13h6M9 17h6" /></svg>
  ) },
  { key: "wishlist", href: "/account/wishlist", label: "উইশলিস্ট", icon: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="h-[18px] w-[18px]"><path d="M12 21s-7-4.5-9.5-8.5C1 9.5 2.5 6 6 6c2 0 3.2 1.2 4 2.3C10.8 7.2 12 6 14 6c3.5 0 5 3.5 3.5 6.5C19 16.5 12 21 12 21z" /></svg>
  ) },
  { key: "recent", href: "/account/recent", label: "সম্প্রতি দেখা", icon: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="h-[18px] w-[18px]"><path d="M3 12a9 9 0 1 0 3-6.7L3 8" /><path d="M3 3v5h5M12 8v4l3 2" /></svg>
  ) },
  { key: "coupons", href: "/account/coupons", label: "কুপন", icon: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="h-[18px] w-[18px]"><path d="M4 8V6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v2a2 2 0 0 0 0 4v2a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-2a2 2 0 0 0 0-4z" /><path d="M14 4v16" strokeDasharray="2 2" /></svg>
  ) },
  { key: "addresses", href: "/account/addresses", label: "ঠিকানা", icon: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="h-[18px] w-[18px]"><path d="M12 21s-7-6-7-11a7 7 0 0 1 14 0c0 5-7 11-7 11z" /><circle cx="12" cy="10" r="2.5" /></svg>
  ) },
  { key: "support", href: "/account/support", label: "সাপোর্ট", icon: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="h-[18px] w-[18px]"><path d="M21 15a2 2 0 0 1-2 2H8l-4 4V5a2 2 0 0 1 2-2h13a2 2 0 0 1 2 2z" /></svg>
  ) },
  { key: "profile", href: "/account/profile", label: "প্রোফাইল", icon: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="h-[18px] w-[18px]"><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 4-6 8-6s8 2 8 6" /></svg>
  ) },
];

export function DashboardShell({ active, name, email, children }: { active: NavKey; name: string; email: string; children: React.ReactNode }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const initial = (name || email || "?").trim().charAt(0).toUpperCase();
  const activeRef = useRef<HTMLAnchorElement>(null);

  // Keep the active pill in view on mobile.
  useEffect(() => {
    activeRef.current?.scrollIntoView({ inline: "center", block: "nearest" });
  }, []);

  async function logout() {
    setBusy(true);
    await logoutCustomer();
    router.replace("/");
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-5 md:py-10">
      <div className="grid gap-5 md:gap-6 md:grid-cols-[260px_minmax(0,1fr)] min-w-0">
        {/* Sidebar / profile card */}
        <aside className="min-w-0 md:sticky md:top-24 h-max">
          <div className="rounded-2xl bg-white border border-black/[0.06] shadow-[0_1px_2px_rgba(0,0,0,0.04)] overflow-hidden">
            {/* Profile header with brand gradient */}
            <div className="flex items-center gap-3 p-4 bg-gradient-to-br from-brand-soft to-white">
              <div className="h-12 w-12 shrink-0 rounded-full bg-gradient-to-br from-brand to-brand-dark text-white grid place-items-center font-display text-lg font-bold shadow-[0_4px_10px_-3px_rgba(47,144,204,0.55)]">{initial}</div>
              <div className="min-w-0">
                <p className="font-semibold text-gray-900 truncate">{name || "গ্রাহক"}</p>
                <p className="text-xs text-gray-500 truncate">{email}</p>
              </div>
            </div>

            {/* Desktop nav */}
            <nav className="hidden md:flex md:flex-col gap-0.5 p-2.5 pt-1 border-t border-black/[0.05]">
              {NAV.map((n) => (
                <a key={n.key} href={n.href}
                  className={"flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors " +
                    (active === n.key ? "bg-brand text-white shadow-[0_4px_12px_-4px_rgba(47,144,204,0.6)]" : "text-gray-600 hover:bg-brand-soft/60 hover:text-brand-dark")}>
                  {n.icon}{n.label}
                </a>
              ))}
              <a href="/track-order" className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-gray-600 hover:bg-brand-soft/60 hover:text-brand-dark transition-colors">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="h-[18px] w-[18px]"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>
                অর্ডার ট্র্যাক
              </a>
              <button onClick={logout} disabled={busy}
                className="mt-0.5 flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-60 text-left transition-colors">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="h-[18px] w-[18px]"><path d="M15 12H4M9 7l-5 5 5 5M14 4h5v16h-5" /></svg>
                {busy ? "..." : "লগ আউট"}
              </button>
            </nav>
          </div>

          {/* Mobile nav: horizontal scrolling icon + label pills */}
          <div className="md:hidden mt-3 -mx-4 px-4 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
            {NAV.map((n) => (
              <a key={n.key} href={n.href} ref={active === n.key ? activeRef : undefined}
                className={"shrink-0 inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 py-2 text-[13px] font-semibold border transition-colors " +
                  (active === n.key ? "bg-brand text-white border-brand shadow-[0_4px_12px_-4px_rgba(47,144,204,0.6)]" : "bg-white text-gray-600 border-black/[0.08]")}>
                {n.icon}{n.label}
              </a>
            ))}
            <a href="/track-order" className="shrink-0 inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 py-2 text-[13px] font-semibold border border-black/[0.08] bg-white text-gray-600">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="h-4 w-4"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>
              ট্র্যাক
            </a>
            <button onClick={logout} disabled={busy} className="shrink-0 inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 py-2 text-[13px] font-semibold border border-red-200 text-red-600 bg-white">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="h-4 w-4"><path d="M15 12H4M9 7l-5 5 5 5M14 4h5v16h-5" /></svg>
              লগ আউট
            </button>
          </div>
        </aside>

        {/* Content */}
        <section className="min-w-0">{children}</section>
      </div>
    </div>
  );
}
