"use client";

// components/admin/AdminMobileBar.tsx — mobile-only sticky top bar + slide-in
// drawer navigation for the admin. Hidden on md+ (desktop uses the sidebar).

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { AdminNav, type NavItem } from "./AdminNav";
import { SignOutButton } from "@/app/admin/SignOutButton";

export function AdminMobileBar({
  storeName,
  email,
  items,
}: {
  storeName: string;
  email: string;
  items: NavItem[];
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const totalBadge = items.reduce((n, i) => n + (i.badge || 0), 0);

  return (
    <div className="md:hidden">
      <div className="sticky top-0 z-40 -mx-4 px-4 py-2.5 bg-white/90 backdrop-blur border-b border-black/5 flex items-center justify-between">
        <a href="/admin" className="flex items-center gap-2 min-w-0">
          <span className="h-8 w-8 rounded-lg bg-gradient-to-br from-brand to-accent text-white flex items-center justify-center font-bold text-sm shrink-0">
            {storeName.charAt(0)}
          </span>
          <span className="font-display font-bold text-brand-dark truncate">{storeName}</span>
        </a>
        <button
          onClick={() => setOpen(true)}
          aria-label="মেনু"
          className="relative h-10 w-10 rounded-xl border border-black/5 bg-white flex items-center justify-center text-xl shadow-sm"
        >
          ☰
          {totalBadge > 0 && (
            <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-amber-500 text-white text-[10px] font-bold flex items-center justify-center">
              {totalBadge}
            </span>
          )}
        </button>
      </div>

      {open && (
        <div className="fixed inset-0 z-[80]" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <div
            className="absolute right-0 top-0 h-full w-[82%] max-w-xs bg-white shadow-2xl p-4 flex flex-col"
            style={{ animation: "dcDrawer .2s ease" }}
          >
            <div className="flex items-center justify-between mb-4 pb-4 border-b border-black/5">
              <div className="min-w-0">
                <p className="font-display font-bold text-brand-dark truncate">{storeName}</p>
                <p className="text-[11px] text-gray-400 truncate">{email}</p>
              </div>
              <button
                onClick={() => setOpen(false)}
                aria-label="বন্ধ"
                className="h-9 w-9 rounded-lg border border-black/5 text-lg flex items-center justify-center"
              >
                ✕
              </button>
            </div>
            <div className="flex-1 overflow-y-auto -mx-1 px-1">
              <AdminNav items={items} vertical />
            </div>
            <div className="mt-4 pt-4 border-t border-black/5">
              <SignOutButton />
            </div>
          </div>
          <style>{`@keyframes dcDrawer{from{transform:translateX(100%)}to{transform:none}}`}</style>
        </div>
      )}
    </div>
  );
}
