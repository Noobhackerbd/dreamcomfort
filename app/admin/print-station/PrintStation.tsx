"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/admin/icons";
import { getPrintQueue, markLabelPrinted, getPrintedProductCounts } from "../orders/actions";

interface LogRow { t: string; msg: string }
interface ProdCount { name: string; image: string | null; count: number }

export function PrintStation() {
  const [auto, setAuto] = useState(true);
  const [soundOn, setSoundOn] = useState(true);
  const [queueCount, setQueueCount] = useState(0);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [log, setLog] = useState<LogRow[]>([]);
  const [lastCheck, setLastCheck] = useState<string>("—");
  const [products, setProducts] = useState<ProdCount[]>([]);
  const [totalLabels, setTotalLabels] = useState(0);
  const [scopedToday, setScopedToday] = useState(true);
  const printing = useRef(false);
  const processed = useRef<Set<string>>(new Set());
  const seenQueue = useRef<Set<string>>(new Set());
  const firstLoad = useRef(true);
  const autoRef = useRef(auto);
  autoRef.current = auto;
  const soundRef = useRef(soundOn);
  soundRef.current = soundOn;

  function addLog(msg: string) {
    setLog((l) => [{ t: new Date().toLocaleTimeString("en-GB"), msg }, ...l].slice(0, 60));
  }

  /** Short WebAudio beep — no asset needed. */
  function beep() {
    if (!soundRef.current) return;
    try {
      const AC = (window.AudioContext || (window as any).webkitAudioContext);
      if (!AC) return;
      const ctx = new AC();
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = "sine"; o.frequency.value = 880;
      g.gain.value = 0.08;
      o.connect(g); g.connect(ctx.destination);
      o.start();
      o.frequency.setValueAtTime(880, ctx.currentTime);
      o.frequency.setValueAtTime(1320, ctx.currentTime + 0.12);
      o.stop(ctx.currentTime + 0.24);
      o.onended = () => { try { ctx.close(); } catch {} };
    } catch {}
  }

  async function loadCounts() {
    try {
      const res = await getPrintedProductCounts();
      if (res.ok) {
        setProducts(res.products as ProdCount[]);
        setTotalLabels(res.totalLabels);
        setScopedToday(res.scopedToday);
      }
    } catch {}
  }

  /** Load the label in a hidden iframe; the label page auto-prints itself on load. */
  function printLabel(id: string): Promise<void> {
    return new Promise((resolve) => {
      const iframe = document.createElement("iframe");
      Object.assign(iframe.style, { position: "fixed", right: "0", bottom: "0", width: "0", height: "0", border: "0", opacity: "0" });
      iframe.src = `/admin/orders/${id}/label`;
      let done = false;
      const finish = () => {
        if (done) return;
        done = true;
        setTimeout(() => { try { iframe.remove(); } catch {} resolve(); }, 4000);
      };
      iframe.onload = finish;          // label self-prints on load
      setTimeout(finish, 12000);       // safety timeout
      document.body.appendChild(iframe);
    });
  }

  /** Print every pending label right now (manual bulk). */
  async function printAll() {
    if (bulkBusy || printing.current) return;
    setBulkBusy(true);
    try {
      const res = await getPrintQueue();
      if (!res.ok) { setBulkBusy(false); return; }
      const pending = res.orders.filter((o: any) => !processed.current.has(o.id));
      for (const o of pending) {
        printing.current = true;
        processed.current.add(o.id);
        addLog(`🖨️ Printing: ${o.order_number} · ${o.tracking_id}`);
        try {
          await printLabel(o.id);
          await markLabelPrinted(o.id);
          addLog(`✓ Printed: ${o.order_number}`);
          loadCounts();
        } catch {
          addLog(`⚠️ Print failed: ${o.order_number}`);
          processed.current.delete(o.id);
        } finally {
          printing.current = false;
        }
      }
    } finally {
      setBulkBusy(false);
    }
  }

  async function tick() {
    setLastCheck(new Date().toLocaleTimeString("en-GB"));
    if (printing.current || bulkBusy) return;
    const res = await getPrintQueue();
    if (!res.ok) return;
    setQueueCount(res.orders.length);

    // Sound alert on any newly-arrived order (skip the very first load).
    const hasNew = res.orders.some((o: any) => !seenQueue.current.has(o.id));
    res.orders.forEach((o: any) => seenQueue.current.add(o.id));
    if (hasNew && !firstLoad.current) beep();
    firstLoad.current = false;

    if (!autoRef.current) return;
    const next = res.orders.find((o: any) => !processed.current.has(o.id));
    if (!next) return;
    printing.current = true;
    processed.current.add(next.id);
    addLog(`🖨️ Printing: ${next.order_number} · ${next.tracking_id}`);
    try {
      await printLabel(next.id);
      await markLabelPrinted(next.id);
      addLog(`✓ Printed: ${next.order_number}`);
      loadCounts();
    } catch {
      addLog(`⚠️ Print failed: ${next.order_number}`);
      processed.current.delete(next.id);
    } finally {
      printing.current = false;
    }
  }

  useEffect(() => {
    const t = setInterval(tick, 6000);
    tick();
    loadCounts();
    const c = setInterval(loadCounts, 30000);
    return () => { clearInterval(t); clearInterval(c); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="max-w-2xl">
      {/* Status */}
      <div className="dc-card p-5" style={auto ? { borderColor: "#bfe6cd", background: "#f0faf3" } : undefined}>
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="font-bold text-lg">{auto ? "🟢 Print station ON" : "⚪ Print station OFF"}</p>
            <p className="text-sm dc-muted mt-0.5">Keep this page open on the laptop with the label printer — new confirmed CarryBee labels print automatically.</p>
          </div>
          <button onClick={() => setAuto((v) => !v)} className="dc-btn dc-btn-solid shrink-0" style={auto ? { background: "#dc2626", borderColor: "#dc2626" } : { background: "#16a34a", borderColor: "#16a34a" }}>
            {auto ? "Turn off" : "Turn on"}
          </button>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm dc-muted">
          <span>Pending: <b className="text-[var(--a-text)]">{queueCount}</b></span>
          <span>Last check: <b className="text-[var(--a-text)]">{lastCheck}</b></span>
          <button onClick={() => setSoundOn((v) => !v)} className="inline-flex items-center gap-1 dc-chip" title="Sound on new label">
            <Icon name={soundOn ? "bell" : "close"} className="h-3.5 w-3.5" /> Sound {soundOn ? "on" : "off"}
          </button>
          <button onClick={printAll} disabled={bulkBusy || queueCount === 0} className="dc-btn ml-auto disabled:opacity-50" title="Print all pending labels now">
            <Icon name="print" className="h-4 w-4" /> {bulkBusy ? "Printing…" : `Print all (${queueCount})`}
          </button>
        </div>
      </div>

      {/* Printed product tally */}
      <div className="dc-card p-4 mt-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold text-[15px]">{scopedToday ? "Printed today" : "Printed (all time)"}</h2>
          <span className="text-sm dc-muted">Total labels: <b className="text-[var(--a-text)]">{totalLabels}</b></span>
        </div>
        {products.length === 0 ? (
          <p className="text-sm dc-muted">{scopedToday ? "No labels printed today yet." : "No labels printed yet."}</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {products.map((p, i) => (
              <div key={i} className="flex items-center gap-3 rounded-xl p-2" style={{ background: "var(--a-surface-2)", border: "1px solid var(--a-border)" }}>
                <div className="h-14 w-14 flex-shrink-0 rounded-lg overflow-hidden bg-white flex items-center justify-center" style={{ border: "1px solid var(--a-border)" }}>
                  {p.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.image} alt={p.name} className="h-full w-full object-cover" />
                  ) : (
                    <span className="text-2xl">📦</span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium leading-tight line-clamp-2">{p.name}</p>
                  <p className="mt-1 text-2xl font-bold tabular-nums leading-none" style={{ color: "var(--a-violet)" }}>{p.count}</p>
                </div>
              </div>
            ))}
          </div>
        )}
        {scopedToday && <p className="mt-3 text-xs dc-muted">Resets to zero every midnight (Bangladesh time).</p>}
      </div>

      {/* Print log */}
      <div className="dc-card p-4 mt-4">
        <h2 className="font-bold text-[15px] mb-2">Print log</h2>
        {log.length === 0 ? (
          <p className="text-sm dc-muted">Nothing printed yet. New confirmed orders will appear here.</p>
        ) : (
          <ul className="space-y-1 text-sm">
            {log.map((r, i) => (
              <li key={i} className="flex gap-2">
                <span className="dc-muted tabular-nums">{r.t}</span>
                <span>{r.msg}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
