// app/worker/page.tsx — worker self-service entry point. Each worker logs in
// with their own PIN and lands directly on their live panel.
import type { Metadata } from "next";
import { cookies } from "next/headers";
import { getServerSupabase } from "@/lib/supabase/server";
import { setCost as computeSetCost, type Worker, type WorkerItem, type ProductionRow, type AdjustmentRow } from "@/lib/workers";
import { WorkerLogin } from "@/components/worker/WorkerLogin";
import { WorkerPanel } from "@/components/worker/WorkerPanel";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "কর্মী প্যানেল", robots: { index: false, follow: false } };

export default async function WorkerIndex() {
  const workerId = cookies().get("dc_worker")?.value || null;

  if (workerId) {
    const svc = getServerSupabase();
    const [wRes, iRes, pRes, aRes] = await Promise.all([
      svc.from("workers").select("*").eq("id", workerId).single(),
      svc.from("worker_items").select("*").order("sort_order", { ascending: true }),
      svc.from("worker_production").select("*").eq("worker_id", workerId).order("created_at", { ascending: false }).limit(500),
      svc.from("worker_adjustments").select("*").eq("worker_id", workerId).order("created_at", { ascending: false }).limit(500),
    ]);
    const w = wRes.data as Worker | null;
    if (w && (w as any).active !== false) {
      const items = ((iRes.data as WorkerItem[]) ?? []).filter((i) => i.active);
      return (
        <WorkerPanel
          worker={{ id: w.id, name: w.name, photo: w.photo, phone: w.phone }}
          items={items}
          setCost={computeSetCost((iRes.data as WorkerItem[]) ?? [])}
          initialProduction={(pRes.data as ProductionRow[]) ?? []}
          initialAdjustments={(aRes.data as AdjustmentRow[]) ?? []}
        />
      );
    }
    // Stale / inactive — fall through to the login screen.
  }

  return <WorkerLogin />;
}
