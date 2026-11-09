"use client";

// Shared label scanner for the admin (Returns, Dispatch): a text box that USB/Bluetooth
// barcode scanners type into, plus a phone/laptop camera reader (BarcodeDetector where the
// browser has it, else jsQR). Plays a sound for every read and for the result.

import { useEffect, useRef, useState } from "react";
import { ScanCamera, type ScanOutcome } from "./ScanCamera";
export type { ScanOutcome } from "./ScanCamera";

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

export function ScanBox({ label, help, buttonText, camTitle, camSubtitle, successWord, todayLabel, todayCount, onScan }: {
  label: string;
  help: string;
  buttonText: string;
  camTitle: string;
  camSubtitle: string;
  successWord: string;
  todayLabel: string;
  todayCount: number;
  /** Handle one scanned/typed code; say how it went (sound + text for the camera view). */
  onScan: (code: string) => Promise<ScanOutcome>;
}) {
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [camOn, setCamOn] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
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

  /** One code → outcome. null when ignored (same code within 4s, or still busy). */
  async function submit(raw: string): Promise<ScanOutcome | null> {
    const c = raw.trim();
    if (!c || busyRef.current) return null;
    // Ignore the same code read twice within 4 seconds (the camera keeps seeing it).
    const key = c.toUpperCase();
    const seenAt = recent.current.get(key);
    if (seenAt && Date.now() - seenAt < 4000) return null;
    recent.current.set(key, Date.now());
    busyRef.current = true;
    setBusy(true);
    play("beep"); // instant feedback that the code was read
    let out: ScanOutcome;
    try {
      out = await onScanRef.current(c);
    } catch {
      out = { sound: "bad", title: "সমস্যা হয়েছে", detail: c };
    }
    play(out.sound);
    busyRef.current = false;
    setBusy(false);
    setCode("");
    return out;
  }

  return (
    <div className="sb">
      <style>{CSS}</style>
      <label htmlFor="sb-code" className="sb-label">{label}</label>
      <form onSubmit={(e) => { e.preventDefault(); submit(code).finally(() => inputRef.current?.focus()); }} className="sb-row">
        <input
          id="sb-code" ref={inputRef} autoFocus value={code} onChange={(e) => setCode(e.target.value)}
          placeholder="DC-12785" autoComplete="off" className="sb-input"
        />
        <button type="submit" className="sb-go" disabled={busy || !code.trim()}>{buttonText}</button>
        <button type="button" className="sb-cam" onClick={() => { audioCtx(); setCamOn(true); }}>
          📷 ক্যামেরা
        </button>
      </form>
      <p className="sb-help">{help}</p>
      {camOn && (
        <ScanCamera
          title={camTitle}
          subtitle={camSubtitle}
          successWord={successWord}
          todayLabel={todayLabel}
          todayCount={todayCount}
          submit={submit}
          onClose={() => { setCamOn(false); setTimeout(() => inputRef.current?.focus(), 50); }}
        />
      )}
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
.sb button:focus-visible,.sb input:focus-visible{outline:2px solid var(--a-violet);outline-offset:2px}
.sb-help{font-size:12.5px;color:var(--a-muted);margin-top:10px}
`;
