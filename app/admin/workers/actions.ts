"use server";

import { getServerSupabase } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/admin-auth";
import { setCost, WorkerItem } from "@/lib/workers";
import { revalidatePath } from "next/cache";

function today(): string {
  return new Date(new Date().getTime() + 6 * 3600 * 1000).toISOString().slice(0, 10); // Dhaka date
}

export async function createWorker(input: { name: string; photo?: string | null; phone?: string | null }) {
  await requireAdmin();
  const name = (input.name || "").trim();
  if (!name) return { ok: false, error: "নাম দিন।" };
  const supabase = getServerSupabase();
  const { data, error } = await supabase
    .from("workers")
    .insert({ name, photo: input.photo || null, phone: input.phone?.trim() || null })
    .select("id")
    .single();
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/workers");
  return { ok: true, id: data.id };
}

export async function updateWorker(id: string, patch: { name?: string; photo?: string | null; phone?: string | null; active?: boolean }) {
  await requireAdmin();
  const supabase = getServerSupabase();
  const p: Record<string, unknown> = {};
  if (patch.name != null) p.name = patch.name.trim();
  if (patch.photo !== undefined) p.photo = patch.photo || null;
  if (patch.phone !== undefined) p.phone = patch.phone?.trim() || null;
  if (patch.active != null) p.active = patch.active;
  const { error } = await supabase.from("workers").update(p).eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/workers");
  revalidatePath(`/admin/workers/${id}`);
  return { ok: true };
}

export async function deleteWorker(id: string) {
  await requireAdmin();
  const supabase = getServerSupabase();
  const { error } = await supabase.from("workers").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/workers");
  return { ok: true };
}

/** Save the piece list + costs (upsert existing, insert new). */
export async function saveWorkerItems(items: { id?: string; name: string; pcs_cost: number; in_set: boolean; sort_order: number }[]) {
  await requireAdmin();
  const supabase = getServerSupabase();
  const rows = (items || [])
    .map((it, i) => ({
      ...(it.id ? { id: it.id } : {}),
      name: (it.name || "").trim(),
      pcs_cost: Math.max(0, Number(it.pcs_cost) || 0),
      in_set: !!it.in_set,
      sort_order: Number(it.sort_order ?? i),
      active: true,
    }))
    .filter((r) => r.name);
  if (rows.length === 0) return { ok: false, error: "কমপক্ষে একটি পিস দিন।" };
  const { error } = await supabase.from("worker_items").upsert(rows, { onConflict: "name" });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/workers/items");
  revalidatePath("/admin/workers");
  return { ok: true };
}

export async function deleteWorkerItem(id: string) {
  await requireAdmin();
  const supabase = getServerSupabase();
  const { error } = await supabase.from("worker_items").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/workers/items");
  return { ok: true };
}

/** Add a production entry (a set, or a quantity of one piece). Cost is computed server-side. */
export async function addProduction(
  workerId: string,
  input: { kind: "set" | "piece"; itemId?: string | null; quantity: number; date?: string; note?: string }
) {
  await requireAdmin();
  const supabase = getServerSupabase();
  const qty = Math.max(1, Math.floor(Number(input.quantity) || 1));
  const { data: items } = await supabase.from("worker_items").select("*").order("sort_order", { ascending: true });
  const list = (items as WorkerItem[]) ?? [];

  let unitCost = 0;
  let itemName = "";
  let itemId: string | null = null;
  if (input.kind === "set") {
    unitCost = setCost(list);
    itemName = "১ সেট";
  } else {
    const it = list.find((x) => x.id === input.itemId);
    if (!it) return { ok: false, error: "পিস নির্বাচন করুন।" };
    unitCost = Number(it.pcs_cost || 0);
    itemName = it.name;
    itemId = it.id;
  }
  const amount = qty * unitCost;
  const { error } = await supabase.from("worker_production").insert({
    worker_id: workerId,
    entry_date: input.date || today(),
    kind: input.kind,
    item_id: itemId,
    item_name: itemName,
    quantity: qty,
    unit_cost: unitCost,
    amount,
    note: input.note?.trim() || null,
  });
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/admin/workers/${workerId}`);
  revalidatePath("/admin/workers");
  return { ok: true, amount };
}

export async function deleteProduction(id: string, workerId: string) {
  await requireAdmin();
  const supabase = getServerSupabase();
  const { error } = await supabase.from("worker_production").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/admin/workers/${workerId}`);
  revalidatePath("/admin/workers");
  return { ok: true };
}

/** Add a damage cut, bonus, or payment (পরিশোধ). */
export async function addAdjustment(
  workerId: string,
  input: { kind: "damage" | "bonus" | "payment"; amount: number; date?: string; note?: string }
) {
  await requireAdmin();
  const amount = Math.max(0, Number(input.amount) || 0);
  if (amount <= 0) return { ok: false, error: "সঠিক টাকা দিন।" };
  const supabase = getServerSupabase();
  const { error } = await supabase.from("worker_adjustments").insert({
    worker_id: workerId,
    entry_date: input.date || today(),
    kind: input.kind,
    amount,
    note: input.note?.trim() || null,
  });
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/admin/workers/${workerId}`);
  revalidatePath("/admin/workers");
  return { ok: true };
}

export async function deleteAdjustment(id: string, workerId: string) {
  await requireAdmin();
  const supabase = getServerSupabase();
  const { error } = await supabase.from("worker_adjustments").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/admin/workers/${workerId}`);
  revalidatePath("/admin/workers");
  return { ok: true };
}
