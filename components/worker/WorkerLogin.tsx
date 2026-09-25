"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { loginWorker } from "@/app/worker/panel-actions";

export function WorkerLogin() {
  const router = useRouter();
  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(value: string) {
    setBusy(true); setErr(null);
    const res = await loginWorker(value);
    setBusy(false);
    if (!res.ok) { setErr(res.error ?? "ভুল পিন।"); setPin(""); return; }
    router.refresh();
  }

  function press(d: string) {
    if (busy) return;
    setErr(null);
    setPin((p) => {
      const next = (p + d).slice(0, 8);
      if (next.length >= 4 && d !== "") { /* allow manual submit */ }
      return next;
    });
  }

  const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9"];

  return (
    <div className="min-h-[80vh] grid place-items-center px-4 py-8">
      <div className="w-full max-w-[320px] text-center">
        <div className="mx-auto mb-3 h-14 w-14 rounded-2xl grid place-items-center text-white bg-gradient-to-br from-brand to-brand-dark shadow-[0_8px_20px_-6px_rgba(47,144,204,0.6)]">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="h-7 w-7"><rect x="4" y="10" width="16" height="10" rx="2" /><path d="M8 10V7a4 4 0 1 1 8 0v3" /></svg>
        </div>
        <h1 className="font-display text-xl font-bold text-gray-900">কর্মী প্যানেল</h1>
        <p className="text-[13px] text-gray-500 mt-1 mb-5">আপনার পিন দিয়ে প্রবেশ করুন</p>

        {/* PIN dots */}
        <div className="flex items-center justify-center gap-2.5 mb-1 h-4">
          {Array.from({ length: Math.max(4, pin.length) }).map((_, i) => (
            <span key={i} className={"h-2.5 w-2.5 rounded-full transition-colors " + (i < pin.length ? "bg-brand" : "bg-black/15")} />
          ))}
        </div>
        <p className="h-5 text-[13px] text-red-600">{err || ""}</p>

        {/* Keypad */}
        <div className="grid grid-cols-3 gap-2.5 mt-2">
          {keys.map((k) => (
            <button key={k} onClick={() => press(k)} disabled={busy}
              className="h-14 rounded-2xl bg-white border border-black/[0.07] text-xl font-bold text-gray-800 shadow-[0_1px_2px_rgba(0,0,0,0.04)] active:scale-95 active:bg-brand-soft transition disabled:opacity-50">
              {k}
            </button>
          ))}
          <button onClick={() => setPin("")} disabled={busy}
            className="h-14 rounded-2xl text-[13px] font-semibold text-gray-400 active:scale-95 transition disabled:opacity-50">মুছুন</button>
          <button onClick={() => press("0")} disabled={busy}
            className="h-14 rounded-2xl bg-white border border-black/[0.07] text-xl font-bold text-gray-800 shadow-[0_1px_2px_rgba(0,0,0,0.04)] active:scale-95 active:bg-brand-soft transition disabled:opacity-50">0</button>
          <button onClick={() => setPin((p) => p.slice(0, -1))} disabled={busy}
            className="h-14 rounded-2xl grid place-items-center text-gray-500 active:scale-95 transition disabled:opacity-50" aria-label="ব্যাক">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-6 w-6"><path d="M21 5H8l-6 7 6 7h13a1 1 0 0 0 1-1V6a1 1 0 0 0-1-1zM16 9l-5 6M11 9l5 6" /></svg>
          </button>
        </div>

        <button onClick={() => submit(pin)} disabled={busy || pin.length < 3}
          className="mt-4 w-full rounded-xl py-3.5 font-bold text-white bg-gradient-to-b from-brand to-brand-dark shadow-[0_10px_24px_-8px_rgba(47,144,204,0.55)] active:scale-[0.99] transition disabled:opacity-50">
          {busy ? "..." : "প্রবেশ করুন"}
        </button>
        <p className="mt-3 text-[11px] text-gray-400">পিন না থাকলে মালিকের কাছ থেকে সংগ্রহ করুন।</p>
      </div>
    </div>
  );
}
