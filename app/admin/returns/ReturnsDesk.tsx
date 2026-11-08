"use client";

import { useEffect, useRef, useState } from "react";
import { getReturns, scanReturn, forceReceive, markReceived, type ReturnRow, type ScanResult } from "./actions";

type Tab = "waiting" | "received" | "late";
type Data = Awaited<ReturnType<typeof getReturns>>;

const day = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", timeZone: "Asia/Dhaka" }) : "—";
const time = (iso: string | null) =>
  iso ? new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Dhaka" }) : "";
const daysSince = (iso: string | null) => (iso ? Math.floor((Date.now() - new Date(iso).getTime()) / 86400000) : 0);
const tel = (p: string) => `tel:+${(p || "").replace(/\D/g, "")}`;
const bdToday = () => new Date(Date.now() + 6 * 3600000).toISOString().slice(0, 10);
const isToday = (iso: string | null) => !!iso && new Date(new Date(iso).getTime() + 6 * 3600000).toISOString().slice(0, 10) === bdToday();

// ── Scan sounds ────────────────────────────────────────────────────────────
// One shared AudioContext, unlocked by the first tap/key on the page (browsers keep audio
// muted until then). A camera scan has no tap of its own, so without this it stays silent.
type Sound = "beep" | "ok" | "again" | "warn" | "bad";
let audio: AudioContext | null = null;
function audioCtx(): AudioContext | null {
  try {
    if (!audio) {
      const AC = (window.AudioContext || (window as any).webkitAudioContext);
      if (!AC) return null;
      audio = new AC();
    }
    if (audio.state === "suspended") audio.resume().catch(() => {});
    return audio;
  } catch { return null; }
}
const NOTES: Record<Sound, [number, number, number][]> = {
  // [frequency Hz, start s, length s]
  beep: [[2600, 0, 0.07]],                                  // scanner "read" chirp
  ok: [[880, 0, 0.12], [1320, 0.13, 0.22]],                 // received — rising ding-ding
  again: [[988, 0, 0.1], [988, 0.16, 0.1]],                 // already received — double beep
  warn: [[660, 0, 0.16], [440, 0.2, 0.26]],                 // not a return — falling
  bad: [[180, 0, 0.18], [180, 0.24, 0.32]],                 // not found / error — low buzz
};
function play(kind: Sound) {
  const ctx = audioCtx();
  try { if (navigator.vibrate) navigator.vibrate(kind === "ok" ? 80 : kind === "beep" ? 0 : [120, 80, 120]); } catch {}
  if (!ctx) return;
  const t0 = ctx.currentTime + 0.01;
  for (const [f, at, len] of NOTES[kind]) {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = kind === "bad" ? "square" : "sine";
    o.frequency.value = f;
    g.gain.setValueAtTime(0.0001, t0 + at);
    g.gain.exponentialRampToValueAtTime(kind === "bad" ? 0.12 : 0.25, t0 + at + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + at + len);
    o.connect(g); g.connect(ctx.destination);
    o.start(t0 + at); o.stop(t0 + at + len + 0.02);
  }
}
const SOUND_OF: Record<ScanResult["result"], Sound> = {
  received: "ok", already: "again", not_returned: "warn", not_found: "bad", error: "bad",
};

export function ReturnsDesk() {
  const [data, setData] = useState<Data | null>(null);
  const [tab, setTab] = useState<Tab>("waiting");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [last, setLast] = useState<ScanResult | null>(null);
  const [camOn, setCamOn] = useState(false);
  const [camErr, setCamErr] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const recent = useRef<Map<string, number>>(new Map());
  const busyRef = useRef(false);

  async function load() {
    try { setData(await getReturns()); } catch {}
  }
  useEffect(() => {
    load();
    const t = setInterval(load, 60000);
    // Unlock sound on the first tap / key press (USB scanners type keys, so they unlock it too).
    const unlock = () => { audioCtx(); };
    document.addEventListener("pointerdown", unlock);
    document.addEventListener("keydown", unlock);
    return () => {
      clearInterval(t);
      document.removeEventListener("pointerdown", unlock);
      document.removeEventListener("keydown", unlock);
    };
  }, []);

  async function submit(raw: string) {
    const c = raw.trim();
    if (!c || busyRef.current) return;
    // Ignore the same code read twice within 4 seconds (camera keeps seeing it).
    const seenAt = recent.current.get(c.toUpperCase());
    if (seenAt && Date.now() - seenAt < 4000) return;
    recent.current.set(c.toUpperCase(), Date.now());
    busyRef.current = true;
    setBusy(true);
    play("beep"); // instant feedback that the code was read
    try {
      const r = await scanReturn(c);
      setLast(r);
      play(SOUND_OF[r.result]);
      if (r.result === "received") load();
    } catch (e: any) {
      setLast({ result: "error", error: e?.message || "সমস্যা হয়েছে" });
      play("bad");
    } finally {
      busyRef.current = false;
      setBusy(false);
      setCode("");
      inputRef.current?.focus();
    }
  }

  async function force(o: ReturnRow) {
    setBusy(true);
    const r = await forceReceive(o.id);
    setBusy(false);
    if (r.ok) {
      setLast({ result: "received", order: { ...o, status: "returned", return_received_at: new Date().toISOString() } });
      play("ok");
      load();
    }
  }

  async function toggle(o: ReturnRow, received: boolean) {
    const r = await markReceived(o.id, received);
    if (r.ok) load();
  }

  // ── Camera scanning: BarcodeDetector where the browser has it, else jsQR. ──
  useEffect(() => {
    if (!camOn) return;
    let stream: MediaStream | null = null;
    let stop = false;
    let timer: any;
    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false });
        const v = videoRef.current!;
        v.srcObject = stream;
        await v.play();
        let detect: (v: HTMLVideoElement) => Promise<string | null>;
        const BD = (window as any).BarcodeDetector;
        if (BD) {
          const d = new BD({ formats: ["qr_code", "code_128"] });
          detect = async (el) => ((await d.detect(el))[0]?.rawValue as string) || null;
        } else {
          await loadJsQr();
          const canvas = document.createElement("canvas");
          const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
          detect = async (el) => {
            const w = el.videoWidth, h = el.videoHeight;
            if (!w || !h) return null;
            canvas.width = w; canvas.height = h;
            ctx.drawImage(el, 0, 0, w, h);
            const img = ctx.getImageData(0, 0, w, h);
            return (window as any).jsQR(img.data, w, h)?.data || null;
          };
        }
        const loop = async () => {
          if (stop) return;
          try {
            const val = await detect(v);
            if (val) await submit(val);
          } catch {}
          timer = setTimeout(loop, 250);
        };
        loop();
      } catch (e: any) {
        setCamErr(e?.name === "NotAllowedError" ? "ক্যামেরার অনুমতি দেওয়া হয়নি।" : "ক্যামেরা চালু করা যায়নি।");
        setCamOn(false);
      }
    })();
    return () => {
      stop = true;
      clearTimeout(timer);
      stream?.getTracks().forEach((t) => t.stop());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [camOn]);

  if (data && !data.ok && !data.migrated) {
    return (
      <div className="dc-card p-5 max-w-2xl text-sm">
        <p className="font-bold mb-2">ডাটাবেসে একটা ছোট আপডেট বাকি</p>
        <p className="dc-muted">Supabase → SQL Editor-এ <code>supabase-migration-returns.sql</code> ফাইলের লেখাগুলো চালান, তারপর এই পেজ রিফ্রেশ করুন।</p>
      </div>
    );
  }

  const waiting = data?.ok ? data.waiting : [];
  const received = data?.ok ? data.received : [];
  const late = data?.ok ? data.lateDelivered : [];
  const receivedToday = received.filter((r) => isToday(r.return_received_at)).length;
  const rows = tab === "waiting" ? waiting : tab === "received" ? received : late;

  return (
    <div className="rt">
      <style>{CSS}</style>

      {/* Scanner */}
      <section className="rt-scan">
        <div className="rt-scan-main">
          <label htmlFor="rt-code" className="rt-scan-label">লেবেলের QR স্ক্যান করুন</label>
          <form onSubmit={(e) => { e.preventDefault(); submit(code); }} className="rt-scan-row">
            <input
              id="rt-code" ref={inputRef} autoFocus value={code} onChange={(e) => setCode(e.target.value)}
              placeholder="DC-12785" autoComplete="off" className="rt-input" inputMode="text"
            />
            <button type="submit" className="rt-btn-dark" disabled={busy || !code.trim()}>রিসিভ</button>
            <button type="button" className="rt-btn-cam" onClick={() => { audioCtx(); setCamErr(""); setCamOn((v) => !v); }} aria-pressed={camOn}>
              {camOn ? "ক্যামেরা বন্ধ" : "📷 ক্যামেরা"}
            </button>
          </form>
          <p className="rt-help">স্ক্যানার মেশিন বা মোবাইল ক্যামেরা দুটোই চলবে। নম্বর হাতে লিখেও Enter চাপতে পারেন। রিসিভ হলে “টিং-টিং”, আগেই রিসিভ করা হলে দুটো বিপ, ভুল হলে মোটা “বাজ” শব্দ হবে।</p>
          {camErr && <p className="rt-err">{camErr}</p>}
          {camOn && <video ref={videoRef} className="rt-video" muted playsInline />}
        </div>
        <ResultCard r={last} onForce={force} busy={busy} />
      </section>

      {/* Counts */}
      <section className="rt-stats">
        <button className={`rt-stat ${tab === "waiting" ? "on" : ""}`} onClick={() => setTab("waiting")}>
          <span className="k">রিসিভ হয়নি</span><span className="v rt-num" style={{ color: waiting.length ? "var(--a-coral)" : "var(--a-ok)" }}>{waiting.length}</span>
        </button>
        <button className={`rt-stat ${tab === "received" ? "on" : ""}`} onClick={() => setTab("received")}>
          <span className="k">রিসিভ হয়েছে · আজ <b className="rt-num">{receivedToday}</b></span><span className="v rt-num" style={{ color: "var(--a-ok)" }}>{received.length}</span>
        </button>
        <button className={`rt-stat ${tab === "late" ? "on" : ""}`} onClick={() => setTab("late")}>
          <span className="k">রিটার্ন থেকে ডেলিভারড</span><span className="v rt-num" style={{ color: "var(--a-violet)" }}>{late.length}</span>
        </button>
      </section>

      {/* List */}
      <section className="dc-card rt-list">
        <div className="rt-list-h">
          <h2>{tab === "waiting" ? "রিটার্ন এসেছে, এখনো রিসিভ হয়নি" : tab === "received" ? "রিসিভ করা রিটার্ন (৩০ দিন)" : "রিটার্ন দেখাচ্ছিল, পরে ডেলিভারড হয়েছে"}</h2>
          {tab === "late" && <p>এগুলো রিটার্ন লিস্ট থেকে সরানো হয়েছে — কুরিয়ার এখন ডেলিভারড বলছে।</p>}
        </div>
        {!data ? (
          <p className="rt-empty">লোড হচ্ছে…</p>
        ) : rows.length === 0 ? (
          <p className="rt-empty">{tab === "waiting" ? "সব রিটার্ন রিসিভ হয়ে গেছে।" : "কিছু নেই।"}</p>
        ) : (
          <ul className="rt-rows">
            {rows.map((o) => (
              <li key={o.id} className="rt-r">
                <div className="min-w-0">
                  <div className="rt-r-top">
                    <a href={`/admin/orders/${o.id}`} className="rt-no rt-num">{o.order_number}</a>
                    {o.courier_flag === "late_return" && <span className="rt-badge coral">আগে ডেলিভারড দেখাচ্ছিল</span>}
                    {o.courier_flag === "late_delivered" && <span className="rt-badge violet">রিটার্ন → ডেলিভারড</span>}
                  </div>
                  <div className="rt-who">
                    {o.customer_name} · <a href={tel(o.customer_phone)} className="rt-num">{o.customer_phone}</a>
                  </div>
                  {o.items && <div className="rt-items">{o.items}</div>}
                </div>
                <div className="rt-r-side">
                  {tab === "waiting" && (
                    <>
                      <span className="rt-when">রিটার্ন {day(o.returned_at)}{daysSince(o.returned_at) > 0 && <b className="rt-num"> · {daysSince(o.returned_at)} দিন</b>}</span>
                      <button className="rt-btn-line" onClick={() => toggle(o, true)}>রিসিভ</button>
                    </>
                  )}
                  {tab === "received" && (
                    <>
                      <span className="rt-when ok">✓ {day(o.return_received_at)} <span className="rt-num">{time(o.return_received_at)}</span></span>
                      <button className="rt-btn-ghost" onClick={() => toggle(o, false)}>আনডু</button>
                    </>
                  )}
                  {tab === "late" && <span className="rt-when">ডেলিভারড {day(o.courier_flag_at)}</span>}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function ResultCard({ r, onForce, busy }: { r: ScanResult | null; onForce: (o: ReturnRow) => void; busy: boolean }) {
  if (!r) {
    return (
      <div className="rt-result idle">
        <span className="rt-result-ic">⌁</span>
        <p className="t">স্ক্যানের অপেক্ষায়</p>
        <p className="s">রিটার্ন পার্সেলের লেবেলে QR আছে — সেটা স্ক্যান করুন।</p>
      </div>
    );
  }
  if (r.result === "received") {
    return (
      <div className="rt-result ok">
        <span className="rt-result-ic">✓</span>
        <p className="t rt-num">{r.order.order_number} রিসিভ হয়েছে</p>
        <p className="s">{r.order.customer_name}{r.order.items ? " · " + r.order.items : ""}</p>
      </div>
    );
  }
  if (r.result === "already") {
    return (
      <div className="rt-result warn">
        <span className="rt-result-ic">!</span>
        <p className="t rt-num">{r.order.order_number} আগেই রিসিভ করা</p>
        <p className="s">রিসিভ হয়েছিল {day(r.order.return_received_at)} {time(r.order.return_received_at)}</p>
      </div>
    );
  }
  if (r.result === "not_returned") {
    return (
      <div className="rt-result warn">
        <span className="rt-result-ic">?</span>
        <p className="t rt-num">{r.order.order_number} রিটার্ন হিসেবে নেই</p>
        <p className="s">এখনকার অবস্থা: <b>{r.order.status}</b>{r.order.courier_last_raw ? ` · কুরিয়ার: ${r.order.courier_last_raw}` : ""}</p>
        <button className="rt-btn-dark sm" disabled={busy} onClick={() => onForce(r.order)}>তবুও রিটার্ন হিসেবে রিসিভ করুন</button>
      </div>
    );
  }
  if (r.result === "not_found") {
    return (
      <div className="rt-result bad">
        <span className="rt-result-ic">×</span>
        <p className="t">অর্ডার পাওয়া যায়নি</p>
        <p className="s rt-num">“{r.code}”</p>
      </div>
    );
  }
  return (
    <div className="rt-result bad">
      <span className="rt-result-ic">×</span>
      <p className="t">সমস্যা হয়েছে</p>
      <p className="s">{r.error}</p>
    </div>
  );
}

let jsQrLoading: Promise<void> | null = null;
function loadJsQr(): Promise<void> {
  if ((window as any).jsQR) return Promise.resolve();
  if (!jsQrLoading) {
    jsQrLoading = new Promise((res, rej) => {
      const s = document.createElement("script");
      s.src = "https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.js";
      s.onload = () => res();
      s.onerror = () => { jsQrLoading = null; rej(new Error("jsQR")); };
      document.head.appendChild(s);
    });
  }
  return jsQrLoading;
}

const CSS = `
.rt{display:grid;gap:16px;max-width:1080px}
.rt-num{font-family:var(--font-admin-latin),var(--font-admin-bn),system-ui,sans-serif;font-variant-numeric:tabular-nums}
.rt button:focus-visible,.rt a:focus-visible,.rt input:focus-visible{outline:2px solid var(--a-violet);outline-offset:2px}

.rt-scan{display:grid;grid-template-columns:1.3fr 1fr;gap:16px;align-items:stretch}
.rt-scan-main{background:var(--a-surface);border:1px solid var(--a-border);border-radius:18px;padding:18px;box-shadow:var(--a-shadow)}
.rt-scan-label{display:block;font-size:17px;font-weight:700;margin-bottom:10px}
.rt-scan-row{display:flex;gap:8px;flex-wrap:wrap}
.rt-input{flex:1 1 200px;min-width:0;border:1.5px solid var(--a-border);border-radius:12px;padding:12px 14px;font-size:20px;font-weight:700;letter-spacing:.02em;
  font-family:var(--font-admin-latin),system-ui,sans-serif;background:var(--a-surface-2);outline:none}
.rt-input:focus{border-color:var(--a-text);background:#fff}
.rt-btn-dark{background:var(--a-text);color:#fff;border-radius:12px;padding:0 18px;font-weight:700;font-size:15px;min-height:48px}
.rt-btn-dark:disabled{opacity:.4}
.rt-btn-dark.sm{min-height:36px;font-size:13px;padding:0 12px;margin-top:10px}
.rt-btn-cam{border:1.5px solid var(--a-border);border-radius:12px;padding:0 14px;font-weight:600;font-size:14px;min-height:48px;background:#fff}
.rt-btn-cam[aria-pressed="true"]{border-color:var(--a-text)}
.rt-help{font-size:12.5px;color:var(--a-muted);margin-top:10px}
.rt-err{font-size:13px;color:#dc2626;margin-top:6px}
.rt-video{margin-top:12px;width:100%;max-height:300px;object-fit:cover;border-radius:12px;background:#000}

.rt-result{border-radius:18px;padding:18px;display:flex;flex-direction:column;justify-content:center;min-height:150px;border:1px solid transparent}
.rt-result .t{font-size:18px;font-weight:700;margin-top:8px}
.rt-result .s{font-size:13.5px;margin-top:2px;opacity:.85}
.rt-result-ic{width:38px;height:38px;border-radius:12px;display:grid;place-items:center;font-size:20px;font-weight:800}
.rt-result.idle{background:var(--a-surface-2);border-color:var(--a-border);color:var(--a-muted)}
.rt-result.idle .rt-result-ic{background:#fff;color:var(--a-faint)}
.rt-result.ok{background:var(--a-ok-soft);border-color:#bfe6cd;color:#14532d}
.rt-result.ok .rt-result-ic{background:var(--a-ok);color:#fff}
.rt-result.warn{background:var(--a-warn-soft);border-color:#f6d9b5;color:#78350f}
.rt-result.warn .rt-result-ic{background:var(--a-warn);color:#fff}
.rt-result.bad{background:#fdeaea;border-color:#f6c9c9;color:#7f1d1d}
.rt-result.bad .rt-result-ic{background:#dc2626;color:#fff}

.rt-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}
.rt-stat{text-align:left;background:var(--a-surface);border:1px solid var(--a-border);border-radius:16px;padding:12px 16px;display:flex;flex-direction:column;gap:2px;box-shadow:var(--a-shadow)}
.rt-stat .k{font-size:13px;color:var(--a-muted)}
.rt-stat .v{font-size:28px;font-weight:800;line-height:1.1}
.rt-stat.on{border-color:var(--a-text);box-shadow:0 0 0 1px var(--a-text)}

.rt-list{padding:18px;border-radius:18px}
.rt-list-h h2{font-size:16px;font-weight:700;margin:0}
.rt-list-h p{font-size:12.5px;color:var(--a-muted);margin-top:2px}
.rt-empty{font-size:14px;color:var(--a-muted);margin-top:12px}
.rt-rows{list-style:none;margin:12px 0 0;padding:0;display:grid}
.rt-r{display:flex;justify-content:space-between;gap:12px;align-items:center;padding:12px 0;border-top:1px solid var(--a-border-2)}
.rt-r-top{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.rt-no{font-weight:800;font-size:15px;color:var(--a-text);text-decoration:none}
.rt-no:hover{text-decoration:underline}
.rt-who{font-size:13.5px;margin-top:1px}
.rt-who a{color:var(--a-brand);text-decoration:none}
.rt-items{font-size:12.5px;color:var(--a-muted);margin-top:1px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:520px}
.rt-badge{font-size:11px;font-weight:700;border-radius:999px;padding:2px 8px}
.rt-badge.coral{background:var(--a-coral-soft);color:#c2410c}
.rt-badge.violet{background:var(--a-violet-soft);color:var(--a-violet)}
.rt-r-side{display:flex;align-items:center;gap:10px;flex-shrink:0}
.rt-when{font-size:12.5px;color:var(--a-muted);white-space:nowrap}
.rt-when b{color:var(--a-coral)}
.rt-when.ok{color:var(--a-ok);font-weight:600}
.rt-btn-line{border:1.5px solid var(--a-text);border-radius:10px;padding:6px 12px;font-size:13px;font-weight:700;background:#fff}
.rt-btn-ghost{border:1px solid var(--a-border);border-radius:10px;padding:6px 10px;font-size:12.5px;color:var(--a-muted);background:#fff}

@media (max-width:820px){
  .rt-scan{grid-template-columns:1fr}
  .rt-stats{grid-template-columns:1fr 1fr 1fr;gap:8px}
  .rt-stat{padding:10px 12px}
  .rt-stat .v{font-size:22px}
  .rt-r{flex-direction:column;align-items:flex-start}
  .rt-items{max-width:100%}
}
`;
