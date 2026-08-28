"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { taka } from "@/lib/format";
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
    if (!res.ok) { setMsg(res.error ?? "সেভ ব্যর্থ।"); return; }
    setMsg("✅ সেভ হয়েছে।");
    router.refresh();
  }

  return (
    <div className="max-w-2xl">
      <div className="rounded-xl border bg-white overflow-hidden">
        <div className="grid grid-cols-[1fr_110px_80px_40px] gap-2 px-4 py-2 bg-gray-50 text-xs font-semibold text-gray-500">
          <span>পিসের নাম</span><span className="text-right">কস্ট (৳)</span><span className="text-center">সেটে?</span><span></span>
        </div>
        {rows.map((r, i) => (
          <div key={i} className="grid grid-cols-[1fr_110px_80px_40px] gap-2 px-4 py-2 items-center border-t">
            <input value={r.name} onChange={(e) => update(i, { name: e.target.value })} placeholder="পিসের নাম" className="rounded-lg border px-3 py-1.5 text-sm outline-none focus:border-brand" />
            <input value={r.pcs_cost} onChange={(e) => update(i, { pcs_cost: e.target.value.replace(/[^\d.]/g, "") })} inputMode="decimal" className="rounded-lg border px-3 py-1.5 text-sm text-right outline-none focus:border-brand" />
            <label className="flex justify-center"><input type="checkbox" checked={r.in_set} onChange={(e) => update(i, { in_set: e.target.checked })} className="h-4 w-4 accent-brand" /></label>
            <button onClick={() => removeRow(i)} className="text-red-500 text-lg">×</button>
          </div>
        ))}
      </div>

      <button onClick={addRow} className="mt-3 rounded-lg border border-dashed px-4 py-2 text-sm text-brand-dark hover:bg-brand-soft">+ পিস যোগ করুন</button>

      <div className="mt-4 rounded-xl bg-brand-soft/50 border border-brand/15 p-3 text-sm">
        ১ সেট মেকিং কস্ট (যোগফল): <b className="text-brand-dark text-base">{taka(setCost)}</b>
      </div>

      <div className="mt-4 flex items-center gap-3">
        <button onClick={save} disabled={busy} className="rounded-lg bg-brand text-white px-6 py-2.5 text-sm disabled:opacity-60">{busy ? "সেভ হচ্ছে..." : "সেভ করুন"}</button>
        {msg && <span className="text-sm text-gray-600">{msg}</span>}
      </div>
    </div>
  );
}
