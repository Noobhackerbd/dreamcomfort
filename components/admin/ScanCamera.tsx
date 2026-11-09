"use client";

// Full-screen camera scanner (Dispatch + Returns) — "Aurora" design.
//
//   • Square viewfinder with a violet→cyan glow and a sweeping light line; the rest of the
//     picture is dimmed.
//   • Aurora corner brackets jump onto the QR the moment it's seen (GPU transform, no React
//     render per frame). Success: they turn green and a ripple rings out. Not valid: the whole
//     camera view shakes and everything turns red.
//   • A glass card pops up at the bottom with an animated ✓ (or ✕ / ↺) and the order;
//     a glass sheet below keeps today's count, issues and the full scan log.
//
// Speed: BarcodeDetector (native) where available, else jsQR in a Web Worker on a
// down-scaled crop. One frame in flight, paced by requestVideoFrameCallback.

import { useEffect, useRef, useState } from "react";
import type { Sound } from "./ScanBox";

export type Tone = "ok" | "again" | "warn" | "bad";
export interface ScanOutcome {
  sound: Sound;
  title: string;   // e.g. "DC-12785 · Shipped"
  detail?: string; // e.g. customer name or the reason it failed
}
const toneOf = (s: Sound): Tone => (s === "ok" ? "ok" : s === "again" ? "again" : s === "warn" ? "warn" : "bad");
const isBad = (t?: Tone | "read") => t === "warn" || t === "bad";

interface LogItem { id: number; at: Date; code: string; tone: Tone; title: string; detail?: string }
type Pt = { x: number; y: number };
type Hit = { text: string; corners: Pt[] | null }; // corners in VIDEO pixel space

// ── jsQR worker (lazy, shared) ──────────────────────────────────────────────
let worker: Worker | null = null;
function getWorker(): Worker | null {
  if (worker) return worker;
  try {
    const src = `
      importScripts("https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.js");
      self.onmessage = (e) => {
        const { id, data, width, height } = e.data;
        let out = null;
        try {
          const r = jsQR(new Uint8ClampedArray(data), width, height, { inversionAttempts: "attemptBoth" });
          if (r && r.data) out = { text: r.data, corners: [r.location.topLeftCorner, r.location.topRightCorner, r.location.bottomRightCorner, r.location.bottomLeftCorner] };
        } catch (err) {}
        self.postMessage({ id, out });
      };`;
    worker = new Worker(URL.createObjectURL(new Blob([src], { type: "text/javascript" })));
  } catch { worker = null; }
  return worker;
}

export function ScanCamera({ title, subtitle, successWord, todayLabel, todayCount, onClose, submit }: {
  title: string;
  subtitle: string;
  successWord: string;  // "Shipped" / "রিসিভ"
  todayLabel: string;   // "আজ Shipped" / "আজ রিসিভ"
  todayCount: number;   // from the page; grows with this session's successes
  onClose: () => void;
  /** Handle one code. null = ignored (duplicate / busy). */
  submit: (code: string) => Promise<ScanOutcome | null>;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const lockRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<MediaStreamTrack | null>(null);
  const pausedUntil = useRef(0);
  const lastSeen = useRef(0);
  const startCount = useRef(todayCount);
  const [ready, setReady] = useState(false);
  const [err, setErr] = useState("");
  const [torch, setTorch] = useState<boolean | null>(null); // null = not supported
  const [phase, setPhase] = useState<{ tone: Tone | "read"; key: number } | null>(null);
  const [card, setCard] = useState<LogItem | null>(null);
  const [log, setLog] = useState<LogItem[]>([]);
  const [logOpen, setLogOpen] = useState(false);
  const submitRef = useRef(submit);
  submitRef.current = submit;

  // Lock body scroll while open; Esc closes.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => { document.body.style.overflow = prev; window.removeEventListener("keydown", onKey); };
  }, [onClose]);

  useEffect(() => {
    let stream: MediaStream | null = null;
    let stopped = false;
    let inFlight = false;
    let rafId = 0;
    let cardTimer: any, phaseTimer: any;
    const v = videoRef.current!;

    const toScreen = (p: Pt): Pt => {
      const vw = v.videoWidth, vh = v.videoHeight, cw = v.clientWidth, ch = v.clientHeight;
      const s = Math.max(cw / vw, ch / vh);
      return { x: p.x * s + (cw - vw * s) / 2, y: p.y * s + (ch - vh * s) / 2 };
    };
    // Brackets jump from the viewfinder onto the code (and drift back when it's gone).
    const placeLock = (corners: Pt[] | null) => {
      const el = lockRef.current;
      if (!el) return;
      if (!corners) {
        if (!el.classList.contains("on")) return;
        el.classList.remove("on");
        el.style.removeProperty("transform"); el.style.removeProperty("width"); el.style.removeProperty("height");
        return;
      }
      const pts = corners.map(toScreen);
      const xs = pts.map((p) => p.x), ys = pts.map((p) => p.y);
      const pad = 16;
      el.classList.add("on");
      el.style.transform = `translate3d(${Math.min(...xs) - pad}px, ${Math.min(...ys) - pad}px, 0)`;
      el.style.width = `${Math.max(...xs) - Math.min(...xs) + pad * 2}px`;
      el.style.height = `${Math.max(...ys) - Math.min(...ys) + pad * 2}px`;
    };
    const shake = () => {
      const st = stageRef.current;
      if (!st) return;
      st.classList.remove("shake");
      void st.offsetWidth; // restart the animation
      st.classList.add("shake");
    };

    async function onHit(hit: Hit) {
      placeLock(hit.corners);
      lastSeen.current = performance.now();
      if (performance.now() < pausedUntil.current) return;
      pausedUntil.current = performance.now() + 900;
      const key = Date.now();
      setPhase({ tone: "read", key });
      let out: ScanOutcome | null = null;
      try { out = await submitRef.current(hit.text); } catch { out = { sound: "bad", title: "সমস্যা হয়েছে" }; }
      if (!out) { setPhase(null); return; }
      const tone = toneOf(out.sound);
      if (isBad(tone)) shake();
      const item: LogItem = { id: key, at: new Date(), code: hit.text, tone, title: out.title, detail: out.detail };
      setPhase({ tone, key });
      setCard(item);
      setLog((l) => [item, ...l].slice(0, 80));
      pausedUntil.current = performance.now() + 1400;
      clearTimeout(phaseTimer); clearTimeout(cardTimer);
      phaseTimer = setTimeout(() => setPhase(null), 1500);
      cardTimer = setTimeout(() => setCard(null), 3000);
    }

    // ── engines ──
    let detectNative: ((el: HTMLVideoElement) => Promise<Hit | null>) | null = null;
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    let reqId = 0;
    const pending = new Map<number, (h: Hit | null) => void>();
    const detectWorker = (el: HTMLVideoElement): Promise<Hit | null> => {
      const w = getWorker();
      if (!w || !ctx) return Promise.resolve(null);
      const vw = el.videoWidth, vh = el.videoHeight;
      if (!vw || !vh) return Promise.resolve(null);
      const side = Math.min(vw, vh) * 0.82;
      const sx = (vw - side) / 2, sy = (vh - side) / 2;
      const out = Math.min(640, Math.round(side));
      canvas.width = out; canvas.height = out;
      ctx.drawImage(el, sx, sy, side, side, 0, 0, out, out);
      const img = ctx.getImageData(0, 0, out, out);
      const id = ++reqId;
      return new Promise((resolve) => {
        pending.set(id, (h) => {
          if (h?.corners) h.corners = h.corners.map((p) => ({ x: sx + (p.x * side) / out, y: sy + (p.y * side) / out }));
          resolve(h);
        });
        w.postMessage({ id, data: img.data.buffer, width: out, height: out }, [img.data.buffer]);
        setTimeout(() => { if (pending.has(id)) { pending.delete(id); resolve(null); } }, 1000);
      });
    };
    const wk = getWorker();
    if (wk) wk.onmessage = (e) => { const cb = pending.get(e.data.id); if (cb) { pending.delete(e.data.id); cb(e.data.out); } };

    const loop = () => {
      if (stopped) return;
      if (performance.now() - lastSeen.current > 500 && performance.now() > pausedUntil.current) placeLock(null);
      if (!inFlight && v.readyState >= 2) {
        inFlight = true;
        (detectNative ? detectNative(v) : detectWorker(v))
          .then((hit) => { if (hit && !stopped) return onHit(hit); })
          .catch(() => {})
          .finally(() => { inFlight = false; });
      }
      schedule();
    };
    const schedule = () => {
      const anyV = v as any;
      if (typeof anyV.requestVideoFrameCallback === "function") anyV.requestVideoFrameCallback(loop);
      else rafId = requestAnimationFrame(loop);
    };

    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: { facingMode: { ideal: "environment" }, width: { ideal: 1920 }, height: { ideal: 1080 }, frameRate: { ideal: 60, max: 120 } },
        });
        if (stopped) { stream.getTracks().forEach((t) => t.stop()); return; }
        const track = stream.getVideoTracks()[0];
        trackRef.current = track;
        try {
          const caps: any = track.getCapabilities?.() || {};
          if (caps.torch) setTorch(false);
          if (Array.isArray(caps.focusMode) && caps.focusMode.includes("continuous")) {
            await track.applyConstraints({ advanced: [{ focusMode: "continuous" } as any] });
          }
        } catch {}
        v.srcObject = stream;
        await v.play();
        const BD = (window as any).BarcodeDetector;
        if (BD) {
          try {
            const formats: string[] = (await BD.getSupportedFormats?.()) || ["qr_code"];
            const d = new BD({ formats: ["qr_code", "code_128"].filter((f) => formats.includes(f)) });
            detectNative = async (el) => {
              const r = (await d.detect(el))[0];
              return r ? { text: r.rawValue, corners: r.cornerPoints?.length ? r.cornerPoints : null } : null;
            };
          } catch { detectNative = null; }
        }
        setReady(true);
        schedule();
      } catch (e: any) {
        setErr(e?.name === "NotAllowedError" ? "ক্যামেরার অনুমতি দেওয়া হয়নি। ঠিকানা-বারের পাশে ক্যামেরা আইকনে চাপ দিয়ে অনুমতি দিন।" : "ক্যামেরা চালু করা যায়নি।");
      }
    })();

    return () => {
      stopped = true;
      cancelAnimationFrame(rafId);
      clearTimeout(phaseTimer); clearTimeout(cardTimer);
      stream?.getTracks().forEach((t) => t.stop());
      trackRef.current = null;
    };
  }, []);

  async function toggleTorch() {
    const t = trackRef.current;
    if (!t || torch === null) return;
    try { await t.applyConstraints({ advanced: [{ torch: !torch } as any] }); setTorch(!torch); } catch {}
  }

  const okCount = log.filter((l) => l.tone === "ok").length;
  const issueCount = log.filter((l) => isBad(l.tone)).length;
  const today = Math.max(todayCount, startCount.current + okCount);
  const time = (d: Date) => d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  const toneClass = phase ? `t-${phase.tone}` : "";

  return (
    <div className="au" role="dialog" aria-modal="true" aria-label={title}>
      <style>{CSS}</style>
      <div className={`au-stage ${toneClass}`} ref={stageRef}>
        <video ref={videoRef} className="au-video" muted playsInline autoPlay />

        {/* dimmed surround + aurora glow + sweep */}
        <div className={`au-finder ${ready ? "live" : ""}`} aria-hidden="true"><span className="au-sweep" /></div>

        {/* brackets: sit on the viewfinder, jump onto the QR */}
        <div className="au-lock" ref={lockRef} aria-hidden="true">
          <i className="c tl" /><i className="c tr" /><i className="c bl" /><i className="c br" />
          {phase && phase.tone !== "read" && <span key={phase.key} className="au-ripple"><i /><i /></span>}
        </div>

        {phase && phase.tone !== "read" && <div key={`f${phase.key}`} className="au-flash" aria-hidden="true" />}
      </div>

      {/* top bar */}
      <header className="au-top">
        <button className="au-btn" onClick={onClose} aria-label="বন্ধ করুন">✕</button>
        <div className="au-title">
          <p className="t">{title}</p>
          <p className="s">{err ? "ক্যামেরা বন্ধ" : ready ? subtitle : "ক্যামেরা চালু হচ্ছে…"}</p>
        </div>
        {torch !== null && <button className={`au-btn ${torch ? "on" : ""}`} onClick={toggleTorch} aria-pressed={torch} aria-label="ফ্ল্যাশলাইট">⚡</button>}
      </header>
      {err && <div className="au-err">{err}</div>}

      {/* glass result card */}
      {card && (
        <div key={card.id} className={`au-card ${card.tone}`} role="status" aria-live="assertive">
          {card.tone === "ok" && <span className="au-tag">{successWord}</span>}
          <span className="au-badge">
            <svg viewBox="0 0 24 24">
              {card.tone === "ok" && <path className="ck" d="M5 12.5l4.5 4.5L19 7.5" />}
              {isBad(card.tone) && (<><path className="x1" d="M7 7l10 10" /><path className="x2" d="M17 7L7 17" /></>)}
              {card.tone === "again" && <path className="ag" d="M17 8a6.5 6.5 0 1 0 1.6 5 M17 4v4h-4" />}
            </svg>
          </span>
          <span className="au-card-tx">
            <b>{card.title}</b>
            {card.detail && <small>{card.detail}</small>}
          </span>
        </div>
      )}

      {/* glass sheet: counters + log */}
      <footer className={`au-sheet ${logOpen ? "open" : ""}`}>
        <button className="au-sheet-h" onClick={() => setLogOpen((o) => !o)} aria-expanded={logOpen}>
          <span className="au-pill ok"><b key={today}>{today}</b> {todayLabel}</span>
          {issueCount > 0 && <span className="au-pill bad"><b>{issueCount}</b> সমস্যা</span>}
          <span className="au-chev">লগ {logOpen ? "▾" : "▴"}</span>
        </button>
        <ul className="au-log">
          {log.length === 0 && <li className="empty">এখনো কিছু স্ক্যান হয়নি — QR ফ্রেমের ভেতরে ধরুন।</li>}
          {log.map((l) => (
            <li key={l.id} className={l.tone}>
              <span className="dot" />
              <span className="m"><b>{l.title}</b>{l.detail && <small>{l.detail}</small>}</span>
              <time>{time(l.at)}</time>
            </li>
          ))}
        </ul>
      </footer>
    </div>
  );
}

const CSS = `
.au{--s:min(70vw,44vh,300px);--cy:42%;--vi:#8b7bff;--cy2:#38e1ff;--ok:#10b981;--ok2:#6ee7b7;--bad:#ef4444;--amber:#f59e0b;
  position:fixed;inset:0;z-index:1000;background:#000;color:#fff;overflow:hidden;
  font-family:var(--font-admin-bn),var(--font-admin-latin),system-ui,sans-serif;animation:au-in .3s cubic-bezier(.2,.8,.2,1)}
@keyframes au-in{from{opacity:0;transform:scale(1.04)}to{opacity:1;transform:none}}
.au button{font:inherit;color:inherit;background:none;border:0;cursor:pointer}
.au button:focus-visible{outline:2px solid var(--cy2);outline-offset:2px}
.au-stage{position:absolute;inset:0;will-change:transform}
.au-stage.shake{animation:au-shake .5s cubic-bezier(.36,.07,.19,.97)}
@keyframes au-shake{10%,90%{transform:translate3d(-2px,0,0)}20%,80%{transform:translate3d(5px,0,0)}30%,50%,70%{transform:translate3d(-11px,0,0)}40%,60%{transform:translate3d(11px,0,0)}}
.au-video{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;background:#000}

/* viewfinder */
.au-finder{position:absolute;left:50%;top:var(--cy);width:var(--s);height:var(--s);transform:translate(-50%,-50%);border-radius:30px;
  box-shadow:0 0 0 200vmax rgba(6,6,16,.56);transition:box-shadow .3s}
.au-finder::before{content:"";position:absolute;inset:-2px;border-radius:32px;padding:2px;opacity:.55;
  background:linear-gradient(135deg,var(--vi),var(--cy2));
  -webkit-mask:linear-gradient(#000 0 0) content-box,linear-gradient(#000 0 0);-webkit-mask-composite:xor;mask-composite:exclude}
.t-ok .au-finder{box-shadow:0 0 0 200vmax rgba(6,6,16,.4)}
.t-warn .au-finder,.t-bad .au-finder{box-shadow:0 0 0 200vmax rgba(90,6,14,.62)}
.au-sweep{position:absolute;left:7%;right:7%;top:8%;height:3px;border-radius:3px;opacity:0;
  background:linear-gradient(90deg,transparent,var(--cy2),#fff,var(--vi),transparent);box-shadow:0 0 22px 5px rgba(56,225,255,.45)}
.au-finder.live .au-sweep{opacity:1;animation:au-sweep 2.4s cubic-bezier(.45,0,.55,1) infinite}
.au-stage[class*="t-"] .au-sweep{opacity:0 !important}
@keyframes au-sweep{0%{top:8%}50%{top:90%}100%{top:8%}}

/* brackets — rest on the viewfinder, jump onto the code */
.au-lock{position:absolute;left:calc(50% - var(--s) / 2);top:calc(var(--cy) - var(--s) / 2);width:var(--s);height:var(--s);will-change:transform,width,height;
  transition:transform .16s cubic-bezier(.2,.9,.25,1.15),width .16s cubic-bezier(.2,.9,.25,1.15),height .16s cubic-bezier(.2,.9,.25,1.15),left .16s,top .16s}
.au-lock.on{left:0;top:0}
.au-lock .c{position:absolute;width:40px;height:40px;border:5px solid transparent;border-image:linear-gradient(135deg,var(--vi),var(--cy2)) 1;
  filter:drop-shadow(0 0 8px rgba(139,123,255,.85))}
.au-lock .tl{left:0;top:0;border-right:0;border-bottom:0}.au-lock .tr{right:0;top:0;border-left:0;border-bottom:0}
.au-lock .bl{left:0;bottom:0;border-right:0;border-top:0}.au-lock .br{right:0;bottom:0;border-left:0;border-top:0}
.au-finder.live ~ .au-lock:not(.on) .c{animation:au-breathe 2.2s ease-in-out infinite}
@keyframes au-breathe{50%{transform:scale(.9)}}
.au-lock.on .c{width:30px;height:30px}
.t-read .au-lock .c{border-image:linear-gradient(135deg,#fff,#c7f9ff) 1;filter:drop-shadow(0 0 10px rgba(255,255,255,.9))}
.t-ok .au-lock .c{border-image:linear-gradient(135deg,var(--ok),var(--ok2)) 1;filter:drop-shadow(0 0 14px rgba(16,185,129,.95))}
.t-again .au-lock .c{border-image:linear-gradient(135deg,var(--amber),#fde68a) 1;filter:drop-shadow(0 0 12px rgba(245,158,11,.9))}
.t-warn .au-lock .c,.t-bad .au-lock .c{border-image:linear-gradient(135deg,var(--bad),#fca5a5) 1;filter:drop-shadow(0 0 14px rgba(239,68,68,.95))}
.au-ripple{position:absolute;inset:0;pointer-events:none}
.au-ripple i{position:absolute;inset:0;border-radius:22px;border:3px solid var(--ok);opacity:0;animation:au-rip .75s ease-out}
.au-ripple i:nth-child(2){animation-delay:.2s}
.t-again .au-ripple i{border-color:var(--amber)}.t-warn .au-ripple i,.t-bad .au-ripple i{border-color:var(--bad)}
@keyframes au-rip{0%{opacity:.95;transform:scale(1)}100%{opacity:0;transform:scale(1.7)}}
.au-flash{position:absolute;inset:0;pointer-events:none;animation:au-flash .75s ease-out forwards}
.t-ok .au-flash{background:radial-gradient(circle at 50% var(--cy),rgba(16,185,129,.45),transparent 62%)}
.t-again .au-flash{background:radial-gradient(circle at 50% var(--cy),rgba(245,158,11,.38),transparent 62%)}
.t-warn .au-flash,.t-bad .au-flash{background:rgba(239,68,68,.32)}
@keyframes au-flash{from{opacity:1}to{opacity:0}}

/* top */
.au-top{position:absolute;left:0;right:0;top:0;z-index:3;display:flex;align-items:center;gap:12px;
  padding:calc(env(safe-area-inset-top) + 12px) 14px 26px;background:linear-gradient(rgba(0,0,0,.72),transparent)}
.au-btn{width:44px;height:44px;flex:0 0 44px;border-radius:15px;display:grid;place-items:center;font-size:17px;
  background:rgba(255,255,255,.15);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px)}
.au-btn.on{background:#fde047;color:#111}
.au-title{flex:1;min-width:0}
.au-title .t{font-size:17px;font-weight:700}
.au-title .s{font-size:12.5px;color:rgba(255,255,255,.75);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.au-err{position:absolute;left:16px;right:16px;top:42%;transform:translateY(-50%);z-index:4;background:rgba(239,68,68,.94);border-radius:16px;padding:16px;font-size:14px;text-align:center}

/* glass result card */
.au-card{position:absolute;left:50%;bottom:calc(env(safe-area-inset-bottom) + 108px);z-index:3;width:min(92vw,420px);transform:translateX(-50%);
  display:flex;align-items:center;gap:13px;padding:13px 15px;border-radius:22px;
  background:rgba(16,16,24,.78);backdrop-filter:blur(18px) saturate(1.4);-webkit-backdrop-filter:blur(18px) saturate(1.4);
  border:1px solid rgba(16,185,129,.55);box-shadow:0 22px 50px -20px rgba(0,0,0,.85);
  animation:au-pop .45s cubic-bezier(.18,1.3,.4,1) both, au-fade .4s ease-in 2.55s forwards}
.au-card.again{border-color:rgba(245,158,11,.6)}
.au-card.warn,.au-card.bad{border-color:rgba(239,68,68,.7);background:rgba(40,10,14,.82)}
@keyframes au-pop{from{opacity:0;transform:translate(-50%,26px) scale(.92)}to{opacity:1;transform:translate(-50%,0) scale(1)}}
@keyframes au-fade{to{opacity:0;transform:translate(-50%,10px)}}
.au-tag{position:absolute;right:14px;top:-11px;background:var(--ok);font-size:10.5px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;border-radius:99px;padding:3px 10px;
  animation:au-slide .5s .15s cubic-bezier(.2,.9,.3,1.3) both}
@keyframes au-slide{from{opacity:0;transform:translateX(-28px)}to{opacity:1;transform:none}}
.au-badge{width:48px;height:48px;flex:0 0 48px;border-radius:50%;display:grid;place-items:center;background:var(--ok);box-shadow:0 6px 20px rgba(16,185,129,.5);
  animation:au-badge .4s .05s cubic-bezier(.2,1.6,.4,1) both}
.au-card.again .au-badge{background:var(--amber);box-shadow:0 6px 20px rgba(245,158,11,.45)}
.au-card.warn .au-badge,.au-card.bad .au-badge{background:var(--bad);box-shadow:0 6px 20px rgba(239,68,68,.55)}
@keyframes au-badge{from{transform:scale(0) rotate(-30deg)}to{transform:none}}
.au-badge svg{width:28px;height:28px}
.au-badge path{fill:none;stroke:#fff;stroke-width:3.2;stroke-linecap:round;stroke-linejoin:round;stroke-dasharray:30;stroke-dashoffset:30}
.au-badge .ck{animation:au-draw .32s .2s ease-out forwards}
.au-badge .x1{animation:au-draw .2s .18s ease-out forwards}.au-badge .x2{animation:au-draw .2s .32s ease-out forwards}
.au-badge .ag{stroke-dasharray:60;stroke-dashoffset:60;animation:au-draw .45s .15s ease-out forwards}
@keyframes au-draw{to{stroke-dashoffset:0}}
.au-card-tx{display:flex;flex-direction:column;min-width:0}
.au-card-tx b{font-size:17px;font-weight:800;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-family:var(--font-admin-latin),var(--font-admin-bn),system-ui,sans-serif}
.au-card-tx small{font-size:13px;color:rgba(255,255,255,.75);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.au-card.warn .au-card-tx small,.au-card.bad .au-card-tx small{color:#fecaca}

/* glass sheet */
.au-sheet{position:absolute;left:0;right:0;bottom:0;z-index:3;max-height:calc(env(safe-area-inset-bottom) + 92px);overflow:hidden;
  padding-bottom:env(safe-area-inset-bottom);background:rgba(14,14,20,.74);backdrop-filter:blur(20px) saturate(1.3);-webkit-backdrop-filter:blur(20px) saturate(1.3);
  border-top:1px solid rgba(255,255,255,.1);border-radius:24px 24px 0 0;transition:max-height .38s cubic-bezier(.2,.8,.2,1)}
.au-sheet.open{max-height:62vh}
.au-sheet-h{display:flex;align-items:center;gap:8px;width:100%;padding:14px 16px 8px;text-align:left}
.au-pill{font-size:13px;border-radius:999px;padding:5px 12px;background:rgba(255,255,255,.12)}
.au-pill b{display:inline-block;font-size:15px;font-family:var(--font-admin-latin),system-ui,sans-serif}
.au-pill.ok{background:rgba(16,185,129,.22);color:#a7f3d0}
.au-pill.ok b{animation:au-bump .45s cubic-bezier(.2,1.6,.4,1)}
@keyframes au-bump{0%{transform:scale(1.5)}100%{transform:none}}
.au-pill.bad{background:rgba(239,68,68,.22);color:#fecaca}
.au-chev{margin-left:auto;font-size:12.5px;color:rgba(255,255,255,.7)}
.au-log{list-style:none;margin:0;padding:0 12px 12px;overflow-y:auto;max-height:calc(62vh - 56px)}
.au-sheet:not(.open) .au-log li:nth-child(n+2){display:none}
.au-log li{display:flex;align-items:center;gap:10px;padding:9px 6px;border-top:1px solid rgba(255,255,255,.07);animation:au-row .3s ease-out}
@keyframes au-row{from{opacity:0;transform:translateY(-6px)}to{opacity:1;transform:none}}
.au-log .dot{width:9px;height:9px;flex:0 0 9px;border-radius:50%;background:#9ca3af}
.au-log .ok .dot{background:var(--ok)}.au-log .again .dot{background:var(--amber)}.au-log .warn .dot,.au-log .bad .dot{background:var(--bad)}
.au-log .m{display:flex;flex-direction:column;min-width:0;flex:1}
.au-log .m b{font-size:14px;font-family:var(--font-admin-latin),var(--font-admin-bn),system-ui,sans-serif}
.au-log .m small{font-size:12px;color:rgba(255,255,255,.6);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.au-log time{font-size:11.5px;color:rgba(255,255,255,.5);font-family:var(--font-admin-latin),system-ui,sans-serif}
.au-log .empty{font-size:13px;color:rgba(255,255,255,.6);border:0}

@media (prefers-reduced-motion:reduce){
  .au,.au-stage.shake,.au-sweep,.au-lock .c,.au-ripple i,.au-flash,.au-card,.au-card *,.au-log li,.au-pill b{animation:none !important}
  .au-badge path{stroke-dashoffset:0}
  .au-lock{transition:none}
}
`;
