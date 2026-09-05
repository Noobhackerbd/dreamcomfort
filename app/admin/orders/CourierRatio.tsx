"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/admin/icons";
import { getCourierRatio } from "./actions";
import type { CourierRatio } from "@/lib/bdcourier";

// The rate is fetched + SAVED on the SERVER. This chip renders the saved value when the
// page already has it; if not, it auto-loads ONCE via a server action (the API call and
// the DB caching happen on the server — the browser never calls bdcourier directly).
// A per-device localStorage copy avoids re-hitting the server on repeat views.

const FRESH_MS = 12 * 60 * 60 * 1000;
const lsKey = (p: string) => `dc:cratio:${p}`;
function readLS(phone: string): { data: CourierRatio; ts: number } | null {
  try { const raw = localStorage.getItem(lsKey(phone)); if (raw) { const o = JSON.parse(raw); if (o?.data && typeof o.ts === "number") return o; } } catch {}
  return null;
}
function writeLS(phone: string, data: CourierRatio, ts: number) {
  try { localStorage.setItem(lsKey(phone), JSON.stringify({ data, ts })); } catch {}
}

function agoLabel(ts: number): string {
  const m = Math.max(0, Math.round((Date.now() - ts) / 60000));
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.round(h / 24)}d ago`;
}

function band(ratio: number): { fg: string; bg: string; label: string } {
  if (ratio >= 85) return { fg: "#16a34a", bg: "#e7f6ec", label: "Excellent" };
  if (ratio >= 70) return { fg: "#4d7c0f", bg: "#eef6e0", label: "Good" };
  if (ratio >= 50) return { fg: "#b45309", bg: "#fef3e2", label: "Risky" };
  return { fg: "#dc2626", bg: "#fdeaea", label: "High risk" };
}

const COURIER_LABEL: Record<string, string> = {
  pathao: "Pathao", steadfast: "Steadfast", redx: "RedX", paperfly: "Paperfly",
  sundarban: "Sundarban", ecourier: "eCourier", parceldex: "Parceldex", carrybee: "CarryBee",
};
const nice = (k: string) => COURIER_LABEL[k.toLowerCase()] ?? k.charAt(0).toUpperCase() + k.slice(1);

export function CourierRatioChip({
  phone, enabled, data: initialData = null, checkedAt: initialCheckedAt = null,
}: {
  phone: string;
  enabled: boolean;
  data?: CourierRatio | null;
  checkedAt?: number | null;
}) {
  const [data, setData] = useState<CourierRatio | null>(initialData);
  const [checkedAt, setCheckedAt] = useState<number | null>(initialCheckedAt);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const [open, setOpen] = useState(false);
  const tried = useRef(false);

  // Keep in sync when the server passes fresh saved data (e.g. after a refresh).
  useEffect(() => { if (initialData) { setData(initialData); setCheckedAt(initialCheckedAt); } }, [initialData, initialCheckedAt]);

  /** Fetch via the server action (server-side API call + DB cache). force = re-check. */
  async function load(force: boolean) {
    if (busy || !phone) return;
    setBusy(true); setFailed(false);
    try {
      const res = await getCourierRatio(phone, force);
      if (res.ok) { setData(res.data); setCheckedAt(res.checkedAt); writeLS(phone, res.data, res.checkedAt); }
      else setFailed(true);
    } catch { setFailed(true); }
    setBusy(false);
  }

  // Auto-load ONCE when the page didn't already provide a saved rate.
  useEffect(() => {
    if (!enabled || !phone || data || tried.current) return;
    tried.current = true;
    const ls = readLS(phone);
    if (ls && Date.now() - ls.ts < FRESH_MS) { setData(ls.data); setCheckedAt(ls.ts); return; }
    void load(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, phone, data]);

  if (!enabled || !phone) return null;

  // No data yet — show a quiet auto-loading state (retry on tap if it failed).
  if (!data) {
    return (
      <button onClick={() => load(true)} disabled={busy} className="inline-flex items-center gap-1 text-[11px] font-semibold" style={{ color: "var(--a-faint)" }} title={failed ? "Couldn't load — tap to retry" : "Loading courier rate…"}>
        <Icon name="target" className={"h-3.5 w-3.5 " + (busy ? "animate-spin" : "")} /> {busy ? "Checking…" : failed ? "Retry rate" : "Checking…"}
      </button>
    );
  }

  const b = band(data.ratio);
  const noHistory = data.total === 0;

  return (
    <span className="relative inline-flex">
      <button
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-1.5 rounded-full px-2 py-[3px] text-[11px] font-bold"
        style={noHistory ? { background: "var(--a-surface-2)", color: "var(--a-faint)" } : { background: b.bg, color: b.fg }}
        title={`Courier success rate${checkedAt ? ` · checked ${agoLabel(checkedAt)}` : ""}`}
      >
        <Icon name="target" className={"h-3.5 w-3.5 " + (busy ? "animate-spin" : "")} />
        {noHistory ? "New — no history" : (
          <>
            <span>{data.ratio}%</span>
            <span style={{ opacity: 0.75, fontWeight: 600 }}>· {data.success}/{data.total}</span>
          </>
        )}
        <Icon name="chevronDown" className="h-3 w-3 opacity-60" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-8 z-40 w-64 dc-card p-3" style={{ boxShadow: "var(--a-shadow-lg)" }}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[13px] font-bold">Courier success rate</span>
              <button onClick={() => load(true)} disabled={busy} className="dc-act dc-act-sm" title="Re-check now">
                <Icon name="refresh" className={"h-3.5 w-3.5 " + (busy ? "animate-spin" : "")} />
              </button>
            </div>

            {noHistory ? (
              <p className="text-xs dc-muted">এই নম্বরে আগে কোনো কুরিয়ার পার্সেলের রেকর্ড নেই — নতুন কাস্টমার।</p>
            ) : (
              <>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[22px] font-extrabold leading-none" style={{ color: b.fg }}>{data.ratio}%</span>
                  <span className="text-[11px] font-semibold px-1.5 py-0.5 rounded-full" style={{ background: b.bg, color: b.fg }}>{b.label}</span>
                </div>
                <div className="h-2 rounded-full overflow-hidden mb-1" style={{ background: "#fdeaea" }}>
                  <div className="h-full rounded-full" style={{ width: `${data.ratio}%`, background: b.fg }} />
                </div>
                <p className="text-[11px] dc-muted mb-2.5">
                  মোট <b>{data.total}</b> · ডেলিভারি <b style={{ color: "#16a34a" }}>{data.success}</b> · বাতিল <b style={{ color: "#dc2626" }}>{data.cancelled}</b>
                </p>

                <div className="space-y-1.5">
                  {data.couriers.map((c) => {
                    const cb = band(c.ratio);
                    return (
                      <div key={c.name} className="flex items-center gap-2 text-[11px]">
                        <span className="w-16 shrink-0 font-semibold truncate">{nice(c.name)}</span>
                        <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: "#f0e3e3" }}>
                          <div className="h-full rounded-full" style={{ width: `${c.ratio}%`, background: cb.fg }} />
                        </div>
                        <span className="w-8 text-right tabular-nums font-semibold" style={{ color: cb.fg }}>{c.ratio}%</span>
                        <span className="w-10 text-right tabular-nums dc-muted">{c.success}/{c.total}</span>
                      </div>
                    );
                  })}
                </div>
              </>
            )}

            {checkedAt && <p className="mt-2 text-[10px] dc-muted">Saved {agoLabel(checkedAt)} · via bdcourier.com</p>}
          </div>
        </>
      )}
    </span>
  );
}
