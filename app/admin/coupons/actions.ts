"use server";

import { getServerSupabase } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/admin-auth";
import { revalidatePath } from "next/cache";

export interface CouponInput {
  code: string;
  type: "percent" | "flat";
  value: number;
  minOrder?: number;
  expiresAt?: string | null; // YYYY-MM-DD or null
  usageLimit?: number | null;
  active?: boolean;
}

export async function createCoupon(input: CouponInput) {
  await requireAdmin();
  const code = (input.code || "").trim().toUpperCase().replace(/\s+/g, "");
  if (!code) return { ok: false, error: "কুপন কোড দিন।" };
  const value = Number(input.value);
  if (!Number.isFinite(value) || value <= 0) return { ok: false, error: "সঠিক ভ্যালু দিন।" };

  const row = {
    code,
    type: input.type === "flat" ? "flat" : "percent",
    value,
    min_order: Math.max(0, Number(input.minOrder) || 0),
    expires_at: input.expiresAt ? new Date(`${input.expiresAt}T23:59:59+06:00`).toISOString() : null,
    usage_limit: input.usageLimit && Number(input.usageLimit) > 0 ? Math.floor(Number(input.usageLimit)) : null,
    active: input.active !== false,
  };

  const supabase = getServerSupabase();
  const { error } = await supabase.from("coupons").insert(row);
  if (error) {
    if (error.code === "23505" || /duplicate|unique/i.test(error.message || "")) return { ok: false, error: "এই কোড আগে থেকেই আছে।" };
    if (error.code === "42P01") return { ok: false, error: "coupons টেবিল নেই — supabase-migration-coupons.sql চালান।" };
    return { ok: false, error: error.message };
  }
  revalidatePath("/admin/coupons");
  return { ok: true };
}

export async function setCouponActive(id: string, active: boolean) {
  await requireAdmin();
  const supabase = getServerSupabase();
  const { error } = await supabase.from("coupons").update({ active }).eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/coupons");
  return { ok: true };
}

export async function deleteCoupon(id: string) {
  await requireAdmin();
  const supabase = getServerSupabase();
  const { error } = await supabase.from("coupons").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/coupons");
  return { ok: true };
}
