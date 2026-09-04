"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { taka } from "@/lib/format";
import { Icon } from "@/components/admin/icons";
import type { Worker, WorkerItem, ProductionRow, AdjustmentRow, WorkerSummary } from "@/lib/workers";
import { addProduction, deleteProduction, addAdjustment, deleteAdjustment, deleteWorker } from "../actions";

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
  const [delOpen, setDelOpen] = useState(false);

  const [pkind, setPkind] = useState<"set" | "piece">("set");
  const [pitem, setPitem] = useState<string>(items[0]?.id ?? "");
  const [pqty, setPqty] = useState("1");
  const [pnote, setPnote] = useState("");

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

  const ADJ_LABEL: Record<string, string> = { damage: "Damage (deduct)", bonus: "Bonus", payment: "Payment" };
  const ADJ_SIGN: Record<string, string> = { damage: "−", bonus: "+", payment: "−" };
  const ADJ_COLOR: Record<string, string> = { damage: "#dc2626", bonus: "#16a34a", payment: "#2563eb" };

  const seg = (on: boolean) =>
    "flex-1 rounded-lg border py-2 text-sm font-medium transition " + (on ? "dc-pill-active" : "dc-pill");

  return (
    <div className="mt-3">
      {/* Header */}
      <div className="flex items-center gap-4 mb-5">
        <div className="h-16 w-16 rounded-full overflow-hidden flex items-center justify-center shrink-0" style={{ background: "var(--a-surface-2)", boxShadow: "inset 0 0 0 1px var(--a-border)" }}>
          {worker.photo ? <Image src={worker.photo} alt={worker.name} width={64} height={64} className="h-full w-full object-cover" /> : <span className="text-2xl">🧑‍🏭</span>}
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold">{worker.name}</h1>
          {worker.phone ? <a href={`tel:${worker.phone}`} className="text-sm" style={{ color: "var(--a-brand)" }}>{worker.phone}</a> : null}
        </div>
        <span className="relative inline-flex">
          <button onClick={() => setDelOpen((o) => !o)} className="dc-act dc-act-sm" title="Delete worker" style={{ color: "#dc2626" }}><Icon name="trash" className="h-4 w-4" /></button>
          {delOpen && (
            <>
              <div className="fixed inset-0 z-30" onClick={() => setDelOpen(false)} />
              <div className="absolute right-0 top-9 z-40 w-56 dc-card p-3" style={{ boxShadow: "var(--a-shadow-lg)" }}>
                <p className="text-sm font-semibold mb-1">Delete this worker?</p>
                <p className="text-xs dc-muted mb-3">All their records are removed. This can&apos;t be undone.</p>
                <div className="flex justify-end gap-2">
                  <button onClick={() => setDelOpen(false)} className="dc-btn">Cancel</button>
                  <button onClick={async () => { await deleteWorker(worker.id); router.push("/admin/workers"); }} className="dc-btn" style={{ background: "#dc2626", borderColor: "#dc2626", color: "#fff" }}>Delete</button>
                </div>
              </div>
            </>
          )}
        </span>
      </div>

      {/* Balance summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-4">
        <Stat label="Earned" value={taka(summary.earned)} tone="var(--a-text)" />
        <Stat label="Damage" value={taka(summary.damage)} tone="#dc2626" />
        <Stat label="Paid" value={taka(summary.paid)} tone="#2563eb" />
        <Stat label="Due" value={taka(summary.due)} tone={summary.due > 0 ? "#16a34a" : "var(--a-muted)"} big />
      </div>
      <p className="text-xs dc-muted mb-6">{summary.sets} sets · {summary.pieces} separate pieces made</p>

      {/* Add production */}
      <section className="dc-card p-4 mb-4">
        <h2 className="font-bold text-[15px] mb-3">🧵 Production entry</h2>
        <div className="flex gap-2 mb-3">
          <button onClick={() => setPkind("set")} className={seg(pkind === "set")}>1 set ({taka(setCost)})</button>
          <button onClick={() => setPkind("piece")} className={seg(pkind === "piece")}>Separate piece</button>
        </div>
        {pkind === "piece" && (
          <select value={pitem} onChange={(e) => setPitem(e.target.value)} className="dc-input mb-2">
            {items.map((i) => <option key={i.id} value={i.id}>{i.name} — {taka(i.pcs_cost)}</option>)}
          </select>
        )}
        <div className="flex gap-2 items-end">
          <div className="flex-1">
            <label className="block text-xs dc-muted mb-1">Quantity</label>
            <input value={pqty} onChange={(e) => setPqty(e.target.value.replace(/\D/g, ""))} inputMode="numeric" className="dc-input" />
          </div>
          <div className="flex-[2]">
            <label className="block text-xs dc-muted mb-1">Note (optional)</label>
            <input value={pnote} onChange={(e) => setPnote(e.target.value)} className="dc-input" />
          </div>
        </div>
        <div className="mt-3 flex items-center justify-between">
          <span className="text-sm dc-muted">Adds: <b style={{ color: "#16a34a" }}>{taka(previewAmount)}</b></span>
          <button onClick={saveProduction} disabled={busy} className="dc-btn dc-btn-solid disabled:opacity-60" style={{ background: "var(--a-violet)", borderColor: "var(--a-violet)" }}>Add</button>
        </div>
      </section>

      {/* Adjustments */}
      <section className="dc-card p-4 mb-4">
        <h2 className="font-bold text-[15px] mb-3">💰 Damage / bonus / payment</h2>
        <div className="flex gap-2 mb-3">
          {(["payment", "damage", "bonus"] as const).map((k) => (
            <button key={k} onClick={() => setAkind(k)} className={seg(akind === k)}>{ADJ_LABEL[k]}</button>
          ))}
        </div>
        <div className="flex gap-2 items-end">
          <div className="flex-1">
            <label className="block text-xs dc-muted mb-1">Amount (৳)</label>
            <input value={aamt} onChange={(e) => setAamt(e.target.value.replace(/[^\d.]/g, ""))} inputMode="decimal" className="dc-input" />
          </div>
          <div className="flex-[2]">
            <label className="block text-xs dc-muted mb-1">Note (optional)</label>
            <input value={anote} onChange={(e) => setAnote(e.target.value)} className="dc-input" />
          </div>
          <button onClick={saveAdjustment} disabled={busy} className="dc-btn dc-btn-solid disabled:opacity-60 shrink-0" style={{ background: "var(--a-violet)", borderColor: "var(--a-violet)" }}>Add</button>
        </div>
      </section>

      {/* History */}
      <section className="dc-card p-4">
        <h2 className="font-bold text-[15px] mb-3">📜 History</h2>
        {production.length === 0 && adjustments.length === 0 && <p className="text-sm dc-muted">No entries yet.</p>}
        <div className="divide-y" style={{ borderColor: "var(--a-border)" }}>
          {production.map((p) => (
            <div key={p.id} className="flex items-center gap-3 py-2.5 text-sm">
              <span className="text-lg">{p.kind === "set" ? "📦" : "🧩"}</span>
              <div className="flex-1 min-w-0">
                <p className="font-medium">{p.item_name} × {p.quantity}</p>
                <p className="text-xs dc-muted">{p.entry_date}{p.note ? ` · ${p.note}` : ""}</p>
              </div>
              <span className="font-semibold" style={{ color: "#16a34a" }}>+{taka(p.amount)}</span>
              <button onClick={() => delProd(p.id)} className="dc-act dc-act-sm" style={{ color: "var(--a-faint)" }}><Icon name="close" className="h-3.5 w-3.5" /></button>
            </div>
          ))}
          {adjustments.map((a) => (
            <div key={a.id} className="flex items-center gap-3 py-2.5 text-sm">
              <span className="text-lg">{a.kind === "payment" ? "💵" : a.kind === "bonus" ? "🎁" : "⚠️"}</span>
              <div className="flex-1 min-w-0">
                <p className="font-medium">{ADJ_LABEL[a.kind]}</p>
                <p className="text-xs dc-muted">{a.entry_date}{a.note ? ` · ${a.note}` : ""}</p>
              </div>
              <span className="font-semibold" style={{ color: ADJ_COLOR[a.kind] }}>{ADJ_SIGN[a.kind]}{taka(a.amount)}</span>
              <button onClick={() => delAdj(a.id)} className="dc-act dc-act-sm" style={{ color: "var(--a-faint)" }}><Icon name="close" className="h-3.5 w-3.5" /></button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function Stat({ label, value, tone, big }: { label: string; value: string; tone: string; big?: boolean }) {
  return (
    <div className="dc-card p-3">
      <p className="text-xs dc-muted">{label}</p>
      <p className={"font-bold " + (big ? "text-xl" : "text-base")} style={{ color: tone }}>{value}</p>
    </div>
  );
}
