"use server";

// app/account/address-actions.ts — saved delivery addresses for the signed-in customer.

import { getServerSupabase } from "@/lib/supabase/server";
import { getCustomerSession } from "@/lib/customer-auth";
import { toLocalBdPhone } from "@/lib/carrybee";

export interface Address {
  id: string;
  label: string | null;
  name: string | null;
  phone: string | null;
  address_line: string | null;
  area: string | null;
  city: string | null;
  is_default: boolean;
}

export async function listAddresses(): Promise<{ ok: boolean; addresses: Address[] }> {
  const session = await getCustomerSession();
  if (!session) return { ok: false, addresses: [] };
  try {
    const svc = getServerSupabase();
    const { data } = await svc
      .from("customer_addresses")
      .select("id, label, name, phone, address_line, area, city, is_default")
      .eq("user_id", session.userId)
      .order("is_default", { ascending: false })
      .order("created_at", { ascending: false });
    return { ok: true, addresses: (data ?? []) as Address[] };
  } catch {
    return { ok: true, addresses: [] };
  }
}

export async function saveAddress(input: {
  id?: string; label?: string; name: string; phone: string; address_line: string; area?: string; city?: string; is_default?: boolean;
}) {
  const session = await getCustomerSession();
  if (!session) return { ok: false, error: "লগইন করুন।" };
  const name = (input.name || "").trim();
  const local = toLocalBdPhone(input.phone || "");
  const phone = /^01\d{9}$/.test(local) ? "88" + local : "";
  const address_line = (input.address_line || "").trim();
  if (!name) return { ok: false, error: "নাম দিন।" };
  if (!phone) return { ok: false, error: "সঠিক মোবাইল নম্বর দিন।" };
  if (address_line.length < 4) return { ok: false, error: "সম্পূর্ণ ঠিকানা দিন।" };

  try {
    const svc = getServerSupabase();
    const row = {
      user_id: session.userId,
      label: (input.label || "").trim() || null,
      name, phone, address_line,
      area: (input.area || "").trim() || null,
      city: (input.city || "").trim() || null,
      is_default: !!input.is_default,
    };
    // If marking default, clear the others first.
    if (row.is_default) {
      await svc.from("customer_addresses").update({ is_default: false }).eq("user_id", session.userId);
    }
    if (input.id) {
      const { error } = await svc.from("customer_addresses").update(row).eq("id", input.id).eq("user_id", session.userId);
      if (error) return { ok: false, error: error.message };
    } else {
      const { error } = await svc.from("customer_addresses").insert(row);
      if (error) return { ok: false, error: error.message };
    }
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e?.message ?? "সেভ ব্যর্থ।" };
  }
}

export async function deleteAddress(id: string) {
  const session = await getCustomerSession();
  if (!session) return { ok: false, error: "লগইন করুন।" };
  try {
    const svc = getServerSupabase();
    await svc.from("customer_addresses").delete().eq("id", id).eq("user_id", session.userId);
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e?.message ?? "ব্যর্থ।" };
  }
}

export async function setDefaultAddress(id: string) {
  const session = await getCustomerSession();
  if (!session) return { ok: false, error: "লগইন করুন।" };
  try {
    const svc = getServerSupabase();
    await svc.from("customer_addresses").update({ is_default: false }).eq("user_id", session.userId);
    await svc.from("customer_addresses").update({ is_default: true }).eq("id", id).eq("user_id", session.userId);
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e?.message ?? "ব্যর্থ।" };
  }
}
