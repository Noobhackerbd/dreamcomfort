import Link from "next/link";
import Image from "next/image";
import { getServerSupabase } from "@/lib/supabase/server";
import { isMissingTable, summarize, setCost, WorkerItem, ProductionRow, AdjustmentRow, Worker } from "@/lib/workers";
import { taka } from "@/lib/format";
import { Icon } from "@/components/admin/icons";
import { AddWorker } from "./AddWorker";

export const dynamic = "force-dynamic";

export default async function WorkersPage() {
  const supabase = getServerSupabase();
  const [wRes, itemsRes, prodRes, adjRes] = await Promise.all([
    supabase.from("workers").select("*").order("created_at", { ascending: false }),
    supabase.from("worker_items").select("*").order("sort_order", { ascending: true }),
    supabase.from("worker_production").select("id, worker_id, kind, quantity, amount"),
    supabase.from("worker_adjustments").select("id, worker_id, kind, amount"),
  ]);

  if (isMissingTable(wRes.error) || isMissingTable(itemsRes.error)) {
    return (
      <div>
        <h1 className="text-2xl font-bold mb-4">Workers</h1>
        <div className="dc-card p-5 text-sm" style={{ borderColor: "var(--a-warn-soft)", background: "var(--a-warn-soft)", color: "var(--a-warn)" }}>
          To enable the Workers feature, add the database tables. Run <code className="bg-white/60 px-1 rounded">supabase-migration-workers.sql</code> in Supabase → SQL Editor, then refresh this page.
        </div>
      </div>
    );
  }

  const workers = (wRes.data as Worker[]) ?? [];
  const items = (itemsRes.data as WorkerItem[]) ?? [];
  const prod = (prodRes.data as any[]) ?? [];
  const adj = (adjRes.data as any[]) ?? [];
  const oneSet = setCost(items);

  const byWorker = (id: string) => ({
    prod: prod.filter((p) => p.worker_id === id) as ProductionRow[],
    adj: adj.filter((a) => a.worker_id === id) as AdjustmentRow[],
  });

  const totalDue = workers.reduce((n, w) => { const { prod: p, adj: a } = byWorker(w.id); return n + summarize(p, a).due; }, 0);

  return (
    <div>
      <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
        <h1 className="text-2xl font-bold">Workers</h1>
        <Link href="/admin/workers/items" className="dc-btn"><Icon name="settings" className="h-4 w-4" /> Cost settings</Link>
      </div>

      <div className="dc-card p-3 mb-4 text-sm dc-muted flex flex-wrap items-center gap-x-5 gap-y-1">
        <span>1 set = <b className="text-[var(--a-text)]">{items.filter((i) => i.in_set && i.active).length}</b> pcs</span>
        <span>Making cost / set: <b style={{ color: "var(--a-violet)" }}>{taka(oneSet)}</b></span>
        <span>Total dues: <b style={{ color: "#16a34a" }}>{taka(totalDue)}</b></span>
        <Link href="/admin/workers/items" className="underline" style={{ color: "var(--a-brand)" }}>Change cost</Link>
      </div>

      <AddWorker />

      {workers.length === 0 ? (
        <p className="text-center dc-muted py-10">No workers added yet.</p>
      ) : (
        <div className="mt-4 space-y-2">
          {workers.map((w) => {
            const { prod: p, adj: a } = byWorker(w.id);
            const sum = summarize(p, a);
            return (
              <Link key={w.id} href={`/admin/workers/${w.id}`} className="dc-card p-3.5 flex items-center gap-4 hover:shadow-sm transition">
                <div className="h-12 w-12 rounded-full overflow-hidden shrink-0 flex items-center justify-center" style={{ background: "var(--a-surface-2)", boxShadow: "inset 0 0 0 1px var(--a-border)" }}>
                  {w.photo ? (
                    <Image src={w.photo} alt={w.name} width={48} height={48} className="h-full w-full object-cover" />
                  ) : (
                    <span className="text-xl">🧑‍🏭</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold truncate">{w.name}{!w.active && <span className="ml-2 text-xs dc-muted">(inactive)</span>}</p>
                  <p className="text-xs dc-muted mt-0.5">{sum.sets} sets · {sum.pieces} pcs · earned {taka(sum.earned)}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs dc-muted">Due</p>
                  <p className="font-bold text-lg" style={{ color: sum.due > 0 ? "#16a34a" : "var(--a-muted)" }}>{taka(sum.due)}</p>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
