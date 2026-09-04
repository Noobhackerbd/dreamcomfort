"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/admin/icons";
import { markAbandonedConverted, markAbandonedOpen, deleteAbandoned } from "./actions";

export function AbandonedActions({ id, status }: { id: string; status: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState(false);

  async function run(fn: () => Promise<any>) {
    setBusy(true);
    await fn();
    setBusy(false);
    router.refresh();
  }

  return (
    <div className="flex items-center gap-1.5">
      {status === "abandoned" ? (
        <button onClick={() => run(() => markAbandonedConverted(id))} disabled={busy} className="dc-btn disabled:opacity-60" style={{ color: "#16a34a", borderColor: "#bfe6cd" }}>
          <Icon name="check" className="h-3.5 w-3.5" /> Converted
        </button>
      ) : (
        <button onClick={() => run(() => markAbandonedOpen(id))} disabled={busy} className="dc-btn disabled:opacity-60">
          <Icon name="refresh" className="h-3.5 w-3.5" /> Reopen
        </button>
      )}
      <button onClick={() => setConfirm(true)} disabled={busy} className="dc-act dc-act-sm" title="Delete lead" style={{ color: "#dc2626" }}>
        <Icon name="trash" className="h-4 w-4" />
      </button>

      {confirm && (
        <div className="fixed inset-0 z-[90] bg-black/50 flex items-center justify-center p-4" onClick={() => !busy && setConfirm(false)}>
          <div className="dc-card w-full max-w-xs p-5" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-bold mb-1">Delete this lead?</h3>
            <p className="text-sm dc-muted mb-4">This can&apos;t be undone.</p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setConfirm(false)} disabled={busy} className="dc-btn">Cancel</button>
              <button onClick={() => run(() => deleteAbandoned(id)).then(() => setConfirm(false))} disabled={busy} className="dc-btn disabled:opacity-60" style={{ background: "#dc2626", borderColor: "#dc2626", color: "#fff" }}>
                {busy ? "…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
