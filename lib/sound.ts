// lib/sound.ts — premium, warm Web Audio sound effects (no asset files).
// All voices pass through a shared low-pass filter + soft envelopes for a
// gentle, expensive-feeling tone. Respects a persisted mute flag.
"use client";

let ctx: AudioContext | null = null;
let filter: BiquadFilterNode | null = null;
let master: GainNode | null = null;
let muted = false;

function ac(): AudioContext | null {
  if (typeof window === "undefined") return null;
  try {
    if (!ctx) {
      const AC = window.AudioContext || (window as any).webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 1.0;
      filter = ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.value = 3400; // clear but still warm
      filter.Q.value = 0.4;
      filter.connect(master);
      master.connect(ctx.destination);
    }
    if (ctx.state === "suspended") ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

export function setMuted(v: boolean) {
  muted = v;
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem("dc-muted", v ? "1" : "0");
    } catch {}
  }
}

export function isMuted(): boolean {
  if (typeof window !== "undefined") {
    try {
      return window.localStorage.getItem("dc-muted") === "1";
    } catch {}
  }
  return muted;
}

/** One soft voice with a gentle attack + smooth exponential release. */
function voice(freq: number, start: number, dur: number, gain = 0.05, type: OscillatorType = "sine") {
  const c = ac();
  if (!c || !filter || isMuted()) return;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, c.currentTime + start);
  const t0 = c.currentTime + start;
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.035); // soft swell
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur); // smooth tail
  osc.connect(g);
  g.connect(filter);
  osc.start(t0);
  osc.stop(t0 + dur + 0.05);
}

/** Soft glassy tick — toggle. */
export function playTick() {
  voice(1318.51, 0, 0.2, 0.05); // E6 bell
  voice(1975.53, 0.0, 0.12, 0.022); // shimmer
}

/** Bright, pleasant "select" chime — product choose / add. */
export function playSelect() {
  voice(783.99, 0, 0.26, 0.06); // G5
  voice(1046.5, 0.05, 0.3, 0.055); // C6 (rising fourth) — happy confirm
  voice(1567.98, 0.05, 0.14, 0.02); // sparkle
}

/** Warm marimba pop — quantity / add. */
export function playPop() {
  voice(659.25, 0, 0.24, 0.055); // E5
  voice(987.77, 0.03, 0.22, 0.04); // B5 (fifth)
}

/** Gentle rising confirm — button press. */
export function playConfirm() {
  voice(587.33, 0, 0.26, 0.05); // D5
  voice(739.99, 0.07, 0.28, 0.05); // F#5
  voice(880.0, 0.14, 0.34, 0.045); // A5
}

/** Soft, happy chime with a warm root — order placed. */
export function playSuccess() {
  voice(261.63, 0, 1.1, 0.028); // C4 warm root pad
  [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => voice(f, 0.06 + i * 0.13, 0.6, 0.05)); // C-E-G-C
  voice(1568.0, 0.55, 0.5, 0.02); // sparkle
}

/** Gentle "oops" — soft descending tones for a validation error. */
export function playError() {
  voice(392.0, 0, 0.24, 0.05); // G4
  voice(293.66, 0.15, 0.32, 0.05); // D4
}
