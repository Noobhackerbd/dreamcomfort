"use client";

import { useEffect, useRef, useState } from "react";
import { getPrintQueue, markLabelPrinted, getPrintedProductCounts, getPrintHistory, type PrintKind } from "../orders/actions";

type History = Awaited<ReturnType<typeof getPrintHistory>>["rows"];
interface ProdCount { name: string; image: string | null; count: number }
interface QueueOrder { id: string; order_number: string; tracking_id: string | null; customer_name: string | null }

const printKey = (o: QueueOrder) => o.id;
const KIND_LABEL: Record<PrintKind, string> = { auto: "প্রিন্ট", manual: "হাতে প্রিন্ট", reprint: "আবার প্রিন্ট" };

const timeNow = () => new Date().toLocaleTimeString("en-GB");
const hm = (iso: string | null) =>
  iso ? new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Dhaka" }) : "—";

export function PrintStation() {
  const [auto, setAuto] = useState(true);
  const [soundOn, setSoundOn] = useState(true);
  const [queue, setQueue] = useState<QueueOrder[]>([]);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [history, setHistory] = useState<History>([]);
  const [historySaved, setHistorySaved] = useState(true);
  const [lastCheck, setLastCheck] = useState<string>("—");
  const [products, setProducts] = useState<ProdCount[]>([]);
  const [totalLabels, setTotalLabels] = useState(0);
  const [scopedToday, setScopedToday] = useState(true);
  const [firstPrintAt, setFirstPrintAt] = useState<string | null>(null);
  const [current, setCurrent] = useState<QueueOrder | null>(null);
  const [lastPrinted, setLastPrinted] = useState<QueueOrder | null>(null);
  const printing = useRef(false);
  const processed = useRef<Set<string>>(new Set());
  const seenQueue = useRef<Set<string>>(new Set());
  const firstLoad = useRef(true);
  const autoRef = useRef(auto);
  autoRef.current = auto;
  const soundRef = useRef(soundOn);
  soundRef.current = soundOn;

  async function loadHistory() {
    try {
      const r = await getPrintHistory();
      if (r.ok) { setHistory(r.rows); setHistorySaved(r.persisted); }
    } catch {}
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
        setFirstPrintAt(res.firstPrintAt ?? null);
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

  /** Print one order's label, mark it printed and add it to today's history. */
  async function printOne(o: QueueOrder, how: "auto" | "manual" | "reprint" = "auto") {
    const kind: PrintKind = how;
    printing.current = true;
    processed.current.add(printKey(o));
    setCurrent(o);
    try {
      await printLabel(o.id);
      const r = await markLabelPrinted(o.id, kind);
      if (!r.ok) throw new Error(r.error);
      setLastPrinted(o);
      setQueue((q) => q.filter((x) => x.id !== o.id));
      loadCounts();
    } catch {
      processed.current.delete(printKey(o));
      try { await markLabelPrinted(o.id, kind, false); } catch {}
    } finally {
      setCurrent(null);
      printing.current = false;
      loadHistory();
    }
  }

  /** Reprint a label from today's history. */
  async function reprint(h: History[number]) {
    if (bulkBusy || printing.current) return;
    await printOne({ id: h.orderId, order_number: h.orderNumber, tracking_id: h.trackingId, customer_name: h.customerName }, "reprint");
  }

  /** Print every pending label right now (manual bulk). */
  async function printAll() {
    if (bulkBusy || printing.current) return;
    setBulkBusy(true);
    try {
      const res = await getPrintQueue();
      if (!res.ok) return;
      const pending = (res.orders as QueueOrder[]).filter((o) => !processed.current.has(printKey(o)));
      for (const o of pending) await printOne(o, "manual");
    } finally {
      setBulkBusy(false);
    }
  }

  /** "Print now" on one row of the queue. */
  async function printNow(o: QueueOrder) {
    if (bulkBusy || printing.current) return;
    await printOne(o, "manual");
  }

  async function tick() {
    setLastCheck(timeNow());
    if (printing.current || bulkBusy) return;
    const res = await getPrintQueue();
    if (!res.ok) return;
    const orders = res.orders as QueueOrder[];
    setQueue(orders);

    // Sound alert on any newly-arrived order (skip the very first load).
    const fresh = orders.filter((o) => !seenQueue.current.has(printKey(o)));
    orders.forEach((o) => seenQueue.current.add(printKey(o)));
    if (fresh.length && !firstLoad.current) beep();
    firstLoad.current = false;

    if (!autoRef.current) return;
    const next = orders.find((o) => !processed.current.has(printKey(o)));
    if (next) await printOne(next);
  }

  function toggleAuto() {
    setAuto(!autoRef.current);
  }

  useEffect(() => {
    const t = setInterval(tick, 6000);
    tick();
    loadCounts();
    loadHistory();
    const c = setInterval(() => { loadCounts(); loadHistory(); }, 30000);
    return () => { clearInterval(t); clearInterval(c); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pending = queue.length;
  const shown = current ?? lastPrinted;
  const max = Math.max(1, ...products.map((p) => p.count));
  const busy = bulkBusy || !!current;
  const failed = history.filter((h) => !h.ok).length;
  const reprints = history.filter((h) => h.ok && h.kind === "reprint").length;

  return (
    <div className={`ps ${auto ? "" : "ps-off"}`}>
      <style>{CSS}</style>

      {/* Printer console */}
      <section className="ps-console" aria-label="প্রিন্টারের অবস্থা">
        <div className="ps-state">
          <div className="ps-ledrow">
            <span className="ps-led" />
            <span>{auto ? "লাইভ — প্রতি ৬ সেকেন্ডে নতুন অর্ডার দেখছে" : "থেমে আছে — নিজে থেকে প্রিন্ট হবে না"}</span>
          </div>
          <p className="ps-big">
            {auto ? "প্রিন্টার চালু আছে" : "প্রিন্টার বন্ধ আছে"}
            <small>{auto ? "নতুন অর্ডার এলেই বিপ শব্দ হবে আর লেবেল বের হবে" : "চালু করলে লাইনের লেবেলগুলো একে একে প্রিন্ট হবে"}</small>
          </p>
          <div className="ps-controls">
            <button type="button" className="ps-switch" onClick={toggleAuto} aria-pressed={auto}>
              <span className="ps-track" />
              <span>{auto ? "চালু" : "বন্ধ"}</span>
            </button>
            <button type="button" className="ps-chip" onClick={() => setSoundOn((v) => !v)} aria-pressed={soundOn}>
              {soundOn ? "🔔 শব্দ চালু" : "🔕 শব্দ বন্ধ"}
            </button>
            <button type="button" className="ps-printall" onClick={printAll} disabled={busy || pending === 0}>
              🖨 {bulkBusy ? "প্রিন্ট হচ্ছে…" : <>সব প্রিন্ট করুন <span className="ps-num">({pending})</span></>}
            </button>
          </div>
          <div className="ps-meta">
            <span>অপেক্ষায় <b className="ps-num">{pending}</b></span>
            <span>শেষ চেক <b className="ps-num">{lastCheck}</b></span>
            {lastPrinted && <span>শেষ প্রিন্ট <b className="ps-num">{lastPrinted.order_number}</b></span>}
          </div>
        </div>

        <div className="ps-printer" aria-hidden="true">
          <div className="ps-body">
            <span className="ps-brandmark">DREAMCOMFORT</span>
            <span className="ps-dots"><i /><i /><i /></span>
          </div>
          <div className="ps-slot" />
          <div key={shown?.id ?? "idle"} className={`ps-label ${current ? "ps-feeding" : ""} ${shown ? "" : "ps-label-idle"}`}>
            <div className="ps-label-top"><span>CarryBee</span><span>{shown?.tracking_id ?? ""}</span></div>
            <div className="ps-label-no">{shown?.order_number ?? "DC-·····"}</div>
            <div className="ps-label-name">{shown ? (shown.customer_name || "—") : "নতুন অর্ডারের অপেক্ষায়"}</div>
            <div className="ps-barcode" />
          </div>
          <div className="ps-now">
            {current ? (<><span className="ps-spin" />এখন প্রিন্ট হচ্ছে: <b className="ps-num">{current.order_number}</b></>)
              : lastPrinted ? <>শেষ লেবেল: <b className="ps-num">{lastPrinted.order_number}</b></>
              : auto ? "নতুন অর্ডারের অপেক্ষায়…" : "প্রিন্ট বন্ধ"}
          </div>
        </div>
      </section>

      {/* Numbers */}
      <section className="ps-stats">
        <div className="ps-stat"><div className="k">{scopedToday ? "আজ প্রিন্ট হয়েছে" : "মোট প্রিন্ট"}</div><div className="v ps-num" style={{ color: "var(--a-violet)" }}>{totalLabels}</div><div className="s">লেবেল</div></div>
        <div className="ps-stat"><div className="k">প্রিন্টের অপেক্ষায়</div><div className="v ps-num" style={{ color: pending ? "var(--a-coral)" : "var(--a-text)" }}>{pending}</div><div className="s">অর্ডার</div></div>
        <div className="ps-stat"><div className="k">প্রিন্ট হয়নি</div><div className="v ps-num" style={{ color: failed ? "#dc2626" : "var(--a-ok)" }}>{failed}</div><div className="s">আজ{reprints ? ` · আবার প্রিন্ট ${reprints}` : ""}</div></div>
        <div className="ps-stat"><div className="k">আজ প্রথম প্রিন্ট</div><div className="v ps-num">{hm(firstPrintAt)}</div><div className="s">বাংলাদেশ সময়</div></div>
      </section>

      <div className="ps-grid">
        <div className="ps-col">
          {/* Queue */}
          <section className="dc-card ps-card">
            <div className="ps-card-h">
              <h2>প্রিন্টের লাইন</h2>
              <span className={`ps-pill ${pending ? "coral" : "ok"}`}>{pending ? `${pending} টি বাকি` : "সব প্রিন্ট হয়ে গেছে"}</span>
            </div>
            {pending === 0 ? (
              <p className="ps-empty">লাইনে কোনো অর্ডার নেই। অর্ডার কনফার্ম হয়ে CarryBee-তে গেলেই এখানে আসবে।</p>
            ) : (
              <ul className="ps-queue">
                {queue.map((o, i) => {
                  const isNow = current?.id === o.id;
                  return (
                    <li key={o.id} className={`ps-q ${isNow ? "next" : ""}`}>
                      <span className="pos ps-num">{isNow ? "▶" : i + 1}</span>
                      <div className="min-w-0">
                        <div className="no ps-num">{o.order_number}</div>
                        <div className="who">{o.customer_name || "—"} <span className="ps-num">· {o.tracking_id}</span></div>
                      </div>
                      {isNow ? <span className="ps-pill violet">প্রিন্ট হচ্ছে</span>
                        : <button type="button" onClick={() => printNow(o)} disabled={busy}>এখনই প্রিন্ট</button>}
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          {/* Product tally */}
          <section className="dc-card ps-card">
            <div className="ps-card-h">
              <h2>{scopedToday ? "আজ কোন প্রোডাক্ট কতটা" : "কোন প্রোডাক্ট কতটা (সব সময়)"}</h2>
              <span className="ps-hint ps-num">মোট {totalLabels} লেবেল</span>
            </div>
            {products.length === 0 ? (
              <p className="ps-empty">{scopedToday ? "আজ এখনো কোনো লেবেল প্রিন্ট হয়নি।" : "এখনো কোনো লেবেল প্রিন্ট হয়নি।"}</p>
            ) : (
              <div className="ps-tally">
                {products.map((p, i) => (
                  <div key={i} className="ps-t">
                    {p.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.image} alt="" />
                    ) : <span className="ps-noimg">📦</span>}
                    <div className="min-w-0">
                      <div className="name">{p.name}</div>
                      <div className="ps-bar"><i style={{ width: `${Math.round((p.count / max) * 100)}%` }} /></div>
                    </div>
                    <div className="cnt ps-num">{p.count}</div>
                  </div>
                ))}
              </div>
            )}
            {scopedToday && <p className="ps-reset">↺ প্রতি রাত ১২টায় (বাংলাদেশ সময়) শূন্য থেকে শুরু হয়</p>}
          </section>
        </div>

        {/* Receipt-style log */}
        <section className="ps-receipt">
          <h2>প্রিন্ট খাতা</h2>
          <div className="ps-sub ps-num">
            {new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric", timeZone: "Asia/Dhaka" })} · আজ <span className="ps-num">{history.filter((h) => h.ok).length}</span> বার প্রিন্ট
          </div>
          {!historySaved && <p className="ps-note">ডাটাবেস আপডেট বাকি — শুধু প্রিন্টগুলো দেখাচ্ছে, “আবার প্রিন্ট” ইতিহাস রাখা যাচ্ছে না।</p>}
          {history.length === 0 ? (
            <p className="ps-empty" style={{ textAlign: "center" }}>আজ এখনো কিছু প্রিন্ট হয়নি।</p>
          ) : (
            <ul className="ps-log">
              {history.map((h) => (
                <li key={h.id}>
                  <time className="ps-num">{hm(h.at)}</time>
                  <span className={`ic ${!h.ok ? "err" : h.kind === "reprint" ? "busy" : "ok"}`}>{!h.ok ? "!" : h.kind === "reprint" ? "↻" : "✓"}</span>
                  <span className="ps-log-main">
                    <b className="ps-num">{h.orderNumber}</b>
                    <span className="ps-log-sub">{h.ok ? KIND_LABEL[h.kind] : "প্রিন্ট হয়নি"}{h.customerName ? " · " + h.customerName : ""}</span>
                  </span>
                  <button type="button" className="ps-reprint" onClick={() => reprint(h)} disabled={busy} title="এই লেবেল আবার প্রিন্ট করুন">↻ আবার</button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

const CSS = `
.ps{--ps-ink:#1d1c22;--ps-ink-2:#2a2930;--ps-line:#3a3942;--ps-led:#3ddc84;--ps-paper:#fffdf7;display:grid;gap:18px;max-width:1120px}
.ps-num{font-family:var(--font-admin-latin),var(--font-admin-bn),system-ui,sans-serif;font-variant-numeric:tabular-nums}
.ps button:focus-visible{outline:2px solid #b9adff;outline-offset:2px}

.ps-console{background:var(--ps-ink);color:#f3f2f7;border-radius:22px;padding:22px;box-shadow:0 18px 40px -18px rgba(17,24,39,.35);
  display:grid;grid-template-columns:1.1fr 1fr;gap:22px;position:relative;overflow:hidden}
.ps-console::after{content:"";position:absolute;inset:0;pointer-events:none;background:radial-gradient(600px 220px at 85% -20%,rgba(109,90,230,.35),transparent 70%)}
.ps-state{display:flex;flex-direction:column;gap:16px;position:relative;z-index:1;min-width:0}
.ps-ledrow{display:flex;align-items:center;gap:10px;font-size:13px;color:#b9b7c6}
.ps-led{width:11px;height:11px;border-radius:50%;flex:0 0 11px;background:var(--ps-led);box-shadow:0 0 0 4px rgba(61,220,132,.16),0 0 14px var(--ps-led);animation:ps-pulse 1.6s ease-in-out infinite}
.ps-off .ps-led{background:#6b6a75;box-shadow:none;animation:none}
@keyframes ps-pulse{50%{box-shadow:0 0 0 7px rgba(61,220,132,.05),0 0 4px var(--ps-led)}}
.ps-big{font-size:38px;line-height:1.08;font-weight:700;letter-spacing:-.02em;margin:0}
.ps-big small{display:block;font-size:15px;font-weight:500;color:#b9b7c6;margin-top:8px;letter-spacing:0}
.ps-controls{display:flex;flex-wrap:wrap;gap:10px;align-items:center}
.ps-switch{display:inline-flex;align-items:center;gap:12px;background:var(--ps-ink-2);border:1px solid var(--ps-line);border-radius:14px;padding:10px 14px 10px 10px;color:#f3f2f7;font-size:15px;font-weight:600}
.ps-track{width:52px;height:30px;border-radius:999px;background:var(--a-ok);position:relative;transition:background .2s}
.ps-track::after{content:"";position:absolute;top:3px;left:25px;width:24px;height:24px;border-radius:50%;background:#fff;transition:left .2s}
.ps-off .ps-track{background:#55545e}.ps-off .ps-track::after{left:3px}
.ps-chip{display:inline-flex;align-items:center;gap:7px;border:1px solid var(--ps-line);color:#d9d7e4;border-radius:12px;padding:10px 13px;font-size:14px}
.ps-chip:hover,.ps-switch:hover{border-color:#57566a}
.ps-printall{display:inline-flex;align-items:center;gap:8px;background:var(--a-violet);color:#fff;border-radius:12px;padding:11px 16px;font-size:15px;font-weight:700;box-shadow:0 8px 20px -8px rgba(109,90,230,.7)}
.ps-printall:hover:not(:disabled){background:#5d4ad8}
.ps-printall:disabled{opacity:.45;box-shadow:none;cursor:not-allowed}
.ps-meta{display:flex;gap:18px;flex-wrap:wrap;font-size:13px;color:#a9a7b6;border-top:1px dashed var(--ps-line);padding-top:14px}
.ps-meta b{color:#f3f2f7;font-weight:600}

.ps-printer{position:relative;z-index:1;display:flex;flex-direction:column;align-items:center;min-height:250px}
.ps-body{width:min(100%,330px);height:74px;border-radius:18px 18px 10px 10px;background:linear-gradient(#34333c,#25242b);border:1px solid #44434d;display:flex;align-items:center;justify-content:space-between;padding:0 18px}
.ps-brandmark{font-size:11px;letter-spacing:.18em;color:#8c8a99;font-weight:700;font-family:var(--font-admin-latin),system-ui,sans-serif}
.ps-dots{display:flex;gap:6px}.ps-dots i{width:7px;height:7px;border-radius:50%;background:#55545e}
.ps-dots i:first-child{background:var(--ps-led);box-shadow:0 0 8px var(--ps-led)}
.ps-off .ps-dots i:first-child{background:#55545e;box-shadow:none}
.ps-slot{width:min(88%,290px);height:9px;background:#0d0d10;border-radius:0 0 6px 6px;margin-top:-1px}
.ps-label{width:min(80%,262px);background:var(--ps-paper);color:#1b1b1a;border-radius:0 0 8px 8px;padding:14px 16px 16px;box-shadow:0 14px 26px -12px rgba(0,0,0,.6);
  background-image:linear-gradient(to bottom,rgba(0,0,0,.05),transparent 14px)}
.ps-feeding{animation:ps-feed 2.4s cubic-bezier(.3,.7,.2,1) both}
.ps-label-idle{opacity:.35}
@keyframes ps-feed{0%{transform:translateY(-60%);clip-path:inset(60% 0 0 0)}100%{transform:none;clip-path:inset(0)}}
.ps-label-top{display:flex;justify-content:space-between;gap:8px;font-size:11px;color:#6b6b66;font-family:var(--font-admin-latin),system-ui,sans-serif}
.ps-label-no{font-size:22px;font-weight:800;letter-spacing:-.02em;margin:6px 0 2px;font-family:var(--font-admin-latin),system-ui,sans-serif}
.ps-label-name{font-size:14px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.ps-barcode{height:30px;margin-top:10px;background:repeating-linear-gradient(90deg,#1b1b1a 0 2px,transparent 2px 4px,#1b1b1a 4px 5px,transparent 5px 8px,#1b1b1a 8px 11px,transparent 11px 12px)}
.ps-now{margin-top:14px;font-size:13px;color:#b9b7c6;display:flex;align-items:center;gap:8px}
.ps-now b{color:#f3f2f7}
.ps-spin{width:12px;height:12px;border-radius:50%;border:2px solid #57566a;border-top-color:#b9adff;animation:ps-spin .9s linear infinite}
@keyframes ps-spin{to{transform:rotate(360deg)}}

.ps-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:12px}
.ps-stat{background:var(--a-surface);border:1px solid var(--a-border);border-radius:16px;padding:14px 16px;box-shadow:var(--a-shadow)}
.ps-stat .k{font-size:13px;color:var(--a-muted)}
.ps-stat .v{font-size:28px;font-weight:800;letter-spacing:-.02em;margin-top:2px;line-height:1.15}
.ps-stat .s{font-size:12px;color:var(--a-muted)}

.ps-grid{display:grid;grid-template-columns:1.25fr 1fr;gap:18px;align-items:start}
.ps-col{display:grid;gap:18px;min-width:0}
.ps-card{padding:18px;border-radius:18px}
.ps-card-h{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:12px}
.ps-card-h h2{margin:0;font-size:17px;font-weight:700}
.ps-hint{font-size:12px;color:var(--a-muted)}
.ps-empty{font-size:14px;color:var(--a-muted);margin:0}
.ps-pill{font-size:12px;font-weight:700;border-radius:999px;padding:3px 10px;white-space:nowrap}
.ps-pill.coral{background:var(--a-coral-soft);color:#c2410c}
.ps-pill.violet{background:var(--a-violet-soft);color:var(--a-violet)}
.ps-pill.ok{background:var(--a-ok-soft);color:var(--a-ok)}

.ps-queue{display:grid;gap:8px;margin:0;padding:0;list-style:none}
.ps-q{display:grid;grid-template-columns:auto 1fr auto;align-items:center;gap:12px;padding:10px 12px;border-radius:12px;background:var(--a-surface-2);border:1px solid transparent}
.ps-q.next{background:var(--a-violet-soft);border-color:#d9d1fb}
.ps-q .pos{width:30px;height:30px;border-radius:9px;background:#fff;display:grid;place-items:center;font-size:13px;font-weight:700;color:var(--a-muted)}
.ps-q.next .pos{background:var(--a-violet);color:#fff}
.ps-q .no{font-weight:700;font-size:14px}
.ps-q .who{font-size:13px;color:var(--a-muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.ps-q button{border:1px solid var(--a-border);background:#fff;border-radius:9px;padding:6px 10px;font-size:13px;white-space:nowrap}
.ps-q button:hover:not(:disabled){border-color:var(--a-faint)}
.ps-q button:disabled{opacity:.5;cursor:not-allowed}

.ps-tally{display:grid;gap:10px}
.ps-t{display:grid;grid-template-columns:52px 1fr auto;gap:12px;align-items:center}
.ps-t img,.ps-noimg{width:52px;height:52px;border-radius:12px;object-fit:cover;background:var(--a-surface-2);border:1px solid var(--a-border);display:grid;place-items:center;font-size:22px}
.ps-t .name{font-size:14px;font-weight:600;line-height:1.3;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.ps-bar{height:7px;border-radius:999px;background:var(--a-surface-2);margin-top:6px;overflow:hidden}
.ps-bar i{display:block;height:100%;border-radius:999px;background:var(--a-violet)}
.ps-t .cnt{font-size:24px;font-weight:800;color:var(--a-violet);min-width:40px;text-align:right}
.ps-reset{margin:12px 0 0;font-size:12px;color:var(--a-muted)}

.ps-receipt{background:var(--ps-paper);border:1px solid var(--a-border);border-radius:14px 14px 0 0;padding:18px 18px 26px;position:relative;box-shadow:var(--a-shadow);margin-bottom:10px}
.ps-receipt::after{content:"";position:absolute;left:0;right:0;bottom:-10px;height:10px;
  background:linear-gradient(-45deg,transparent 7px,var(--ps-paper) 0) 0 0/14px 10px,linear-gradient(45deg,transparent 7px,var(--ps-paper) 0) 0 0/14px 10px}
.ps-receipt h2{margin:0 0 4px;font-size:17px;text-align:center;font-weight:700}
.ps-sub{text-align:center;font-size:12px;color:var(--a-muted);border-bottom:1px dashed #d8d6cf;padding-bottom:10px;margin-bottom:6px}
.ps-log{list-style:none;margin:0;padding:0;font-size:13px;max-height:560px;overflow-y:auto}
.ps-log li{display:grid;grid-template-columns:44px 18px 1fr auto;gap:6px;padding:7px 0;border-bottom:1px dotted #e6e3da;align-items:center}
.ps-log-main{min-width:0;display:flex;flex-wrap:wrap;align-items:baseline;gap:4px 6px}
.ps-log-sub{font-size:12px;color:var(--a-muted);width:100%;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.ps-reprint{border:1px solid var(--a-border);background:#fff;border-radius:8px;padding:3px 8px;font-size:12px;white-space:nowrap}
.ps-reprint:hover:not(:disabled){border-color:var(--a-text)}
.ps-reprint:disabled{opacity:.4}
.ps-note{font-size:12px;color:#a16207;background:#fff7e6;border-radius:8px;padding:6px 8px;margin:6px 0}
.ps-log li:last-child{border-bottom:0}
.ps-log time{color:var(--a-muted);font-size:12px}
.ps-log .ic{font-weight:700}
.ic.ok{color:var(--a-ok)}.ic.new{color:var(--a-violet)}.ic.err{color:#dc2626}.ic.sys{color:var(--a-muted)}.ic.busy{color:var(--a-coral)}

@media (max-width:900px){
  .ps-console{grid-template-columns:1fr}
  .ps-printer{min-height:220px}
  .ps-grid{grid-template-columns:1fr}
  .ps-stats{grid-template-columns:repeat(2,1fr)}
  .ps-big{font-size:30px}
}
@media (prefers-reduced-motion:reduce){
  .ps-feeding,.ps-led,.ps-spin{animation:none}
}
`;
