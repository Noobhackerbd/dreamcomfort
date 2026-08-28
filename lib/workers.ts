// lib/workers.ts — types + helpers for the workers / production / salary module.
import { getServerSupabase } from "@/lib/supabase/server";

export interface WorkerItem {
  id: string;
  name: string;
  pcs_cost: number;
  in_set: boolean;
  sort_order: number;
  active: boolean;
}
export interface Worker {
  id: string;
  name: string;
  photo: string | null;
  phone: string | null;
  active: boolean;
  created_at: string;
}
export interface ProductionRow {
  id: string;
  worker_id: string;
  entry_date: string;
  kind: "set" | "piece";
  item_name: string | null;
  quantity: number;
  unit_cost: number;
  amount: number;
  note: string | null;
  created_at: string;
}
export interface AdjustmentRow {
  id: string;
  worker_id: string;
  entry_date: string;
  kind: "damage" | "bonus" | "payment";
  amount: number;
  note: string | null;
  created_at: string;
}

export interface WorkerSummary {
  produced: number;   // Σ production amounts
  bonus: number;
  damage: number;
  paid: number;
  earned: number;     // produced + bonus
  due: number;        // earned − damage − paid
  sets: number;       // total sets produced
  pieces: number;     // total individual pieces produced
}

/** True when the workers tables don't exist yet (migration not run). */
export function isMissingTable(err: any): boolean {
  return !!err && (err.code === "42P01" || /relation .* does not exist/i.test(err.message || ""));
}

/** Cost of one full set = sum of the in-set pieces' pcs_cost. */
export function setCost(items: WorkerItem[]): number {
  return items.filter((i) => i.in_set && i.active).reduce((s, i) => s + Number(i.pcs_cost || 0), 0);
}

export function summarize(prod: ProductionRow[], adj: AdjustmentRow[]): WorkerSummary {
  const produced = prod.reduce((s, p) => s + Number(p.amount || 0), 0);
  const sets = prod.filter((p) => p.kind === "set").reduce((s, p) => s + Number(p.quantity || 0), 0);
  const pieces = prod.filter((p) => p.kind === "piece").reduce((s, p) => s + Number(p.quantity || 0), 0);
  const bonus = adj.filter((a) => a.kind === "bonus").reduce((s, a) => s + Number(a.amount || 0), 0);
  const damage = adj.filter((a) => a.kind === "damage").reduce((s, a) => s + Number(a.amount || 0), 0);
  const paid = adj.filter((a) => a.kind === "payment").reduce((s, a) => s + Number(a.amount || 0), 0);
  const earned = produced + bonus;
  return { produced, bonus, damage, paid, earned, due: earned - damage - paid, sets, pieces };
}

export async function getWorkerItems(): Promise<{ items: WorkerItem[]; missing: boolean }> {
  const supabase = getServerSupabase();
  const { data, error } = await supabase.from("worker_items").select("*").order("sort_order", { ascending: true });
  if (error) return { items: [], missing: isMissingTable(error) };
  return { items: (data as WorkerItem[]) ?? [], missing: false };
}
