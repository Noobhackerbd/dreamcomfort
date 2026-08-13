"use client";

// components/admin/AdminMobileBar.tsx — mobile-only admin top bar (NOT sticky)
// with a slide-in drawer. Shows the current section for context. Hidden on md+.

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

  const active =
    items.find((i) => (i.href === "/admin" ? pathname === "/admin" : pathname.startsWith(i.href)));
  const sectionTitle = active?.label ?? storeName;
  const totalBadge = items.reduce((n, i) => n + (i.badge || 0), 0);

  return (
    <div className="md:hidden">
      {/* Non-sticky header row */}
      <div className="-mx-4 px-4 pb-3 mb-2 border-b border-black/5 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="h-9 w-9 rounded-xl bg-gradient-to-br from-brand to-accent text-white flex items-center justify-center font-bold text-sm shrink-0 shadow-sm">
            {storeName.charAt(0)}
          </span>
          <div className="min-w-0">
            <p className="font-display font-semibold text-brand-dark leading-tight truncate">{sectionTitle}</p>
            <p className="text-[11px] text-gray-400 leading-tight truncate">{storeName}</p>
          </div>
        </div>
        <button
          onClick={() => setOpen(true)}
          aria-label="মেনু"
          className="relative h-11 w-11 rounded-xl border border-black/5 bg-white flex items-center justify-center gap-[3px] shadow-sm active:scale-95 transition"
        >
          <span className="flex flex-col gap-[3px]">
            <span className="block h-[2px] w-4 bg-gray-700 rounded" />
            <span className="block h-[2px] w-4 bg-gray-700 rounded" />
            <span className="block h-[2px] w-4 bg-gray-700 rounded" />
          </span>
          {totalBadge > 0 && (
            <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-amber-500 text-white text-[10px] font-bold flex items-center justify-center">
              {totalBadge}
            </span>
          )}
        </button>
      </div>

      {/* Drawer */}
      {open && (
        <div className="fixed inset-0 z-[80]" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px]" onClick={() => setOpen(false)} />
          <div
            className="absolute right-0 top-0 h-full w-[84%] max-w-xs bg-white shadow-2xl flex flex-col"
            style={{ animation: "dcDrawer .22s cubic-bezier(.22,1,.36,1)" }}
          >
            <div className="flex items-center justify-between p-4 border-b border-black/5">
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="h-9 w-9 rounded-xl bg-gradient-to-br from-brand to-accent text-white flex items-center justify-center font-bold text-sm shrink-0">
                  {storeName.charAt(0)}
                </span>
                <div className="min-w-0">
                  <p className="font-display font-semibold text-brand-dark truncate">{storeName}</p>
                  <p className="text-[11px] text-gray-400 truncate">{email}</p>
                </div>
              </div>
              <button
                onClick={() => setOpen(false)}
                aria-label="বন্ধ"
                className="h-9 w-9 rounded-lg border border-black/5 text-lg flex items-center justify-center active:scale-95"
              >
                ✕
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-3">
              <AdminNav items={items} vertical />
            </div>
            <div className="p-4 border-t border-black/5">
              <SignOutButton />
            </div>
          </div>
          <style>{`@keyframes dcDrawer{from{transform:translateX(100%)}to{transform:none}}`}</style>
        </div>
      )}
    </div>
  );
}
