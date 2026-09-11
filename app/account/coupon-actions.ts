"use server";

// app/account/coupon-actions.ts — active coupons a customer can use right now.

import { getServerSupabase } from "@/lib/supabase/server";

export interface PublicCoupon {
  code: string;
  type: "percent" | "flat";
  value: number;
  min_order: number;
  expires_at: string | null;
}

export async function getAvailableCoupons(): Promise<{ ok: boolean; coupons: PublicCoupon[] }> {
  try {
    const svc = getServerSupabase();
    const nowIso = new Date().toISOString();
    const { data } = await svc
      .from("coupons")
      .select("code, type, value, min_order, expires_at, usage_limit, used_count, active")
      .eq("active", true)
      .order("value", { ascending: false })
      .limit(50);
    const coupons = (data ?? [])
      .filter((c: any) => !c.expires_at || c.expires_at > nowIso)
      .filter((c: any) => c.usage_limit == null || Number(c.used_count || 0) < Number(c.usage_limit))
      .map((c: any) => ({ code: c.code, type: c.type, value: Number(c.value), min_order: Number(c.min_order || 0), expires_at: c.expires_at ?? null }));
    return { ok: true, coupons };
  } catch {
    return { ok: true, coupons: [] };
  }
}
