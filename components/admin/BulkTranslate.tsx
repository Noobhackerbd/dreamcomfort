"use client";

import { useState } from "react";
import { backfillTranslations } from "@/app/admin/products/actions";

/** One-click: translate every existing product that's missing a language (name/description). */
export function BulkTranslate() {
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(0);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [finished, setFinished] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function run() {
    setBusy(true); setErr(null); setFinished(false); setDone(0); setRemaining(null);
    let total = 0;
    try {
      // Process in small batches so it never times out; loop until nothing remains.
      // Safety cap of 200 batches (~3000 products) to avoid an infinite loop.
      for (let i = 0; i < 200; i++) {
        const r = await backfillTranslations(15);
        if (!r.ok) { setErr(r.error ?? "Translation failed."); break; }
        total += r.updated; setDone(total); setRemaining(r.remaining);
        if (r.remaining <= 0 || r.updated === 0) { setFinished(true); break; }
      }
    } catch (e: any) {
      setErr(e?.message ?? "Translation failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="dc-card p-5 max-w-xl">
      <div className="flex items-center gap-2.5 mb-1">
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg shrink-0" style={{ background: "var(--a-violet-soft)", color: "var(--a-violet)" }}>✨</span>
        <h2 className="font-bold text-[15.5px]">Translate existing products</h2>
      </div>
      <p className="text-sm dc-muted mb-4 leading-relaxed">
        Fills the missing language (name &amp; description) for every product that only has one language, using AI.
        New and edited products are translated automatically on save — this is just for your existing catalog.
        You can run it as many times as you like; already-translated products are skipped.
      </p>

      <button onClick={run} disabled={busy} className="dc-btn dc-btn-solid disabled:opacity-60" style={{ background: "var(--a-violet)", borderColor: "var(--a-violet)" }}>
        {busy ? "Translating…" : "Translate all missing"}
      </button>

      {(busy || finished) && (
        <div className="mt-3 text-sm">
          <p className="dc-muted">Translated so far: <b style={{ color: "var(--a-text)" }}>{done}</b>{remaining != null && remaining > 0 ? ` · ${remaining} remaining` : ""}</p>
          {finished && !err && <p className="mt-1" style={{ color: "var(--a-ok)" }}>Done ✓ {done === 0 ? "Everything was already translated." : `Translated ${done} product${done === 1 ? "" : "s"}.`}</p>}
        </div>
      )}
      {err && <p className="mt-3 text-sm" style={{ color: "#dc2626" }}>{err}</p>}
    </div>
  );
}
