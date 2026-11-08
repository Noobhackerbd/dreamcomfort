"use client";

// Shared label scanner for the admin (Returns, Dispatch): a text box that USB/Bluetooth
// barcode scanners type into, plus a phone/laptop camera reader (BarcodeDetector where the
// browser has it, else jsQR). Plays a sound for every read and for the result.

import { useEffect, useRef, useState } from "react";

// ── Sounds ────────────────────────────────────────────────────────────────
// One shared AudioContext, unlocked by the first tap/key on the page (browsers keep audio
// muted until then). A camera scan has no tap of its own, so without this it stays silent.
export type Sound = "beep" | "ok" | "again" | "warn" | "bad";
let audio: AudioContext | null = null;
export function audioCtx(): AudioContext | null {
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
  beep: [[2600, 0, 0.07]],                      // scanner "read" chirp
  ok: [[880, 0, 0.12], [1320, 0.13, 0.22]],     // done — rising ding-ding
  again: [[988, 0, 0.1], [988, 0.16, 0.1]],     // already done — double beep
  warn: [[660, 0, 0.16], [440, 0.2, 0.26]],     // can't do that — falling
  bad: [[180, 0, 0.18], [180, 0.24, 0.32]],     // not found / error — low buzz
};
export function play(kind: Sound) {
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

export function ScanBox({ label, help, buttonText, onScan }: {
  label: string;
  help: string;
  buttonText: string;
  /** Handle one scanned/typed code; return the sound for the result. */
  onScan: (code: string) => Promise<Sound>;
}) {
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [camOn, setCamOn] = useState(false);
  const [camErr, setCamErr] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const recent = useRef<Map<string, number>>(new Map());
  const busyRef = useRef(false);
  const onScanRef = useRef(onScan);
  onScanRef.current = onScan;

  useEffect(() => {
    // Unlock sound on the first tap / key press (USB scanners type keys, so they unlock it too).
    const unlock = () => { audioCtx(); };
    document.addEventListener("pointerdown", unlock);
    document.addEventListener("keydown", unlock);
    return () => {
      document.removeEventListener("pointerdown", unlock);
      document.removeEventListener("keydown", unlock);
    };
  }, []);

  async function submit(raw: string) {
    const c = raw.trim();
    if (!c || busyRef.current) return;
    // Ignore the same code read twice within 4 seconds (the camera keeps seeing it).
    const key = c.toUpperCase();
    const seenAt = recent.current.get(key);
    if (seenAt && Date.now() - seenAt < 4000) return;
    recent.current.set(key, Date.now());
    busyRef.current = true;
    setBusy(true);
    play("beep"); // instant feedback that the code was read
    try {
      play(await onScanRef.current(c));
    } catch {
      play("bad");
    } finally {
      busyRef.current = false;
      setBusy(false);
      setCode("");
      if (!camOn) inputRef.current?.focus();
    }
  }
  const submitRef = useRef(submit);
  submitRef.current = submit;

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
            if (val) await submitRef.current(val);
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
  }, [camOn]);

  return (
    <div className="sb">
      <style>{CSS}</style>
      <label htmlFor="sb-code" className="sb-label">{label}</label>
      <form onSubmit={(e) => { e.preventDefault(); submit(code); }} className="sb-row">
        <input
          id="sb-code" ref={inputRef} autoFocus value={code} onChange={(e) => setCode(e.target.value)}
          placeholder="DC-12785" autoComplete="off" className="sb-input"
        />
        <button type="submit" className="sb-go" disabled={busy || !code.trim()}>{buttonText}</button>
        <button type="button" className="sb-cam" onClick={() => { audioCtx(); setCamErr(""); setCamOn((v) => !v); }} aria-pressed={camOn}>
          {camOn ? "ক্যামেরা বন্ধ" : "📷 ক্যামেরা"}
        </button>
      </form>
      <p className="sb-help">{help}</p>
      {camErr && <p className="sb-err">{camErr}</p>}
      {camOn && <video ref={videoRef} className="sb-video" muted playsInline />}
    </div>
  );
}

const CSS = `
.sb{background:var(--a-surface);border:1px solid var(--a-border);border-radius:18px;padding:18px;box-shadow:var(--a-shadow)}
.sb-label{display:block;font-size:17px;font-weight:700;margin-bottom:10px}
.sb-row{display:flex;gap:8px;flex-wrap:wrap}
.sb-input{flex:1 1 200px;min-width:0;border:1.5px solid var(--a-border);border-radius:12px;padding:12px 14px;font-size:20px;font-weight:700;letter-spacing:.02em;
  font-family:var(--font-admin-latin),system-ui,sans-serif;background:var(--a-surface-2);outline:none}
.sb-input:focus{border-color:var(--a-text);background:#fff}
.sb-go{background:var(--a-text);color:#fff;border-radius:12px;padding:0 18px;font-weight:700;font-size:15px;min-height:48px}
.sb-go:disabled{opacity:.4}
.sb-cam{border:1.5px solid var(--a-border);border-radius:12px;padding:0 14px;font-weight:600;font-size:14px;min-height:48px;background:#fff}
.sb-cam[aria-pressed="true"]{border-color:var(--a-text)}
.sb button:focus-visible,.sb input:focus-visible{outline:2px solid var(--a-violet);outline-offset:2px}
.sb-help{font-size:12.5px;color:var(--a-muted);margin-top:10px}
.sb-err{font-size:13px;color:#dc2626;margin-top:6px}
.sb-video{margin-top:12px;width:100%;max-height:300px;object-fit:cover;border-radius:12px;background:#000}
`;
