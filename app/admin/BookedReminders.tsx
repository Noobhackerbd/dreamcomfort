"use client";

// Dashboard "Booked order reminders" card with per-row dismiss (X).
// Dismissed reminders are remembered per device (localStorage). When all are
// dismissed the whole card hides. A reminder reappears if its booked date changes.

import { useEffect, useState } from "react";
import { Icon } from "@/components/admin/icons";

export interface BookedItem {
  id: string;
  order_number: string;
  name: string;
  phone: string;
  date: string;
  total: number;
  overdue: boolean;
}

const KEY = "dc:dismissedBooked";
const keyOf = (b: BookedItem) => `${b.id}:${b.date}`;

export function BookedReminders({ items }: { items: BookedItem[] }) {
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      const arr: string[] = raw ? JSON.parse(raw) : [];
      // Prune keys no longer present so storage stays small.
      const present = new Set(items.map(keyOf));
      const keep = arr.filter((k) => present.has(k));
      setDismissed(new Set(keep));
      if (keep.length !== arr.length) { try { localStorage.setItem(KEY, JSON.stringify(keep)); } catch {} }
    } catch {}
    setMounted(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function dismiss(b: BookedItem) {
    const k = keyOf(b);
    setDismissed((prev) => {
      const next = new Set(prev); next.add(k);
      try { localStorage.setItem(KEY, JSON.stringify(Array.from(next))); } catch {}
      return next;
    });
  }

  const visible = mounted ? items.filter((b) => !dismissed.has(keyOf(b))) : items;
  if (visible.length === 0) return null;

  return (
    <div className="mb-6 dc-card p-4 sm:p-5">
      <div className="flex items-center gap-3 mb-4">
        <span className="h-11 w-11 rounded-2xl dc-coral flex items-center justify-center shrink-0"><Icon name="orders" className="h-5 w-5" /></span>
        <div>
          <h2 className="font-display font-bold text-base">Booked order reminders <span style={{ color: "var(--a-coral)" }}>({visible.length})</span></h2>
          <p className="text-[13px] dc-muted">Stay on top of pending follow-ups</p>
        </div>
      </div>
      <div className="space-y-2.5 border-t pt-3" style={{ borderColor: "var(--a-border)" }}>
        {visible.map((b) => (
          <div key={b.id} className="flex items-center gap-3 rounded-2xl border p-2.5 sm:p-3 transition hover:shadow-sm" style={{ borderColor: "var(--a-border)" }}>
            <a href={`/admin/orders/${b.id}`} className="flex items-center gap-3 min-w-0 flex-1">
              <span className="h-11 w-11 rounded-2xl flex items-center justify-center shrink-0" style={{ background: "var(--a-coral-soft)", color: "var(--a-coral)" }}><Icon name="products" className="h-5 w-5" /></span>
              <div className="min-w-0 flex-1">
                <p className="text-sm truncate">
                  <span className="font-bold" style={{ color: "var(--a-brand)" }}>{b.order_number}</span>
                  <span className="dc-muted"> · </span>
                  <span className="font-semibold">{b.name}</span>
                </p>
                <p className="text-xs dc-muted flex items-center gap-1 mt-0.5"><Icon name="phone" className="h-3 w-3" /> {b.phone}</p>
                <span className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-semibold rounded-full px-2 py-0.5" style={b.overdue ? { background: "#fdeaea", color: "#dc2626" } : { background: "var(--a-warn-soft)", color: "var(--a-warn)" }}>
                  <Icon name="clock" className="h-3 w-3" /> {b.overdue ? "Overdue" : "Due"} {b.date}
                </span>
              </div>
            </a>
            <a href={`tel:+${(b.phone || "").replace(/\D/g, "")}`} className="inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-sm font-semibold shrink-0" style={{ background: "var(--a-coral-soft)", color: "var(--a-coral)" }}>
              <Icon name="phone" className="h-4 w-4" /> Call
            </a>
            <button onClick={() => dismiss(b)} className="dc-act dc-act-sm shrink-0" title="Dismiss reminder" aria-label="Dismiss">
              <Icon name="close" className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
