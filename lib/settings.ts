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

export interface CarryBeeSettings {
  env: string; // "production" | "sandbox"
  clientId: string;
  clientSecret: string;
  clientContext: string;
  storeId: string;
  autoOnConfirm: boolean; // auto-create consignment when an order is confirmed
  defaultWeight: number; // default parcel weight (kg) sent to CarryBee
}

export interface AiSettings {
  apiKey: string;
  model: string;
}

export interface MetaSettings {
  pixelId: string;
  capiToken: string;
  testEventCode: string;
}

export interface TikTokSettings {
  pixelId: string;
  accessToken: string;
  testEventCode: string;
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

/**
 * CarryBee courier credentials. Stored in the `settings` table (key "carrybee")
 * and editable from the admin Settings page. Falls back to CARRYBEE_* env vars
 * for any field the admin hasn't set, so an .env-only setup keeps working too.
 */
export function getCarryBeeSettings(): Promise<CarryBeeSettings> {
  return readSetting<CarryBeeSettings>("carrybee", {
    env: process.env.CARRYBEE_ENV || "production",
    clientId: process.env.CARRYBEE_CLIENT_ID || "",
    clientSecret: process.env.CARRYBEE_CLIENT_SECRET || "",
    clientContext: process.env.CARRYBEE_CLIENT_CONTEXT || "",
    storeId: process.env.CARRYBEE_STORE_ID || "",
    autoOnConfirm: process.env.CARRYBEE_AUTO_CONFIRM === "1",
    defaultWeight: Number(process.env.CARRYBEE_DEFAULT_WEIGHT) || 1.5,
  });
}

/** Meta Pixel + Conversions API settings (editable from admin, env fallback). */
export function getMetaSettings(): Promise<MetaSettings> {
  return readSetting<MetaSettings>("meta", {
    pixelId: process.env.NEXT_PUBLIC_META_PIXEL_ID || "",
    capiToken: process.env.META_CAPI_ACCESS_TOKEN || "",
    testEventCode: process.env.META_TEST_EVENT_CODE || "",
  });
}

/** TikTok Pixel + Events API settings (editable from admin, env fallback). */
export function getTikTokSettings(): Promise<TikTokSettings> {
  return readSetting<TikTokSettings>("tiktok", {
    pixelId: process.env.NEXT_PUBLIC_TIKTOK_PIXEL_ID || "DA6Q9UBC77UES9741GT0",
    accessToken: process.env.TIKTOK_ACCESS_TOKEN || "",
    testEventCode: process.env.TIKTOK_TEST_EVENT_CODE || "",
  });
}

/** Anthropic API settings for the AI order-screenshot reader. */
export function getAiSettings(): Promise<AiSettings> {
  return readSetting<AiSettings>("ai", {
    apiKey: process.env.ANTHROPIC_API_KEY || "",
    model: process.env.AI_MODEL || "claude-sonnet-5",
  });
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
