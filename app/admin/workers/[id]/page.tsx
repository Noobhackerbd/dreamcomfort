import Link from "next/link";
import { notFound } from "next/navigation";
import { getServerSupabase } from "@/lib/supabase/server";
import { isMissingTable, summarize, setCost, WorkerItem, ProductionRow, AdjustmentRow, Worker } from "@/lib/workers";
import { WorkerDetail } from "./WorkerDetail";

export const dynamic = "force-dynamic";

export default async function WorkerPage({ params }: { params: { id: string } }) {
  const supabase = getServerSupabase();
  const [wRes, itemsRes, prodRes, adjRes] = await Promise.all([
    supabase.from("workers").select("*").eq("id", params.id).single(),
    supabase.from("worker_items").select("*").order("sort_order", { ascending: true }),
    supabase.from("worker_production").select("*").eq("worker_id", params.id).order("created_at", { ascending: false }),
    supabase.from("worker_adjustments").select("*").eq("worker_id", params.id).order("created_at", { ascending: false }),
  ]);

  if (isMissingTable(wRes.error)) {
    return <div className="rounded-xl border border-amber-300 bg-amber-50 p-5 text-sm text-amber-800">আগে workers migration চালান।</div>;
  }
  if (!wRes.data) notFound();

  const worker = wRes.data as Worker;
  const items = (itemsRes.data as WorkerItem[]) ?? [];
  const prod = (prodRes.data as ProductionRow[]) ?? [];
  const adj = (adjRes.data as AdjustmentRow[]) ?? [];
  const sum = summarize(prod, adj);
  const oneSet = setCost(items);

  return (
    <div>
      <Link href="/admin/workers" className="text-sm text-brand-dark">← কর্মী তালিকা</Link>
      <WorkerDetail
        worker={worker}
        items={items.filter((i) => i.active)}
        production={prod}
        adjustments={adj}
        summary={sum}
        setCost={oneSet}
      />
    </div>
  );
}
