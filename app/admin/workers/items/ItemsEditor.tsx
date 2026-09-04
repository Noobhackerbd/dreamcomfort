"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { taka } from "@/lib/format";
import { Icon } from "@/components/admin/icons";
import type { WorkerItem } from "@/lib/workers";
import { saveWorkerItems, deleteWorkerItem } from "../actions";

type Row = { id?: string; name: string; pcs_cost: string; in_set: boolean; sort_order: number };

export function ItemsEditor({ initial }: { initial: WorkerItem[] }) {
  const router = useRouter();
  const [rows, setRows] = useState<Row[]>(
    (initial ?? []).map((i, idx) => ({ id: i.id, name: i.name, pcs_cost: String(i.pcs_cost ?? 0), in_set: i.in_set, sort_order: i.sort_order ?? idx }))
  );
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const setCost = rows.filter((r) => r.in_set).reduce((s, r) => s + (Number(r.pcs_cost) || 0), 0);

  function update(i: number, patch: Partial<Row>) {
    setRows((rs) => rs.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  }
  function addRow() {
    setRows((rs) => [...rs, { name: "", pcs_cost: "0", in_set: true, sort_order: rs.length }]);
  }
  async function removeRow(i: number) {
    const r = rows[i];
    if (r.id) { await deleteWorkerItem(r.id); }
    setRows((rs) => rs.filter((_, idx) => idx !== i));
    router.refresh();
  }
  async function save() {
    setBusy(true); setMsg(null);
    const res = await saveWorkerItems(rows.map((r, i) => ({ id: r.id, name: r.name, pcs_cost: Number(r.pcs_cost) || 0, in_set: r.in_set, sort_order: i })));
    setBusy(false);
    if (!res.ok) { setMsg(res.error ?? "Save failed."); return; }
    setMsg("Saved ✓");
    router.refresh();
  }

  return (
    <div className="max-w-2xl">
      <div className="dc-card overflow-hidden p-0">
        <div className="grid grid-cols-[1fr_110px_70px_40px] gap-2 px-4 py-2 text-xs font-semibold dc-muted" style={{ background: "var(--a-surface-2)" }}>
          <span>Piece name</span><span className="text-right">Cost (৳)</span><span className="text-center">In set?</span><span></span>
        </div>
        {rows.map((r, i) => (
          <div key={i} className="grid grid-cols-[1fr_110px_70px_40px] gap-2 px-4 py-2 items-center" style={{ borderTop: "1px solid var(--a-border)" }}>
            <input value={r.name} onChange={(e) => update(i, { name: e.target.value })} placeholder="Piece name" className="dc-input py-1.5" />
            <input value={r.pcs_cost} onChange={(e) => update(i, { pcs_cost: e.target.value.replace(/[^\d.]/g, "") })} inputMode="decimal" className="dc-input py-1.5 text-right" />
            <label className="flex justify-center"><input type="checkbox" checked={r.in_set} onChange={(e) => update(i, { in_set: e.target.checked })} className="h-4 w-4" style={{ accentColor: "var(--a-violet)" }} /></label>
            <button onClick={() => removeRow(i)} className="dc-act dc-act-sm" style={{ color: "#dc2626" }}><Icon name="close" className="h-4 w-4" /></button>
          </div>
        ))}
      </div>

      <button onClick={addRow} className="mt-3 rounded-lg px-4 py-2 text-sm font-medium" style={{ border: "1px dashed var(--a-border)", color: "var(--a-violet)", background: "var(--a-violet-soft)" }}>+ Add piece</button>

      <div className="mt-4 dc-card p-3 text-sm">
        Making cost per set (sum): <b style={{ color: "var(--a-violet)" }} className="text-base">{taka(setCost)}</b>
      </div>

      <div className="mt-4 flex items-center gap-3">
        <button onClick={save} disabled={busy} className="dc-btn dc-btn-solid disabled:opacity-60" style={{ background: "var(--a-violet)", borderColor: "var(--a-violet)" }}>{busy ? "Saving…" : "Save"}</button>
        {msg && <span className="text-sm" style={{ color: msg.includes("✓") ? "var(--a-ok)" : "#dc2626" }}>{msg}</span>}
      </div>
    </div>
  );
}
