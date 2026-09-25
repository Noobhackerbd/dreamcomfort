"use server";

// Self-service worker panel: each worker logs in with their own PIN, then adds
// their own production entries. Every action derives the worker id from the
// signed-in cookie (never from client input), so a worker can only ever touch
// their own records.

import { cookies } from "next/headers";
import { getServerSupabase } from "@/lib/supabase/server";
import { setCost as computeSetCost, type WorkerItem } from "@/lib/workers";

const COOKIE = "dc_worker";

/** Dhaka (UTC+6) calendar date, YYYY-MM-DD. */
function today(): string {
  return new Date(Date.now() + 6 * 3600 * 1000).toISOString().slice(0, 10);
}

async function currentWorkerId(): Promise<string | null> {
  return cookies().get(COOKIE)?.value || null;
}

/** Log in with a per-worker PIN. Sets a 60-day httpOnly cookie on success. */
export async function loginWorker(pin: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const p = (pin || "").replace(/\s/g, "").trim();
  if (!p) return { ok: false, error: "পিন দিন।" };
  const svc = getServerSupabase();
  const { data, error } = await svc.from("workers").select("id, active, pin").eq("pin", p).limit(2);
  if (error) {
    if ((error as any).code === "42703" || /pin/i.test(error.message || "")) {
      return { ok: false, error: "পিন সেটআপ হয়নি — মালিককে বলুন।" };
    }
    return { ok: false, error: error.message };
  }
  const match = (data || []).find((w: any) => w.active !== false);
  if (!match) return { ok: false, error: "ভুল পিন।" };
  cookies().set(COOKIE, match.id, { path: "/worker", httpOnly: true, sameSite: "lax", maxAge: 60 * 86400 });
  return { ok: true };
}

export async function logoutWorker(): Promise<{ ok: true }> {
  cookies().set(COOKIE, "", { path: "/worker", maxAge: 0 });
  return { ok: true };
}

/** Add a production entry for the signed-in worker. Cost is computed server-side. */
export async function workerAddProduction(input: { kind: "set" | "piece"; itemId?: string | null; quantity: number; note?: string }) {
  const workerId = await currentWorkerId();
  if (!workerId) return { ok: false as const, error: "লগইন করুন।" };
  const svc = getServerSupabase();
  const qty = Math.max(1, Math.floor(Number(input.quantity) || 1));
  const { data: items } = await svc.from("worker_items").select("*").order("sort_order", { ascending: true });
  const list = (items as WorkerItem[]) ?? [];

  let unitCost = 0, itemName = "", itemId: string | null = null;
  if (input.kind === "set") { unitCost = computeSetCost(list); itemName = "১ সেট"; }
  else {
    const it = list.find((x) => x.id === input.itemId);
    if (!it) return { ok: false as const, error: "পিস নির্বাচন করুন।" };
    unitCost = Number(it.pcs_cost || 0); itemName = it.name; itemId = it.id;
  }
  const amount = qty * unitCost;
  const { data, error } = await svc
    .from("worker_production")
    .insert({ worker_id: workerId, entry_date: today(), kind: input.kind, item_id: itemId, item_name: itemName, quantity: qty, unit_cost: unitCost, amount, note: input.note?.trim() || null })
    .select("id, worker_id, entry_date, kind, item_name, quantity, unit_cost, amount, note, created_at")
    .single();
  if (error) return { ok: false as const, error: error.message };
  return { ok: true as const, row: data };
}

/** Delete one of the signed-in worker's OWN production entries. */
export async function workerDeleteProduction(id: string) {
  const workerId = await currentWorkerId();
  if (!workerId) return { ok: false as const, error: "লগইন করুন।" };
  const svc = getServerSupabase();
  const { data } = await svc.from("worker_production").select("worker_id").eq("id", id).single();
  if (!data || (data as any).worker_id !== workerId) return { ok: false as const, error: "অনুমতি নেই।" };
  const { error } = await svc.from("worker_production").delete().eq("id", id);
  if (error) return { ok: false as const, error: error.message };
  return { ok: true as const };
}

/** Fresh production + adjustments for the signed-in worker (used by the panel's live poll). */
export async function getWorkerPanel() {
  const workerId = await currentWorkerId();
  if (!workerId) return { ok: false as const };
  const svc = getServerSupabase();
  const [pRes, aRes] = await Promise.all([
    svc.from("worker_production").select("*").eq("worker_id", workerId).order("created_at", { ascending: false }).limit(500),
    svc.from("worker_adjustments").select("*").eq("worker_id", workerId).order("created_at", { ascending: false }).limit(500),
  ]);
  return { ok: true as const, production: pRes.data ?? [], adjustments: aRes.data ?? [] };
}
