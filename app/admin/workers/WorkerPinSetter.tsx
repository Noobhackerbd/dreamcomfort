"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { setWorkerPanelPin } from "./actions";

export function WorkerPinSetter({ initial }: { initial: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pin, setPin] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  async function save() {
    setBusy(true); await setWorkerPanelPin(pin); setBusy(false);
    setSaved(true); setTimeout(() => setSaved(false), 1800); router.refresh();
  }

  return (
    <div className="relative">
      <button onClick={() => setOpen((v) => !v)} className="dc-btn">
        🔒 {initial ? "PIN set" : "Set PIN"}
      </button>
      {open && (
        <div className="absolute right-0 mt-2 z-20 w-64 dc-card p-3 shadow-lg" style={{ background: "var(--a-surface)" }}>
          <label className="block text-xs dc-muted mb-1">Worker panel PIN (empty = no PIN)</label>
          <input value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 8))} inputMode="numeric" placeholder="e.g. 1234" className="dc-input w-full" />
          <div className="flex items-center gap-2 mt-2">
            <button onClick={save} disabled={busy} className="dc-btn dc-btn-solid">{busy ? "..." : saved ? "✓ Saved" : "Save"}</button>
            <button onClick={() => setOpen(false)} className="dc-btn">Close</button>
          </div>
          <p className="text-[11px] dc-muted mt-2">Workers enter this PIN once to open the panel.</p>
        </div>
      )}
    </div>
  );
}
