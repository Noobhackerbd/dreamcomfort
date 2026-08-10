// lib/settings.ts — server-side settings loader (shipping fees, store info, SMS templates).
// Reads the `settings` table via the service-role client, with safe fallbacks to
// lib/config defaults so the app works even before Migration 2 is run.

import { getServerSupabase } from "@/lib/supabase/server";
import { SHIPPING, STORE, DeliveryArea } from "@/lib/config";
import { DEFAULT_SMS_TEMPLATES, SmsTemplates } from "@/lib/sms/templates";

export interface ShippingSettings {
  insideDhaka: number;
  outsideDhaka: number;
}

export interface StoreSettings {
  name: string;
  phone: string;
  email: string;
  facebook: string;
  address: string;
}

async function readSetting<T>(key: string, fallback: T): Promise<T> {
  try {
    const supabase = getServerSupabase();
    const { data } = await supabase.from("settings").select("value").eq("key", key).single();
    if (data?.value) return { ...fallback, ...(data.value as object) } as T;
  } catch {
    // table not present yet, or env missing — use fallback
  }
  return fallback;
}

export function getShippingSettings(): Promise<ShippingSettings> {
  return readSetting<ShippingSettings>("shipping", {
    insideDhaka: SHIPPING.insideDhaka,
    outsideDhaka: SHIPPING.outsideDhaka,
  });
}

export function getStoreSettings(): Promise<StoreSettings> {
  return readSetting<StoreSettings>("store", {
    name: STORE.name,
    phone: STORE.phone,
    email: STORE.email,
    facebook: STORE.facebook,
    address: STORE.address,
  });
}

export function getSmsTemplates(): Promise<SmsTemplates> {
  return readSetting<SmsTemplates>("sms_templates", DEFAULT_SMS_TEMPLATES);
}

export async function resolveShippingFee(area: DeliveryArea): Promise<number> {
  const s = await getShippingSettings();
  return area === "outside" ? s.outsideDhaka : s.insideDhaka;
}

/** Persist a settings key (server action use). Throws on failure. */
export async function saveSetting(key: string, value: unknown): Promise<void> {
  const supabase = getServerSupabase();
  const { error } = await supabase
    .from("settings")
    .upsert({ key, value, updated_at: new Date().toISOString() });
  if (error) throw new Error(error.message);
}
