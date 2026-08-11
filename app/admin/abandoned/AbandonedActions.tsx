"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
    <div className="flex items-center gap-2">
      {status === "abandoned" ? (
        <button
          onClick={() => run(() => markAbandonedConverted(id))}
          disabled={busy}
          className="rounded-lg border border-green-300 text-green-700 px-3 py-1.5 text-xs hover:bg-green-50 disabled:opacity-60"
        >
          ✓ কনভার্টেড
        </button>
      ) : (
        <button
          onClick={() => run(() => markAbandonedOpen(id))}
          disabled={busy}
          className="rounded-lg border px-3 py-1.5 text-xs hover:border-brand disabled:opacity-60"
        >
          ↩ আবার খুলুন
        </button>
      )}
      <button
        onClick={() => setConfirm(true)}
        disabled={busy}
        className="rounded-lg border border-red-200 text-red-600 px-3 py-1.5 text-xs hover:bg-red-50 disabled:opacity-60"
      >
        🗑️
      </button>

      {confirm && (
        <div className="fixed inset-0 z-[90] bg-black/50 flex items-center justify-center p-4" onClick={() => !busy && setConfirm(false)}>
          <div className="bg-white rounded-2xl w-full max-w-xs p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-bold mb-1">লিড ডিলিট করবেন?</h3>
            <p className="text-sm text-gray-500 mb-4">এটি ফেরানো যাবে না।</p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setConfirm(false)} disabled={busy} className="rounded-lg border px-4 py-2 text-sm">বাতিল</button>
              <button
                onClick={() => run(() => deleteAbandoned(id)).then(() => setConfirm(false))}
                disabled={busy}
                className="rounded-lg bg-red-600 text-white px-4 py-2 text-sm disabled:opacity-60"
              >
                {busy ? "..." : "ডিলিট"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
