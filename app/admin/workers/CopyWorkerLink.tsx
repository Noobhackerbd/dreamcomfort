"use client";

import { useState } from "react";

export function CopyWorkerLink({ id }: { id: string }) {
  const [done, setDone] = useState(false);
  function copy(e: React.MouseEvent) {
    e.preventDefault(); e.stopPropagation();
    try {
      const url = `${window.location.origin}/worker/${id}`;
      navigator.clipboard.writeText(url);
      setDone(true); setTimeout(() => setDone(false), 1600);
    } catch {}
  }
  return (
    <button onClick={copy} title="Copy this worker's private link"
      className="shrink-0 rounded-lg border px-2.5 py-1.5 text-xs font-medium hover:bg-black/5"
      style={{ borderColor: "var(--a-border)" }}>
      {done ? "✓ Copied" : "🔗 Copy link"}
    </button>
  );
}
