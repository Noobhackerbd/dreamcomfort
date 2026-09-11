"use server";

// app/account/actions.ts — customer account server actions (Supabase Auth email+password).

import { getSupabaseServerClient } from "@/lib/supabase/ssr-server";
import { getServerSupabase } from "@/lib/supabase/server";
import { getCustomerSession, phoneVariants } from "@/lib/customer-auth";
import { toLocalBdPhone } from "@/lib/carrybee";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://dreamcomfortbd.com";

function cleanPhone(raw: string): string | null {
  const local = toLocalBdPhone(raw || "");
  return /^01\d{9}$/.test(local) ? "88" + local : null; // stored as 8801XXXXXXXXX (matches orders)
}

export async function registerCustomer(input: { name: string; phone: string; email: string; password: string }) {
  const name = (input.name || "").trim();
  const email = (input.email || "").trim().toLowerCase();
  const phone = cleanPhone(input.phone);
  if (!name) return { ok: false, error: "নাম দিন।" };
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { ok: false, error: "সঠিক ইমেইল দিন।" };
  if (!phone) return { ok: false, error: "সঠিক মোবাইল নম্বর দিন (০১XXXXXXXXX)।" };
  if ((input.password || "").length < 6) return { ok: false, error: "পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে।" };

  const sb = getSupabaseServerClient();
  const { data, error } = await sb.auth.signUp({
    email,
    password: input.password,
    options: { data: { name, phone }, emailRedirectTo: `${SITE_URL}/account` },
  });
  if (error) {
    const msg = /registered|already/i.test(error.message) ? "এই ইমেইল দিয়ে ইতিমধ্যে অ্যাকাউন্ট আছে — লগইন করুন।" : error.message;
    return { ok: false, error: msg };
  }
  const userId = data.user?.id;
  if (userId) {
    try {
      const svc = getServerSupabase();
      await svc.from("customer_profiles").upsert({ id: userId, name, phone, email, updated_at: new Date().toISOString() });
    } catch { /* profile table not migrated yet — account still works */ }
  }
  // If email confirmation is OFF in Supabase, a session is returned and the user is logged in.
  return { ok: true, needsVerify: !data.session };
}

export async function loginCustomer(input: { email: string; password: string }) {
  const email = (input.email || "").trim().toLowerCase();
  if (!email || !input.password) return { ok: false, error: "ইমেইল ও পাসওয়ার্ড দিন।" };
  const sb = getSupabaseServerClient();
  const { error } = await sb.auth.signInWithPassword({ email, password: input.password });
  if (error) {
    const msg = /confirm/i.test(error.message) ? "আগে ইমেইল ভেরিফাই করুন।" : /invalid/i.test(error.message) ? "ইমেইল বা পাসওয়ার্ড ভুল।" : error.message;
    return { ok: false, error: msg };
  }
  return { ok: true };
}

export async function logoutCustomer() {
  const sb = getSupabaseServerClient();
  await sb.auth.signOut();
  return { ok: true };
}

export async function forgotPassword(email: string) {
  const e = (email || "").trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e)) return { ok: false, error: "সঠিক ইমেইল দিন।" };
  const sb = getSupabaseServerClient();
  const { error } = await sb.auth.resetPasswordForEmail(e, { redirectTo: `${SITE_URL}/account/reset` });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function updateProfile(input: { name: string; phone: string }) {
  const session = await getCustomerSession();
  if (!session) return { ok: false, error: "লগইন করুন।" };
  const name = (input.name || "").trim();
  const phone = cleanPhone(input.phone);
  if (!name) return { ok: false, error: "নাম দিন।" };
  if (!phone) return { ok: false, error: "সঠিক মোবাইল নম্বর দিন।" };
  try {
    const svc = getServerSupabase();
    await svc.from("customer_profiles").upsert({ id: session.userId, name, phone, email: session.email, updated_at: new Date().toISOString() });
  } catch (e: any) {
    return { ok: false, error: e?.message ?? "সেভ ব্যর্থ।" };
  }
  return { ok: true };
}

/** One order's full detail — ONLY if it belongs to the signed-in customer's phone. */
export async function getMyOrderDetail(orderNumber: string) {
  const session = await getCustomerSession();
  if (!session?.profile?.phone) return { ok: false as const, error: "unauthorized" };
  const variants = phoneVariants(session.profile.phone);
  if (!variants.length) return { ok: false as const, error: "unauthorized" };
  try {
    const svc = getServerSupabase();
    const { data: order } = await svc
      .from("orders")
      .select("*, order_items(*)")
      .eq("order_number", (orderNumber || "").trim())
      .maybeSingle();
    if (!order) return { ok: false as const, error: "not-found" };
    // Security: never return an order that isn't this customer's.
    if (!variants.includes(String((order as any).customer_phone))) return { ok: false as const, error: "forbidden" };
    let items: any[] = (order as any).order_items ?? [];
    if (!items.length) {
      const { data } = await svc.from("order_items").select("*").eq("order_id", (order as any).id);
      items = data ?? [];
    }
    return { ok: true as const, order, items };
  } catch (e: any) {
    return { ok: false as const, error: e?.message ?? "error" };
  }
}

/** Orders for the signed-in customer, matched by their profile phone. */
export async function getMyOrders() {
  const session = await getCustomerSession();
  if (!session?.profile?.phone) return { ok: true, orders: [] as any[] };
  const variants = phoneVariants(session.profile.phone);
  if (!variants.length) return { ok: true, orders: [] as any[] };
  try {
    const svc = getServerSupabase();
    const { data } = await svc
      .from("orders")
      .select("id, order_number, status, total, created_at")
      .in("customer_phone", variants)
      .order("created_at", { ascending: false })
      .limit(100);
    return { ok: true, orders: (data ?? []) as any[] };
  } catch {
    return { ok: true, orders: [] as any[] };
  }
}
