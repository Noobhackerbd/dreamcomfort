// lib/coupons.ts — discount-code validation for the store checkout.
import { getServerSupabase } from "@/lib/supabase/server";

export type CouponResult =
  | { ok: true; code: string; type: "percent" | "flat"; value: number; discount: number; label: string }
  | { ok: false; error: string };

function isMissingTable(error: any): boolean {
  return !!error && (error.code === "42P01" || /coupons/i.test(error.message || "") && /exist/i.test(error.message || ""));
}

/** Validate a coupon against a cart subtotal and compute the discount (never trusts the client). */
export async function validateCoupon(codeRaw: string, subtotal: number): Promise<CouponResult> {
  const code = (codeRaw || "").trim().toUpperCase();
  if (!code) return { ok: false, error: "কুপন কোড দিন।" };
  const sub = Math.max(0, Number(subtotal) || 0);

  const supabase = getServerSupabase();
  const { data, error } = await supabase.from("coupons").select("*").eq("code", code).maybeSingle();
  if (error) {
    if (isMissingTable(error)) return { ok: false, error: "কুপন সিস্টেম চালু নেই।" };
    return { ok: false, error: "যাচাই করা যায়নি।" };
  }
  if (!data) return { ok: false, error: "কুপন কোড সঠিক নয়।" };
  if (!data.active) return { ok: false, error: "এই কুপন আর সক্রিয় নেই।" };
  if (data.expires_at && new Date(data.expires_at).getTime() < Date.now()) return { ok: false, error: "কুপনের মেয়াদ শেষ।" };
  if (data.usage_limit != null && Number(data.used_count || 0) >= Number(data.usage_limit)) return { ok: false, error: "কুপনের লিমিট শেষ হয়ে গেছে।" };
  if (sub < Number(data.min_order || 0)) return { ok: false, error: `ন্যূনতম অর্ডার ৳${Math.round(Number(data.min_order))}।` };

  const type: "percent" | "flat" = data.type === "flat" ? "flat" : "percent";
  const value = Number(data.value) || 0;
  let discount = type === "percent" ? Math.round((sub * value) / 100) : Math.round(value);
  discount = Math.max(0, Math.min(discount, sub));
  const label = type === "percent" ? `${value}% ছাড়` : `৳${Math.round(value)} ছাড়`;
  return { ok: true, code, type, value, discount, label };
}

/** Increment a coupon's usage counter after a successful order. Best-effort. */
export async function redeemCoupon(codeRaw: string): Promise<void> {
  try {
    const code = (codeRaw || "").trim().toUpperCase();
    if (!code) return;
    const supabase = getServerSupabase();
    const { data } = await supabase.from("coupons").select("used_count").eq("code", code).maybeSingle();
    if (data) await supabase.from("coupons").update({ used_count: Number(data.used_count || 0) + 1 }).eq("code", code);
  } catch {
    /* ignore */
  }
}
