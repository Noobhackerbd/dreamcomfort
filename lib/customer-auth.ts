// lib/customer-auth.ts — storefront customer session helpers.
// Customers authenticate via Supabase Auth (email + password). We read the session with
// the cookie-based SSR client, then load their profile with the service-role client.
// (Admin routes remain protected by ADMIN_ALLOWED_EMAILS in middleware — a customer
// session can never reach /admin.)

import "server-only";
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
}

/** Orders store phone as 8801XXXXXXXXX; return both that and the local 01XXXXXXXXX form. */
export function phoneVariants(raw?: string | null): string[] {
  const local = toLocalBdPhone(raw || "");
  if (!/^01\d{9}$/.test(local)) return [];
  return [local, "88" + local, "+88" + local];
}

/** The signed-in customer, or null. Never throws. */
export async function getCustomerSession(): Promise<CustomerSession | null> {
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
    return { userId: user.id, email: user.email ?? null, profile };
  } catch {
    return null;
  }
}
