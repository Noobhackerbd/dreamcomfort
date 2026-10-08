// lib/customer-auth.ts — storefront customer session helpers.
// Customers authenticate via Supabase Auth (email + password). We read the session with
// the cookie-based SSR client, then load their profile with the service-role client.
// (Admin routes remain protected by ADMIN_ALLOWED_EMAILS in middleware — a customer
// session can never reach /admin.)

import "server-only";
import { cache } from "react";
import { getSupabaseServerClient } from "@/lib/supabase/ssr-server";
import { getServerSupabase } from "@/lib/supabase/server";
import { toLocalBdPhone } from "@/lib/carrybee";

export interface CustomerProfile {
  id: string;
  name: string | null;
  phone: string | null;
  email: string | null;
}

export interface CustomerSession {
  userId: string;
  email: string | null;
  profile: CustomerProfile | null;
  /**
   * Phone number PROVEN by SMS code (Supabase Auth phone, confirmed via OTP) — or null.
   * SECURITY: use ONLY this (never profile.phone, which the customer can type freely)
   * to decide which phone-matched orders an account may see.
   */
  verifiedPhone: string | null;
}

/** Orders store phone as 8801XXXXXXXXX; return both that and the local 01XXXXXXXXX form. */
export function phoneVariants(raw?: string | null): string[] {
  const local = toLocalBdPhone(raw || "");
  if (!/^01\d{9}$/.test(local)) return [];
  return [local, "88" + local, "+88" + local];
}

/**
 * The signed-in customer, or null. Never throws.
 * Wrapped in React cache() so multiple calls within a single request/render
 * (e.g. the account page + getMyOrders) share ONE auth round trip instead of two.
 */
export const getCustomerSession = cache(async (): Promise<CustomerSession | null> => {
  try {
    const sb = getSupabaseServerClient();
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return null;
    let profile: CustomerProfile | null = null;
    try {
      const svc = getServerSupabase();
      const { data } = await svc.from("customer_profiles").select("id, name, phone, email").eq("id", user.id).maybeSingle();
      if (data) profile = data as CustomerProfile;
    } catch { /* table not migrated yet */ }
    const verifiedPhone = user.phone && (user as any).phone_confirmed_at ? String(user.phone) : null;
    return { userId: user.id, email: user.email ?? null, profile, verifiedPhone };
  } catch {
    return null;
  }
});

/**
 * SECURITY: may this account see this order?
 *   1) placed while logged into this account (orders.user_id), or
 *   2) its phone matches a number PROVEN by SMS code (session.verifiedPhone).
 * NEVER the free-text profile phone — anyone could type someone else's number there.
 */
export function canSeeOrder(session: { userId: string; verifiedPhone: string | null } | null, order: any): boolean {
  if (!session || !order) return false;
  if (order.user_id && order.user_id === session.userId) return true;
  const variants = phoneVariants(session.verifiedPhone);
  return variants.length > 0 && variants.includes(String(order.customer_phone ?? ""));
}
