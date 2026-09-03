"use client";

// components/admin/AdminMobileBar.tsx — mobile-only STICKY admin top bar:
// logo + current section title + notification bell. The full menu now lives in
// the bottom tab bar ("More"), so there's no hamburger/drawer here. Hidden on md+.

import { usePathname } from "next/navigation";
import { NotificationBell } from "@/app/admin/NotificationBell";
import type { NavItem } from "./AdminNav";
import type { BookedItem } from "@/app/admin/BookedReminders";

export function AdminMobileBar({
  storeName,
  items,
  notif,
}: {
  storeName: string;
  items: NavItem[];
  notif: { booked: BookedItem[]; pending: number; abandoned: number; lowStock: number };
}) {
  const pathname = usePathname();
  const active = items.find((i) => (i.href === "/admin" ? pathname === "/admin" : pathname.startsWith(i.href)));
  const sectionTitle = active?.label ?? "Dashboard";

  return (
    <div
      className="md:hidden sticky top-0 z-50 -mx-3 px-3 py-2.5 mb-2 flex items-center gap-2.5"
      style={{ background: "var(--a-bg)", borderBottom: "1px solid var(--a-border)" }}
    >
      <span className="h-10 w-10 rounded-xl dc-mark shrink-0"><img src="/admin-mark.png" alt={storeName} /></span>
      <div className="min-w-0 flex-1">
        <p className="font-display font-bold leading-tight truncate">{sectionTitle}</p>
        <p className="text-[11px] dc-muted leading-tight truncate">{storeName}</p>
      </div>
      <NotificationBell booked={notif.booked} pending={notif.pending} abandoned={notif.abandoned} lowStock={notif.lowStock} />
    </div>
  );
}
