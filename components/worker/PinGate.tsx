"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { verifyWorkerPin } from "@/app/worker/gate-actions";

export function PinGate() {
  const router = useRouter();
  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setErr(null); setBusy(true);
    const res = await verifyWorkerPin(pin);
    setBusy(false);
    if (!res.ok) { setErr(res.error ?? "ভুল পিন।"); return; }
    router.refresh();
  }

  return (
    <div className="min-h-[70vh] grid place-items-center px-4">
      <form onSubmit={submit} className="w-full max-w-xs rounded-3xl bg-white ring-1 ring-black/5 shadow-sm p-6 text-center">
        <div className="mx-auto mb-3 h-12 w-12 rounded-full bg-brand-soft text-brand-dark grid place-items-center">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-6 w-6"><rect x="4" y="10" width="16" height="10" rx="2" /><path d="M8 10V7a4 4 0 1 1 8 0v3" /></svg>
        </div>
        <h1 className="font-display text-lg font-bold text-gray-900">কর্মী প্যানেল</h1>
        <p className="text-xs text-gray-500 mt-1 mb-4">প্রবেশ করতে পিন দিন।</p>
        <input value={pin} onChange={(e) => setPin(e.target.value)} inputMode="numeric" autoFocus placeholder="পিন"
          className="w-full text-center tracking-[0.3em] font-bold text-lg rounded-xl border border-black/10 px-4 py-3 outline-none focus:border-brand focus:ring-2 focus:ring-brand/15" />
        {err && <p className="mt-2 text-sm text-red-600">{err}</p>}
        <button type="submit" disabled={busy} className="mt-3 w-full rounded-xl bg-brand text-white py-3 font-semibold hover:bg-brand-dark disabled:opacity-60">{busy ? "..." : "প্রবেশ"}</button>
      </form>
    </div>
  );
}
