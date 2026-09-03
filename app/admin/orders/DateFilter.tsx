"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/admin/icons";

// Dates are handled in Bangladesh time (UTC+6) so "today" matches the shop's day.
function bdDay(offsetDays = 0): string {
  return new Date(Date.now() + 6 * 3600 * 1000 - offsetDays * 86400000).toISOString().slice(0, 10);
}

export function DateFilter({
  from,
  to,
  status,
  q,
}: {
  from?: string;
  to?: string;
  status?: string;
  q?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [f, setF] = useState(from ?? "");
  const [t, setT] = useState(to ?? "");

  const active = !!(from || to);

  function apply(nf: string, nt: string) {
    const sp = new URLSearchParams();
    if (status) sp.set("status", status);
    if (q) sp.set("q", q);
    if (nf) sp.set("from", nf);
    if (nt) sp.set("to", nt);
    setOpen(false);
    router.replace(`/admin/orders${sp.toString() ? `?${sp}` : ""}`);
  }
  function preset(days: number) { const day = bdDay(0); const start = days === 0 ? day : bdDay(days - 1); setF(start); setT(day); apply(start, day); }
  function thisMonth() { const day = bdDay(0); const start = day.slice(0, 8) + "01"; setF(start); setT(day); apply(start, day); }
  function clear() { setF(""); setT(""); apply("", ""); }

  const label = active ? (from && to ? (from === to ? from : `${from} → ${to}`) : from ? `from ${from}` : `to ${to}`) : "Date";

  return (
    <div className="relative shrink-0">
      <button
        onClick={() => setOpen((o) => !o)}
        className={"inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-[13px] font-medium whitespace-nowrap " + (active ? "dc-pill-active" : "dc-pill")}
      >
        <Icon name="clock" className="h-3.5 w-3.5" />
        <span className="max-w-[150px] truncate">{label}</span>
        {active ? (
          <span onClick={(e) => { e.stopPropagation(); clear(); }} className="opacity-80 hover:opacity-100"><Icon name="close" className="h-3.5 w-3.5" /></span>
        ) : (
          <Icon name="chevronDown" className="h-3 w-3 opacity-70" />
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-10 z-40 w-64 dc-card p-3" style={{ boxShadow: "var(--a-shadow-lg)" }}>
            <p className="text-[11px] font-semibold dc-muted mb-1.5 uppercase tracking-wide">Quick range</p>
            <div className="flex flex-wrap gap-1.5 mb-3">
              <button onClick={() => preset(0)} className="dc-pill rounded-full border px-2.5 py-1 text-xs font-medium">Today</button>
              <button onClick={() => preset(7)} className="dc-pill rounded-full border px-2.5 py-1 text-xs font-medium">Last 7 days</button>
              <button onClick={() => preset(30)} className="dc-pill rounded-full border px-2.5 py-1 text-xs font-medium">Last 30 days</button>
              <button onClick={thisMonth} className="dc-pill rounded-full border px-2.5 py-1 text-xs font-medium">This month</button>
            </div>
            <p className="text-[11px] font-semibold dc-muted mb-1.5 uppercase tracking-wide">Custom</p>
            <div className="grid grid-cols-2 gap-2 mb-3">
              <label className="text-[11px] dc-muted">From
                <input type="date" value={f} onChange={(e) => setF(e.target.value)} className="dc-input mt-0.5 !py-1.5 !px-2 text-xs" />
              </label>
              <label className="text-[11px] dc-muted">To
                <input type="date" value={t} onChange={(e) => setT(e.target.value)} className="dc-input mt-0.5 !py-1.5 !px-2 text-xs" />
              </label>
            </div>
            <div className="flex justify-between gap-2">
              <button onClick={clear} className="text-xs dc-muted hover:underline">Clear</button>
              <button onClick={() => apply(f, t)} className="dc-btn dc-btn-solid text-xs">Apply</button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
