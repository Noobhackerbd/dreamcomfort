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
    return <div className="dc-card p-5 text-sm" style={{ borderColor: "var(--a-warn-soft)", background: "var(--a-warn-soft)", color: "var(--a-warn)" }}>Run the workers migration first.</div>;
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
      <Link href="/admin/workers" className="text-sm" style={{ color: "var(--a-brand)" }}>← Workers</Link>
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
