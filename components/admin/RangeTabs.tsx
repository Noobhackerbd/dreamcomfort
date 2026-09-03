"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "./icons";

export function RangeTabs({ active, from, to }: { active: "1" | "7" | "30" | "custom"; from?: string; to?: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [f, setF] = useState(from ?? "");
  const [t, setT] = useState(to ?? "");

  const tab = (v: string, label: string, icon?: string) => {
    const on = active === v;
    return (
      <a
        href={`/admin?range=${v}`}
        className={"flex-none inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-[13px] font-semibold border transition " + (on ? "text-white" : "dc-muted hover:text-[color:var(--a-text)]")}
        style={on ? { background: "var(--a-violet)", borderColor: "var(--a-violet)" } : { background: "var(--a-surface)", borderColor: "var(--a-border)" }}
      >
        {icon && <Icon name={icon} className="h-3.5 w-3.5" />}
        {label}
      </a>
    );
  };

  return (
    <div className="dc-scroll-x flex items-center gap-2 overflow-x-auto pb-1 mb-4">
      {tab("1", "Today", "clock")}
      {tab("7", "7 Days")}
      {tab("30", "30 Days")}
      <div className="relative flex-none">
        <button
          onClick={() => setOpen((o) => !o)}
          className={"inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-[13px] font-semibold border transition " + (active === "custom" ? "text-white" : "dc-muted")}
          style={active === "custom" ? { background: "var(--a-violet)", borderColor: "var(--a-violet)" } : { background: "var(--a-surface)", borderColor: "var(--a-border)" }}
        >
          <Icon name="clock" className="h-3.5 w-3.5" />
          {active === "custom" && from ? `${from}…` : "Custom"}
          <Icon name="chevronDown" className="h-3 w-3 opacity-70" />
        </button>
        {open && (
          <>
            <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
            <div className="absolute left-0 top-11 z-40 w-64 dc-card p-3" style={{ boxShadow: "var(--a-shadow-lg)" }}>
              <p className="text-[11px] font-semibold dc-muted mb-2 uppercase tracking-wide">Custom range</p>
              <div className="grid grid-cols-2 gap-2 mb-3">
                <label className="text-[11px] dc-muted">From<input type="date" value={f} onChange={(e) => setF(e.target.value)} className="dc-input mt-0.5 !py-1.5 !px-2 text-xs" /></label>
                <label className="text-[11px] dc-muted">To<input type="date" value={t} onChange={(e) => setT(e.target.value)} className="dc-input mt-0.5 !py-1.5 !px-2 text-xs" /></label>
              </div>
              <button
                onClick={() => { if (f && t) router.push(`/admin?from=${f}&to=${t}`); setOpen(false); }}
                disabled={!f || !t}
                className="dc-btn w-full justify-center disabled:opacity-50"
                style={{ background: "var(--a-violet)", borderColor: "var(--a-violet)", color: "#fff" }}
              >
                Apply
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
