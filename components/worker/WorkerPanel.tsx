"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { taka, bdDateTime } from "@/lib/format";
import type { WorkerItem, ProductionRow, AdjustmentRow } from "@/lib/workers";
import { workerAddProduction, workerDeleteProduction, getWorkerPanel, logoutWorker } from "@/app/worker/panel-actions";

function dhakaToday(): string {
  return new Date(Date.now() + 6 * 3600 * 1000).toISOString().slice(0, 10);
}

function summarize(prod: ProductionRow[], adj: AdjustmentRow[]) {
  const produced = prod.reduce((s, p) => s + Number(p.amount || 0), 0);
  const sets = prod.filter((p) => p.kind === "set").reduce((s, p) => s + Number(p.quantity || 0), 0);
  const pieces = prod.filter((p) => p.kind === "piece").reduce((s, p) => s + Number(p.quantity || 0), 0);
  const bonus = adj.filter((a) => a.kind === "bonus").reduce((s, a) => s + Number(a.amount || 0), 0);
  const damage = adj.filter((a) => a.kind === "damage").reduce((s, a) => s + Number(a.amount || 0), 0);
  const paid = adj.filter((a) => a.kind === "payment").reduce((s, a) => s + Number(a.amount || 0), 0);
  const earned = produced + bonus;
  return { produced, bonus, damage, paid, earned, due: earned - damage - paid, sets, pieces };
}

const ADJ_LABEL: Record<string, string> = { damage: "ক্ষতি", bonus: "বোনাস", payment: "পরিশোধ" };
const ADJ_COLOR: Record<string, string> = { damage: "#dc2626", bonus: "#16a34a", payment: "#2563eb" };

export function WorkerPanel({
  worker, items, setCost, initialProduction, initialAdjustments,
}: {
  worker: { id: string; name: string; photo: string | null; phone: string | null };
  items: WorkerItem[];
  setCost: number;
  initialProduction: ProductionRow[];
  initialAdjustments: AdjustmentRow[];
}) {
  const router = useRouter();
  const [prod, setProd] = useState<ProductionRow[]>(initialProduction);
  const [adj, setAdj] = useState<AdjustmentRow[]>(initialAdjustments);

  const [kind, setKind] = useState<"set" | "piece">("set");
  const [itemId, setItemId] = useState<string>(items[0]?.id ?? "");
  const [qty, setQty] = useState(1);
  const [note, setNote] = useState("");
  const [adding, setAdding] = useState(false);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const [view, setView] = useState<"today" | "all">("today");

  const addingRef = useRef(false);
  addingRef.current = adding;

  // Background sync every 15s — catches admin-added bonus/payment/damage without a reload.
  useEffect(() => {
    const t = setInterval(async () => {
      if (addingRef.current) return;
      try {
        const res = await getWorkerPanel();
        if (res.ok) { setProd(res.production as ProductionRow[]); setAdj(res.adjustments as AdjustmentRow[]); }
      } catch { /* ignore */ }
    }, 15000);
    return () => clearInterval(t);
  }, []);

  function flash(msg: string, ok = true) {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 2200);
  }

  const sum = summarize(prod, adj);
  const today = dhakaToday();
  const todayProduced = prod.filter((p) => p.entry_date === today).reduce((s, p) => s + Number(p.amount || 0), 0);
  const todaySets = prod.filter((p) => p.entry_date === today && p.kind === "set").reduce((s, p) => s + Number(p.quantity || 0), 0);
  const todayPieces = prod.filter((p) => p.entry_date === today && p.kind === "piece").reduce((s, p) => s + Number(p.quantity || 0), 0);

  const pieceCost = items.find((i) => i.id === itemId)?.pcs_cost ?? 0;
  const previewAmount = kind === "set" ? qty * setCost : qty * Number(pieceCost);

  async function add() {
    if (adding) return;
    if (kind === "piece" && !itemId) { flash("পিস নির্বাচন করুন।", false); return; }
    setAdding(true);
    const tempId = "temp-" + Date.now();
    const optimistic: ProductionRow = {
      id: tempId, worker_id: worker.id, entry_date: today, kind,
      item_name: kind === "set" ? "১ সেট" : (items.find((i) => i.id === itemId)?.name ?? "পিস"),
      item_id: kind === "piece" ? itemId : null as any, quantity: qty,
      unit_cost: kind === "set" ? setCost : Number(pieceCost), amount: previewAmount,
      note: note.trim() || null, created_at: new Date().toISOString(),
    } as ProductionRow;
    setProd((p) => [optimistic, ...p]);           // instant
    const savedQty = qty;
    setQty(1); setNote("");

    const res = await workerAddProduction({ kind, itemId: kind === "piece" ? itemId : null, quantity: savedQty, note: optimistic.note ?? "" });
    setAdding(false);
    if (!res.ok) {
      setProd((p) => p.filter((x) => x.id !== tempId));
      flash(res.error || "যোগ হয়নি।", false);
      return;
    }
    setProd((p) => p.map((x) => (x.id === tempId ? (res.row as ProductionRow) : x)));
    flash(`✓ ${taka(previewAmount)} যোগ হলো`);
  }

  async function removeEntry(id: string) {
    const backup = prod;
    setProd((p) => p.filter((x) => x.id !== id));   // instant
    const res = await workerDeleteProduction(id);
    if (!res.ok) { setProd(backup); flash(res.error || "মুছে যায়নি।", false); }
  }

  async function logout() {
    await logoutWorker();
    router.refresh();
  }

  // Unified history timeline (production + adjustments), newest first.
  type Row =
    | { t: "prod"; at: string; row: ProductionRow }
    | { t: "adj"; at: string; row: AdjustmentRow };
  let timeline: Row[] = [
    ...prod.map((p) => ({ t: "prod" as const, at: p.created_at, row: p })),
    ...adj.map((a) => ({ t: "adj" as const, at: a.created_at, row: a })),
  ].sort((a, b) => String(b.at).localeCompare(String(a.at)));
  if (view === "today") timeline = timeline.filter((r) => (r.t === "prod" ? r.row.entry_date : r.row.entry_date) === today);

  const stats = [
    { label: "আজকের আয়", value: taka(todayProduced), color: "#2F90CC" },
    { label: "মোট আয়", value: taka(sum.earned), color: "#111827" },
    { label: "পরিশোধ", value: taka(sum.paid), color: "#16a34a" },
    { label: "বাকি", value: taka(sum.due), color: "#DE6699" },
  ];

  return (
    <div className="max-w-2xl mx-auto px-4 py-5 pb-28">
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <span className="h-12 w-12 rounded-full overflow-hidden bg-brand-soft text-brand-dark grid place-items-center font-bold shrink-0">
          {worker.photo
            // eslint-disable-next-line @next/next/no-img-element
            ? <img src={worker.photo} alt="" className="h-full w-full object-cover" />
            : (worker.name || "?").charAt(0)}
        </span>
        <div className="min-w-0 flex-1">
          <h1 className="font-display text-lg font-bold text-gray-900 truncate">{worker.name}</h1>
          <p className="text-[11px] text-gray-400 flex items-center gap-1.5">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" /> লাইভ · আজ {todaySets} সেট · {todayPieces} পিস
          </p>
        </div>
        <button onClick={logout} className="shrink-0 text-[12px] font-semibold text-gray-500 rounded-lg border border-black/10 px-3 py-1.5 hover:bg-gray-50">লগ আউট</button>
      </div>

      {/* Live stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-5">
        {stats.map((s) => (
          <div key={s.label} className="rounded-xl bg-white border border-black/[0.06] shadow-[0_1px_2px_rgba(0,0,0,0.04)] p-3.5">
            <p className="text-[19px] font-extrabold tabular-nums leading-none" style={{ color: s.color }}>{s.value}</p>
            <p className="text-[11px] text-gray-500 mt-1.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Quick add */}
      <div className="rounded-2xl bg-white border border-black/[0.06] shadow-[0_1px_2px_rgba(0,0,0,0.04)] p-4 mb-5">
        <p className="font-bold text-[15px] mb-3">নতুন এন্ট্রি যোগ করুন</p>
        <div className="flex gap-2 mb-3">
          <button onClick={() => setKind("set")}
            className={"flex-1 rounded-lg py-2.5 text-sm font-bold border transition " + (kind === "set" ? "bg-brand text-white border-brand" : "border-black/10 text-gray-600")}>
            ১ সেট · {taka(setCost)}
          </button>
          <button onClick={() => setKind("piece")}
            className={"flex-1 rounded-lg py-2.5 text-sm font-bold border transition " + (kind === "piece" ? "bg-brand text-white border-brand" : "border-black/10 text-gray-600")}>
            আলাদা পিস
          </button>
        </div>

        {kind === "piece" && (
          <select value={itemId} onChange={(e) => setItemId(e.target.value)}
            className="w-full rounded-lg border border-black/10 bg-white px-3 py-2.5 text-sm mb-3 outline-none focus:border-brand">
            {items.map((i) => <option key={i.id} value={i.id}>{i.name} — {taka(i.pcs_cost)}</option>)}
          </select>
        )}

        <div className="flex items-center justify-between gap-3 mb-3">
          <span className="text-sm font-semibold text-gray-700">পরিমাণ</span>
          <div className="inline-flex items-center gap-1 rounded-full border border-black/[0.08] bg-white p-1">
            <button onClick={() => setQty((q) => Math.max(1, q - 1))} disabled={qty <= 1}
              className="h-9 w-9 grid place-items-center rounded-full text-brand-dark bg-brand-soft hover:bg-brand hover:text-white active:scale-90 transition disabled:opacity-35">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round"><path d="M5 12h14" /></svg>
            </button>
            <span className="min-w-[3rem] text-center text-[17px] font-extrabold tabular-nums select-none">{qty}</span>
            <button onClick={() => setQty((q) => Math.min(999, q + 1))}
              className="h-9 w-9 grid place-items-center rounded-full text-white bg-gradient-to-b from-brand to-brand-dark active:scale-90 transition">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
            </button>
          </div>
        </div>

        <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="নোট (ঐচ্ছিক)"
          className="w-full rounded-lg border border-black/10 bg-white px-3 py-2.5 text-sm mb-3 outline-none focus:border-brand" />

        <button onClick={add} disabled={adding}
          className="w-full rounded-xl py-3.5 font-bold text-white bg-gradient-to-b from-brand to-brand-dark shadow-[0_10px_24px_-8px_rgba(47,144,204,0.55)] active:scale-[0.99] transition disabled:opacity-60 flex items-center justify-center gap-2">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
          যোগ করুন · {taka(previewAmount)}
        </button>
      </div>

      {/* History */}
      <div className="flex items-center justify-between mb-2.5">
        <h2 className="font-bold text-[15px] text-gray-900">এন্ট্রি হিস্ট্রি</h2>
        <div className="inline-flex rounded-lg bg-gray-100 p-0.5 text-[12px] font-bold">
          <button onClick={() => setView("today")} className={"px-3 py-1 rounded-md transition " + (view === "today" ? "bg-white text-brand-dark shadow-sm" : "text-gray-500")}>আজ</button>
          <button onClick={() => setView("all")} className={"px-3 py-1 rounded-md transition " + (view === "all" ? "bg-white text-brand-dark shadow-sm" : "text-gray-500")}>সব</button>
        </div>
      </div>

      {timeline.length === 0 ? (
        <p className="rounded-xl bg-white border border-black/[0.06] p-6 text-center text-sm text-gray-400">
          {view === "today" ? "আজ এখনো কোনো এন্ট্রি নেই।" : "কোনো এন্ট্রি নেই।"}
        </p>
      ) : (
        <div className="rounded-2xl bg-white border border-black/[0.06] shadow-[0_1px_2px_rgba(0,0,0,0.04)] overflow-hidden divide-y divide-black/5">
          {timeline.map((r) =>
            r.t === "prod" ? (
              <div key={r.row.id} className="flex items-center gap-3 px-4 py-3">
                <span className="h-8 w-8 shrink-0 grid place-items-center rounded-lg bg-brand-soft text-brand-dark">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4"><path d="M20 7l-9-5-9 5 9 5 9-5zM2 17l9 5 9-5M2 12l9 5 9-5" /></svg>
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[13.5px] font-semibold text-gray-900 truncate">{r.row.item_name || (r.row.kind === "set" ? "সেট" : "পিস")} × {r.row.quantity}</p>
                  <p className="text-[10.5px] text-gray-400">{bdDateTime(r.row.created_at)}{r.row.note ? ` · ${r.row.note}` : ""}</p>
                </div>
                <span className="font-bold text-[13.5px] text-gray-900 tabular-nums shrink-0">{taka(Number(r.row.amount))}</span>
                {String(r.row.id).startsWith("temp-")
                  ? <span className="h-7 w-7 shrink-0 grid place-items-center text-gray-300"><svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2.5" strokeOpacity="0.3" /><path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" /></svg></span>
                  : <button onClick={() => removeEntry(r.row.id)} aria-label="মুছুন" className="h-7 w-7 shrink-0 grid place-items-center rounded-full text-gray-300 hover:text-red-500 hover:bg-red-50 transition">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" className="h-4 w-4"><path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2m2 0v14a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V6" /></svg>
                    </button>}
              </div>
            ) : (
              <div key={r.row.id} className="flex items-center gap-3 px-4 py-3">
                <span className="h-8 w-8 shrink-0 grid place-items-center rounded-lg" style={{ background: `${ADJ_COLOR[r.row.kind]}14`, color: ADJ_COLOR[r.row.kind] }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4"><circle cx="12" cy="12" r="9" /><path d="M12 8v8M8 12h8" /></svg>
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[13.5px] font-semibold text-gray-900">{ADJ_LABEL[r.row.kind] || r.row.kind}</p>
                  <p className="text-[10.5px] text-gray-400">{bdDateTime(r.row.created_at)}{r.row.note ? ` · ${r.row.note}` : ""}</p>
                </div>
                <span className="font-bold text-[13.5px] tabular-nums shrink-0" style={{ color: ADJ_COLOR[r.row.kind] }}>
                  {r.row.kind === "bonus" ? "+" : "−"}{taka(Number(r.row.amount))}
                </span>
              </div>
            )
          )}
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed left-1/2 -translate-x-1/2 bottom-6 z-[90] rounded-full px-4 py-2.5 text-[13px] font-semibold text-white shadow-lg"
          style={{ background: toast.ok ? "#16a34a" : "#dc2626" }}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}
