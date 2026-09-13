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

export interface MobileSettings {
  apiKey: string; // access token the Android app uses (Bearer). Empty = mobile API disabled.
}

export interface NavIconsSettings {
  category: string; // raw SVG markup for the bottom-nav "category" tab. "" = default box icon.
}

export interface FlashSaleSettings {
  title: string;        // heading shown above the flash-sale row
  productIds: string[]; // product ids (order preserved) shown in the homepage flash-sale strip
  endsAt: string;       // ISO end time for the countdown. "" = no timer / never ends
}

export interface HomeStripSettings {
  gif: string;   // URL of a slim GIF/image strip shown right under the hero banner. "" = hidden
  link: string;  // optional destination when the strip is tapped
}

export interface FeaturedSettings {
  productIds: string[]; // admin hand-picked "featured" products (order preserved). Best-sellers fill the rest.
}

export interface BdCourierSettings {
  apiToken: string; // bdcourier.com API token for the customer courier-ratio (fraud) check
  suppressBelowRatio: number; // 0 = off. Orders from customers whose courier success rate
                              // is below this % don't fire the Meta/TikTok Purchase event.
}

export interface HomeBanner {
  image: string;
  link?: string; // optional destination when the banner is tapped
}
export interface HomeBannersSettings {
  hero: HomeBanner[];   // top auto-slider
  offers: HomeBanner[]; // "special offer" slider lower down
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

/** Android/mobile app API access token (editable from admin, env fallback). */
export function getMobileSettings(): Promise<MobileSettings> {
  return readSetting<MobileSettings>("mobile", {
    apiKey: process.env.MOBILE_API_KEY || "",
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

/** BD Courier (bdcourier.com) API token for the customer courier-ratio / fraud check. */
export function getBdCourierSettings(): Promise<BdCourierSettings> {
  return readSetting<BdCourierSettings>("bdcourier", {
    apiToken: process.env.BDCOURIER_API_TOKEN || "",
    suppressBelowRatio: Number(process.env.BDCOURIER_SUPPRESS_BELOW) || 0,
  });
}

/** Store-homepage banner images (hero slider + offer slider). Editable from admin. */
export function getHomeBanners(): Promise<HomeBannersSettings> {
  return readSetting<HomeBannersSettings>("home_banners", { hero: [], offers: [] });
}

/** Custom bottom-nav icons uploaded from the admin panel (SVG). Empty = built-in default. */
export function getNavIcons(): Promise<NavIconsSettings> {
  return readSetting<NavIconsSettings>("nav_icons", { category: "" });
}

/** Homepage flash-sale strip — title + the products chosen from the admin panel. */
export function getFlashSale(): Promise<FlashSaleSettings> {
  return readSetting<FlashSaleSettings>("flash_sale", { title: "ফ্ল্যাশ সেল", productIds: [], endsAt: "" });
}

/** Slim GIF/image strip shown right under the hero banner. Uploaded from admin. */
export function getHomeStrip(): Promise<HomeStripSettings> {
  return readSetting<HomeStripSettings>("home_strip", { gif: "", link: "" });
}

/** Admin hand-picked featured products (order preserved). Best-sellers fill remaining slots. */
export function getFeatured(): Promise<FeaturedSettings> {
  return readSetting<FeaturedSettings>("featured", { productIds: [] });
}

/** Per-category image URLs (uploaded from admin), keyed by category id. */
export function getCategoryImages(): Promise<Record<string, string>> {
  return readSetting<Record<string, string>>("category_images", {});
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

/** Worker-panel PIN (public /worker access gate). Empty = open (no PIN). */
export async function getWorkerPin(): Promise<string> {
  const s = await readSetting<{ pin: string }>("worker_panel", { pin: process.env.WORKER_PANEL_PIN || "" });
  return (s.pin || "").trim();
}
