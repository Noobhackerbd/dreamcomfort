"use client";

// components/admin/LiveVisitors.tsx — Social-Blade-style LIVE visitor counter.
// Admin-only. Updates INSTANTLY via Supabase Realtime broadcast (no polling) —
// each new visit pings the "live-visitors" channel. A local 1s timer just decays
// the rolling windows; a light refetch every 2 min corrects any drift. Renders
// nothing on the storefront, so customer page speed is untouched.

import { useEffect, useMemo, useRef, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/ssr-browser";
import { getLiveStats } from "@/app/admin/live-actions";

const MIN = 60 * 1000;

function useCountUp(target: number, ms = 600) {
  const [val, setVal] = useState(target);
  const from = useRef(target);
  const raf = useRef<number | null>(null);
  useEffect(() => {
    const start = performance.now();
    const a = from.current, b = target;
    if (a === b) return;
    function step(t: number) {
      const p = Math.min(1, (t - start) / ms);
      setVal(Math.round(a + (b - a) * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf.current = requestAnimationFrame(step);
      else from.current = b;
    }
    raf.current = requestAnimationFrame(step);
    return () => { if (raf.current) cancelAnimationFrame(raf.current); };
  }, [target, ms]);
  return val;
}

function Sparkline({ data }: { data: number[] }) {
  const W = 260, H = 46;
  const max = Math.max(1, ...data);
  const n = data.length;
  const pts = data.map((v, i) => [ (i / (n - 1)) * W, H - (v / max) * (H - 6) - 3 ]);
  const line = pts.map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} preserveAspectRatio="none" aria-hidden>
      <defs><linearGradient id="lv-fill" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#22c55e" stopOpacity="0.35" /><stop offset="100%" stopColor="#22c55e" stopOpacity="0" />
      </linearGradient></defs>
      <path d={`${line} L${W},${H} L0,${H} Z`} fill="url(#lv-fill)" />
      <path d={line} fill="none" stroke="#22c55e" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

export function LiveVisitors() {
  const [hits, setHits] = useState<number[]>([]);   // visit timestamps (epoch ms)
  const [today, setToday] = useState(0);
  const [live, setLive] = useState(false);
  const [, setTick] = useState(0);                  // forces window recompute

  // Seed + drift-correction refetch.
  useEffect(() => {
    let alive = true;
    async function seed() {
      try {
        const r = await getLiveStats();
        if (!alive) return;
        setHits(r.recent);
        setToday(r.today);
      } catch { /* ignore */ }
    }
    seed();
    const drift = setInterval(seed, 120000); // correct drift every 2 min
    return () => { alive = false; clearInterval(drift); };
  }, []);

  // Realtime: bump instantly on every new visit — no polling.
  useEffect(() => {
    const sb = getSupabaseBrowserClient();
    const ch = sb.channel("live-visitors")
      .on("broadcast", { event: "visit" }, (msg: any) => {
        const t = Number(msg?.payload?.t) || Date.now();
        setHits((h) => [...h, t]);
        setToday((x) => x + 1);
      })
      .subscribe((status: string) => setLive(status === "SUBSCRIBED"));
    return () => { sb.removeChannel(ch); };
  }, []);

  // Local clock: recompute the rolling windows once a second (no network).
  useEffect(() => {
    const id = setInterval(() => {
      setHits((h) => { const cut = Date.now() - 60 * MIN; return h.length && h[0] < cut ? h.filter((t) => t >= cut) : h; });
      setTick((n) => n + 1);
    }, 1000);
    return () => clearInterval(id);
  }, []);

  const { active5, active30, spark } = useMemo(() => {
    const now = Date.now();
    let a5 = 0, a30 = 0;
    const buckets = new Array(60).fill(0);
    for (const t of hits) {
      if (t >= now - 5 * MIN) a5++;
      if (t >= now - 30 * MIN) a30++;
      const m = Math.floor((now - t) / MIN);
      if (m >= 0 && m < 60) buckets[59 - m]++;
    }
    return { active5: a5, active30: a30, spark: buckets };
  }, [hits]);

  const shown = useCountUp(active5);

  return (
    <div className="dc-card p-4 sm:p-5 mb-4 overflow-hidden">
      <div className="flex items-center gap-2 mb-3">
        <span className="relative flex h-2.5 w-2.5">
          {live && <span className="absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75 animate-ping" />}
          <span className={"relative inline-flex h-2.5 w-2.5 rounded-full " + (live ? "bg-green-500" : "bg-gray-400")} />
        </span>
        <h2 className="font-display text-base font-bold">Live Visitors</h2>
        <span className="text-[11px] dc-muted ml-auto">{live ? "real-time · instant" : "connecting…"}</span>
      </div>

      <div className="flex items-end gap-4 sm:gap-6 flex-wrap">
        <div className="shrink-0">
          <div className="flex items-baseline gap-2">
            <span className="font-display text-4xl sm:text-5xl font-extrabold tabular-nums leading-none" style={{ color: "#16a34a" }}>{shown}</span>
            <span className="text-[13px] dc-muted">now</span>
          </div>
          <p className="text-[11px] dc-muted mt-1">active in the last 5 min</p>
        </div>

        <div className="flex-1 min-w-[160px]">
          <p className="text-[11px] dc-muted mb-0.5">visits · last 60 min</p>
          <Sparkline data={spark} />
        </div>

        <div className="flex gap-5 sm:gap-6 shrink-0">
          <div>
            <p className="font-display text-xl font-bold tabular-nums">{active30}</p>
            <p className="text-[11px] dc-muted">last 30 min</p>
          </div>
          <div>
            <p className="font-display text-xl font-bold tabular-nums">{today.toLocaleString()}</p>
            <p className="text-[11px] dc-muted">today</p>
          </div>
        </div>
      </div>
    </div>
  );
}
