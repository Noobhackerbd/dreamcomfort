"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { taka } from "@/lib/format";
import type { Worker, WorkerItem, ProductionRow, AdjustmentRow, WorkerSummary } from "@/lib/workers";
import { addProduction, deleteProduction, addAdjustment, deleteAdjustment, updateWorker, deleteWorker } from "../actions";

export function WorkerDetail({
  worker, items, production, adjustments, summary, setCost,
}: {
  worker: Worker;
  items: WorkerItem[];
  production: ProductionRow[];
  adjustments: AdjustmentRow[];
  summary: WorkerSummary;
  setCost: number;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  // Production form
  const [pkind, setPkind] = useState<"set" | "piece">("set");
  const [pitem, setPitem] = useState<string>(items[0]?.id ?? "");
  const [pqty, setPqty] = useState("1");
  const [pnote, setPnote] = useState("");

  // Adjustment form
  const [akind, setAkind] = useState<"damage" | "bonus" | "payment">("payment");
  const [aamt, setAamt] = useState("");
  const [anote, setAnote] = useState("");

  const pieceCost = items.find((i) => i.id === pitem)?.pcs_cost ?? 0;
  const previewAmount = pkind === "set" ? (Number(pqty) || 0) * setCost : (Number(pqty) || 0) * Number(pieceCost);

  async function saveProduction() {
    setBusy(true);
    const res = await addProduction(worker.id, { kind: pkind, itemId: pkind === "piece" ? pitem : null, quantity: Number(pqty), note: pnote });
    setBusy(false);
    if (!res.ok) return alert(res.error);
    setPqty("1"); setPnote("");
    router.refresh();
  }
  async function saveAdjustment() {
    setBusy(true);
    const res = await addAdjustment(worker.id, { kind: akind, amount: Number(aamt), note: anote });
    setBusy(false);
    if (!res.ok) return alert(res.error);
    setAamt(""); setAnote("");
    router.refresh();
  }
  async function delProd(id: string) { await deleteProduction(id, worker.id); router.refresh(); }
  async function delAdj(id: string) { await deleteAdjustment(id, worker.id); router.refresh(); }

  const ADJ_LABEL: Record<string, string> = { damage: "ক্ষতি (কর্তন)", bonus: "বোনাস", payment: "পরিশোধ" };
  const ADJ_SIGN: Record<string, string> = { damage: "−", bonus: "+", payment: "−" };
  const ADJ_COLOR: Record<string, string> = { damage: "text-red-600", bonus: "text-green-600", payment: "text-blue-600" };

  return (
    <div className="mt-3">
      {/* Header */}
      <div className="flex items-center gap-4 mb-5">
        <div className="h-16 w-16 rounded-full overflow-hidden bg-gray-100 ring-1 ring-black/5 flex items-center justify-center shrink-0">
          {worker.photo ? <Image src={worker.photo} alt={worker.name} width={64} height={64} className="h-full w-full object-cover" /> : <span className="text-2xl">🧑‍🏭</span>}
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold">{worker.name}</h1>
          {worker.phone ? <a href={`tel:${worker.phone}`} className="text-sm text-brand-dark">{worker.phone}</a> : null}
        </div>
        <button
          onClick={async () => { if (confirm("এই কর্মী ও সব রেকর্ড ডিলিট করবেন?")) { await deleteWorker(worker.id); router.push("/admin/workers"); } }}
          className="text-xs text-red-500 border border-red-200 rounded-lg px-3 py-1.5 hover:bg-red-50"
        >ডিলিট</button>
      </div>

      {/* Balance summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        <Stat label="মোট আয়" value={taka(summary.earned)} tone="text-gray-900" />
        <Stat label="ক্ষতি কর্তন" value={taka(summary.damage)} tone="text-red-600" />
        <Stat label="পরিশোধ" value={taka(summary.paid)} tone="text-blue-600" />
        <Stat label="বাকি পাওনা" value={taka(summary.due)} tone={summary.due > 0 ? "text-green-600" : "text-gray-500"} big />
      </div>
      <p className="text-xs text-gray-500 mb-6">{summary.sets} সেট · {summary.pieces} আলাদা পিস তৈরি হয়েছে</p>

      {/* Add production */}
      <section className="rounded-xl border bg-white p-4 mb-4">
        <h2 className="font-semibold mb-3">🧵 উৎপাদন এন্ট্রি</h2>
        <div className="flex gap-2 mb-3">
          <button onClick={() => setPkind("set")} className={"flex-1 rounded-lg border py-2 text-sm " + (pkind === "set" ? "bg-brand text-white border-brand" : "")}>১ সেট ({taka(setCost)})</button>
          <button onClick={() => setPkind("piece")} className={"flex-1 rounded-lg border py-2 text-sm " + (pkind === "piece" ? "bg-brand text-white border-brand" : "")}>আলাদা পিস</button>
        </div>
        {pkind === "piece" && (
          <select value={pitem} onChange={(e) => setPitem(e.target.value)} className="w-full rounded-lg border px-3 py-2 text-sm mb-2 outline-none focus:border-brand">
            {items.map((i) => <option key={i.id} value={i.id}>{i.name} — {taka(i.pcs_cost)}</option>)}
          </select>
        )}
        <div className="flex gap-2 items-center">
          <div className="flex-1">
            <label className="block text-xs text-gray-500 mb-1">সংখ্যা</label>
            <input value={pqty} onChange={(e) => setPqty(e.target.value.replace(/\D/g, ""))} inputMode="numeric" className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-brand" />
          </div>
          <div className="flex-[2]">
            <label className="block text-xs text-gray-500 mb-1">নোট (ঐচ্ছিক)</label>
            <input value={pnote} onChange={(e) => setPnote(e.target.value)} className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-brand" />
          </div>
        </div>
        <div className="mt-3 flex items-center justify-between">
          <span className="text-sm text-gray-600">যোগ হবে: <b className="text-green-600">{taka(previewAmount)}</b></span>
          <button onClick={saveProduction} disabled={busy} className="rounded-lg bg-brand text-white px-5 py-2 text-sm disabled:opacity-60">যোগ করুন</button>
        </div>
      </section>

      {/* Adjustments */}
      <section className="rounded-xl border bg-white p-4 mb-4">
        <h2 className="font-semibold mb-3">💰 ক্ষতি / বোনাস / পরিশোধ</h2>
        <div className="flex gap-2 mb-3">
          {(["payment", "damage", "bonus"] as const).map((k) => (
            <button key={k} onClick={() => setAkind(k)} className={"flex-1 rounded-lg border py-2 text-sm " + (akind === k ? "bg-brand text-white border-brand" : "")}>{ADJ_LABEL[k]}</button>
          ))}
        </div>
        <div className="flex gap-2 items-end">
          <div className="flex-1">
            <label className="block text-xs text-gray-500 mb-1">টাকা (৳)</label>
            <input value={aamt} onChange={(e) => setAamt(e.target.value.replace(/[^\d.]/g, ""))} inputMode="decimal" className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-brand" />
          </div>
          <div className="flex-[2]">
            <label className="block text-xs text-gray-500 mb-1">নোট (ঐচ্ছিক)</label>
            <input value={anote} onChange={(e) => setAnote(e.target.value)} className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-brand" />
          </div>
          <button onClick={saveAdjustment} disabled={busy} className="rounded-lg bg-brand text-white px-5 py-2 text-sm disabled:opacity-60 shrink-0">যোগ</button>
        </div>
      </section>

      {/* History */}
      <section className="rounded-xl border bg-white p-4">
        <h2 className="font-semibold mb-3">📜 ইতিহাস</h2>
        {production.length === 0 && adjustments.length === 0 && <p className="text-sm text-gray-400">এখনও কোনো এন্ট্রি নেই।</p>}
        <div className="divide-y">
          {production.map((p) => (
            <div key={p.id} className="flex items-center gap-3 py-2.5 text-sm">
              <span className="text-lg">{p.kind === "set" ? "📦" : "🧩"}</span>
              <div className="flex-1 min-w-0">
                <p className="font-medium">{p.item_name} × {p.quantity}</p>
                <p className="text-xs text-gray-400">{p.entry_date}{p.note ? ` · ${p.note}` : ""}</p>
              </div>
              <span className="text-green-600 font-semibold">+{taka(p.amount)}</span>
              <button onClick={() => delProd(p.id)} className="text-gray-300 hover:text-red-500 text-lg">×</button>
            </div>
          ))}
          {adjustments.map((a) => (
            <div key={a.id} className="flex items-center gap-3 py-2.5 text-sm">
              <span className="text-lg">{a.kind === "payment" ? "💵" : a.kind === "bonus" ? "🎁" : "⚠️"}</span>
              <div className="flex-1 min-w-0">
                <p className="font-medium">{ADJ_LABEL[a.kind]}</p>
                <p className="text-xs text-gray-400">{a.entry_date}{a.note ? ` · ${a.note}` : ""}</p>
              </div>
              <span className={"font-semibold " + ADJ_COLOR[a.kind]}>{ADJ_SIGN[a.kind]}{taka(a.amount)}</span>
              <button onClick={() => delAdj(a.id)} className="text-gray-300 hover:text-red-500 text-lg">×</button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function Stat({ label, value, tone, big }: { label: string; value: string; tone: string; big?: boolean }) {
  return (
    <div className="rounded-xl border bg-white p-3">
      <p className="text-xs text-gray-400">{label}</p>
      <p className={`font-bold ${big ? "text-xl" : "text-base"} ${tone}`}>{value}</p>
    </div>
  );
}
