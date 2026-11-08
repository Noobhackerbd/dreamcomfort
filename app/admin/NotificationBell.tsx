"use client";

// Admin notification bell — booked reminders (dismissible + Call) plus live
// summaries: pending orders, abandoned carts, low-stock products. Dismissals of
// booked reminders persist per device.

import { useEffect, useState } from "react";
import { Icon } from "@/components/admin/icons";
import type { BookedItem } from "./BookedReminders";

const KEY = "dc:dismissedBooked";
const keyOf = (b: BookedItem) => `${b.id}:${b.date}`;

export function NotificationBell({ booked, pending, abandoned, lowStock, noEntry = 0, returnsWaiting = 0 }: {
  booked: BookedItem[]; pending: number; abandoned: number; lowStock: number; noEntry?: number; returnsWaiting?: number;
}) {
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      const arr: string[] = raw ? JSON.parse(raw) : [];
      const present = new Set(booked.map(keyOf));
      const keep = arr.filter((k) => present.has(k));
      setDismissed(new Set(keep));
      if (keep.length !== arr.length) { try { localStorage.setItem(KEY, JSON.stringify(keep)); } catch {} }
    } catch {}
    setMounted(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function dismiss(b: BookedItem) {
    setDismissed((prev) => {
      const next = new Set(prev); next.add(keyOf(b));
      try { localStorage.setItem(KEY, JSON.stringify(Array.from(next))); } catch {}
      return next;
    });
  }

  const visibleBooked = mounted ? booked.filter((b) => !dismissed.has(keyOf(b))) : booked;
  const summaries = [
    noEntry > 0 && { icon: "truck", bg: "#fdeaea", fg: "#dc2626", title: "কুরিয়ার এন্ট্রি দেয়নি", sub: `${noEntry} টা পার্সেল দেওয়ার পরও Pickup requested`, href: "/admin/dispatch" },
    returnsWaiting > 0 && { icon: "refresh", bg: "#fdeede", fg: "#e08a2b", title: "রিটার্ন রিসিভ বাকি", sub: `${returnsWaiting} টা রিটার্ন পার্সেল স্ক্যান হয়নি`, href: "/admin/returns" },
    pending > 0 && { icon: "clock", bg: "#fdeede", fg: "#e08a2b", title: "Pending orders", sub: `${pending} awaiting confirmation`, href: "/admin/orders?status=pending" },
    abandoned > 0 && { icon: "abandoned", bg: "#fdeef4", fg: "#d6558a", title: "Abandoned carts", sub: `${abandoned} to follow up`, href: "/admin/abandoned" },
    lowStock > 0 && { icon: "box", bg: "#fdeaea", fg: "#dc2626", title: "Low stock", sub: `${lowStock} products running low`, href: "/admin/products" },
  ].filter(Boolean) as { icon: string; bg: string; fg: string; title: string; sub: string; href: string }[];

  const count = visibleBooked.length + summaries.length;

  return (
    <div className="relative shrink-0">
      <button onClick={() => setOpen((o) => !o)} className="relative h-10 w-10 rounded-xl dc-iconbtn flex items-center justify-center" aria-label="Notifications" title="Notifications">
        <Icon name="bell" className="h-5 w-5" />
        {count > 0 && (
          <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full text-white text-[10px] font-bold flex items-center justify-center" style={{ background: "var(--a-coral)" }}>{count}</span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-[60]" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-12 z-[61] w-[320px] max-w-[88vw] dc-card p-0 overflow-hidden" style={{ boxShadow: "var(--a-shadow-lg)" }}>
            <div className="flex items-center justify-between px-3.5 py-2.5 border-b" style={{ borderColor: "var(--a-border)" }}>
              <p className="font-bold text-sm">Notifications {count > 0 && <span style={{ color: "var(--a-coral)" }}>({count})</span>}</p>
              <button onClick={() => setOpen(false)} className="dc-act dc-act-sm" aria-label="Close"><Icon name="close" className="h-4 w-4" /></button>
            </div>

            <div className="max-h-[64vh] overflow-y-auto divide-y" style={{ borderColor: "var(--a-border)" }}>
              {count === 0 && <p className="text-sm dc-muted text-center py-8">You're all caught up 🎉</p>}

              {/* Summaries */}
              {summaries.map((s) => (
                <a key={s.title} href={s.href} className="flex items-center gap-3 p-3 hover:bg-[var(--a-surface-2)]">
                  <span className="h-9 w-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: s.bg, color: s.fg }}><Icon name={s.icon} className="h-[18px] w-[18px]" /></span>
                  <div className="min-w-0 flex-1"><p className="text-sm font-semibold truncate">{s.title}</p><p className="text-xs dc-muted truncate">{s.sub}</p></div>
                  <Icon name="chevronRight" className="h-4 w-4 dc-muted shrink-0" />
                </a>
              ))}

              {/* Booked reminders */}
              {visibleBooked.length > 0 && (
                <p className="px-3.5 pt-2.5 pb-1 text-[11px] font-semibold uppercase tracking-wide dc-muted">Booked reminders</p>
              )}
              {visibleBooked.map((b) => (
                <div key={b.id} className="flex items-start gap-2.5 p-3">
                  <a href={`/admin/orders/${b.id}`} className="flex-1 min-w-0">
                    <p className="text-sm truncate"><span className="font-bold" style={{ color: "var(--a-brand)" }}>{b.order_number}</span><span className="dc-muted"> · </span><span className="font-semibold">{b.name}</span></p>
                    <p className="text-xs dc-muted flex items-center gap-1 mt-0.5"><Icon name="phone" className="h-3 w-3" /> {b.phone}</p>
                    <span className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-semibold rounded-full px-2 py-0.5" style={b.overdue ? { background: "#fdeaea", color: "#dc2626" } : { background: "var(--a-warn-soft)", color: "var(--a-warn)" }}><Icon name="clock" className="h-3 w-3" /> {b.overdue ? "Overdue" : "Due"} {b.date}</span>
                  </a>
                  <a href={`tel:+${(b.phone || "").replace(/\D/g, "")}`} className="dc-act dc-act-sm shrink-0" style={{ background: "var(--a-coral-soft)", color: "var(--a-coral)" }} title="Call"><Icon name="phone" className="h-4 w-4" /></a>
                  <button onClick={() => dismiss(b)} className="dc-act dc-act-sm shrink-0" title="Dismiss"><Icon name="close" className="h-4 w-4" /></button>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
