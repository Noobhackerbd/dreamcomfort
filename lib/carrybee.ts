// lib/carrybee.ts — CarryBee courier integration (mirrors the WooCommerce plugin).
// Auth is header-based: Client-ID / Client-Secret / Client-Context on every request.
// Endpoints (v2):
//   POST api/v2/orders                       → create consignment
//   GET  api/v2/orders/{consignment}/details → status
//   GET  api/v2/stores                       → merchant stores
//
// Credentials are managed from the admin Settings page (settings table, key "carrybee")
// and fall back to CARRYBEE_* env vars:
//   CARRYBEE_ENV = production | sandbox   (default production)
//   CARRYBEE_CLIENT_ID / CARRYBEE_CLIENT_SECRET / CARRYBEE_CLIENT_CONTEXT
//   CARRYBEE_STORE_ID   (default merchant store id used for new parcels)

import { getCarryBeeSettings } from "@/lib/settings";

interface CbConfig {
  env: string;
  clientId: string;
  clientSecret: string;
  clientContext: string;
  storeId: string;
  baseUrl: string;
  configured: boolean;
}

/** Resolve the active CarryBee config from admin settings (with env fallback). */
async function getConfig(): Promise<CbConfig> {
  const s = await getCarryBeeSettings();
  const env = (s.env || "production").toLowerCase();
  const baseUrl =
    env === "sandbox" ? "https://sandbox.carrybee.com/" : "https://developers.carrybee.com/";
  return {
    env,
    clientId: s.clientId || "",
    clientSecret: s.clientSecret || "",
    clientContext: s.clientContext || "",
    storeId: s.storeId || "",
    baseUrl,
    configured: !!(s.clientId && s.clientSecret && s.clientContext),
  };
}

export async function carrybeeConfigured(): Promise<boolean> {
  const cfg = await getConfig();
  return cfg.configured;
}

function headers(cfg: CbConfig) {
  return {
    "Content-Type": "application/json",
    "Client-ID": cfg.clientId,
    "Client-Secret": cfg.clientSecret,
    "Client-Context": cfg.clientContext,
  };
}

/** Normalize a stored BD phone (8801XXXXXXXXX / 01XXXXXXXXX / +880…) to local 01XXXXXXXXX. */
export function toLocalBdPhone(raw: string): string {
  let d = (raw || "").replace(/\D/g, "");
  if (d.startsWith("00")) d = d.slice(2);
  if (d.startsWith("880")) d = "0" + d.slice(3); // 8801XXXXXXXXX → 01XXXXXXXXX
  else if (d.startsWith("1") && d.length === 10) d = "0" + d; // 1XXXXXXXXX → 01…
  return d;
}

export interface CarryBeeParcelInput {
  recipientName: string;
  recipientPhone: string;
  recipientAddress: string;
  collectableAmount: number; // COD amount (BDT)
  itemQuantity?: number;
  itemWeightGrams?: number; // default 500
  merchantOrderId?: string;
  specialInstruction?: string;
  productDescription?: string;
  storeId?: string; // overrides default
  recipientSecondaryPhone?: string;
  productType?: number; // 1..; default 2 (Parcel)
  deliveryType?: number; // default 1
  cityId?: number;
  zoneId?: number;
  areaId?: number;
}

export interface CarryBeeResult {
  ok: boolean;
  consignmentId?: string;
  deliveryFee?: number;
  status?: string;
  error?: string;
  raw?: any;
}

function extractError(data: any, fallback: string): string {
  if (!data) return fallback;
  if (typeof data.message === "string" && data.message) return data.message;
  // v2 validation errors: { causes: { field: [msg] } } or { errors: {...} }
  const bag = data.causes || data.errors;
  if (bag && typeof bag === "object") {
    const msgs: string[] = [];
    for (const k of Object.keys(bag)) {
      const v = (bag as any)[k];
      if (Array.isArray(v)) msgs.push(...v.map(String));
      else if (typeof v === "string") msgs.push(v);
    }
    if (msgs.length) return msgs.join(" · ");
  }
  return fallback;
}

/** Create a CarryBee consignment (parcel) for an order. */
export async function createParcel(input: CarryBeeParcelInput): Promise<CarryBeeResult> {
  const cfg = await getConfig();
  if (!cfg.configured) return { ok: false, error: "CarryBee কনফিগার করা হয়নি।" };
  const storeId = input.storeId || cfg.storeId;
  if (!storeId) return { ok: false, error: "CarryBee স্টোর আইডি সেট করা নেই।" };

  const weight = Math.max(1, Math.round(input.itemWeightGrams || 500));
  const qty = Math.max(1, Math.floor(input.itemQuantity || 1));

  const body: Record<string, unknown> = {
    store_id: storeId,
    delivery_type: input.deliveryType ?? 1,
    product_type: input.productType ?? 2,
    recipient_name: input.recipientName,
    recipient_phone: toLocalBdPhone(input.recipientPhone),
    recipient_address: input.recipientAddress,
    item_weight: weight, // grams
    item_quantity: qty,
    collectable_amount: Math.max(0, Math.round(input.collectableAmount)),
  };
  if (input.merchantOrderId) body.merchant_order_id = input.merchantOrderId;
  if (input.specialInstruction) body.special_instruction = input.specialInstruction;
  if (input.productDescription) body.product_description = input.productDescription;
  if (input.recipientSecondaryPhone) body.recipient_secendary_phone = toLocalBdPhone(input.recipientSecondaryPhone);
  if (input.cityId && input.cityId > 0) body.city_id = input.cityId;
  if (input.zoneId && input.zoneId > 0) body.zone_id = input.zoneId;
  if (input.areaId && input.areaId > 0) body.area_id = input.areaId;

  try {
    const res = await fetch(cfg.baseUrl + "api/v2/orders", {
      method: "POST",
      headers: headers(cfg),
      body: JSON.stringify(body),
      cache: "no-store",
    });
    const data = await res.json().catch(() => ({}));

    if (res.status !== 200 && res.status !== 201) {
      return { ok: false, error: extractError(data, "CarryBee অর্ডার তৈরি ব্যর্থ।"), raw: data };
    }
    if (data?.error === true) {
      return { ok: false, error: extractError(data, "CarryBee অর্ডার তৈরি ব্যর্থ।"), raw: data };
    }

    const order = data?.data?.order ?? data?.data ?? {};
    const consignmentId = String(order.consignment_id ?? "");
    if (!consignmentId) {
      return { ok: false, error: "CarryBee কনসাইনমেন্ট আইডি পাওয়া যায়নি।", raw: data };
    }
    return {
      ok: true,
      consignmentId,
      deliveryFee: order.delivery_fee != null ? Number(order.delivery_fee) : undefined,
      status: order.order_status ? String(order.order_status) : "Created",
      raw: data,
    };
  } catch (e: any) {
    return { ok: false, error: e?.message ?? "CarryBee নেটওয়ার্ক সমস্যা।" };
  }
}

/** Fetch current courier status for a consignment. */
export async function getParcelStatus(
  consignmentId: string
): Promise<{ ok: boolean; status?: string; error?: string; raw?: any }> {
  const cfg = await getConfig();
  if (!cfg.configured) return { ok: false, error: "CarryBee কনফিগার করা হয়নি।" };
  try {
    const res = await fetch(
      cfg.baseUrl + `api/v2/orders/${encodeURIComponent(consignmentId)}/details`,
      { headers: headers(cfg), cache: "no-store" }
    );
    const data = await res.json().catch(() => ({}));
    if (res.status !== 200) return { ok: false, error: extractError(data, "স্ট্যাটাস আনতে ব্যর্থ।"), raw: data };
    const d = data?.data ?? {};
    const status = d.order_status ?? d.transfer_status ?? data?.status;
    return { ok: true, status: status ? String(status) : undefined, raw: data };
  } catch (e: any) {
    return { ok: false, error: e?.message ?? "নেটওয়ার্ক সমস্যা।" };
  }
}

export interface CbOption { id: number; name: string }

function normalizeList(data: any, key: string): CbOption[] {
  const arr = data?.data?.[key] ?? data?.data ?? data?.[key] ?? [];
  if (!Array.isArray(arr)) return [];
  return arr
    .map((x: any) => ({
      id: Number(x.id ?? x.city_id ?? x.zone_id ?? x.area_id ?? 0),
      name: String(x.name ?? x.title ?? x.city_name ?? x.zone_name ?? x.area_name ?? ""),
    }))
    .filter((o: CbOption) => o.id > 0 && o.name);
}

/** List merchant stores (for finding your store_id). */
export async function listStores(): Promise<{ ok: boolean; stores?: any[]; error?: string }> {
  const cfg = await getConfig();
  if (!cfg.configured) return { ok: false, error: "CarryBee কনফিগার করা হয়নি।" };
  try {
    const res = await fetch(cfg.baseUrl + "api/v2/stores", { headers: headers(cfg), cache: "no-store" });
    const data = await res.json().catch(() => ({}));
    if (res.status !== 200) return { ok: false, error: extractError(data, "লোড ব্যর্থ।") };
    const arr = data?.data?.stores ?? data?.data ?? data?.stores ?? [];
    return { ok: true, stores: Array.isArray(arr) ? arr : [] };
  } catch (e: any) {
    return { ok: false, error: e?.message ?? "নেটওয়ার্ক সমস্যা।" };
  }
}

export async function listCities(): Promise<{ ok: boolean; options?: CbOption[]; error?: string }> {
  const cfg = await getConfig();
  if (!cfg.configured) return { ok: false, error: "CarryBee কনফিগার করা হয়নি।" };
  try {
    const res = await fetch(cfg.baseUrl + "api/v2/cities", { headers: headers(cfg), cache: "no-store" });
    const data = await res.json().catch(() => ({}));
    if (res.status !== 200) return { ok: false, error: extractError(data, "শহর লোড ব্যর্থ।") };
    return { ok: true, options: normalizeList(data, "cities") };
  } catch (e: any) {
    return { ok: false, error: e?.message ?? "নেটওয়ার্ক সমস্যা।" };
  }
}

export async function listZones(cityId: number): Promise<{ ok: boolean; options?: CbOption[]; error?: string }> {
  const cfg = await getConfig();
  if (!cfg.configured) return { ok: false, error: "CarryBee কনফিগার করা হয়নি।" };
  try {
    const res = await fetch(cfg.baseUrl + `api/v2/cities/${cityId}/zones`, { headers: headers(cfg), cache: "no-store" });
    const data = await res.json().catch(() => ({}));
    if (res.status !== 200) return { ok: false, error: extractError(data, "জোন লোড ব্যর্থ।") };
    return { ok: true, options: normalizeList(data, "zones") };
  } catch (e: any) {
    return { ok: false, error: e?.message ?? "নেটওয়ার্ক সমস্যা।" };
  }
}

export async function listAreas(cityId: number, zoneId: number): Promise<{ ok: boolean; options?: CbOption[]; error?: string }> {
  const cfg = await getConfig();
  if (!cfg.configured) return { ok: false, error: "CarryBee কনফিগার করা হয়নি।" };
  try {
    const res = await fetch(cfg.baseUrl + `api/v2/cities/${cityId}/zones/${zoneId}/areas`, { headers: headers(cfg), cache: "no-store" });
    const data = await res.json().catch(() => ({}));
    if (res.status !== 200) return { ok: false, error: extractError(data, "এরিয়া লোড ব্যর্থ।") };
    return { ok: true, options: normalizeList(data, "areas") };
  } catch (e: any) {
    return { ok: false, error: e?.message ?? "নেটওয়ার্ক সমস্যা।" };
  }
}

/** Fetch the print label / POD (PDF or HTML) for one or more consignments. */
export async function fetchPrintPod(
  consignmentIds: string
): Promise<{ ok: boolean; contentType?: string; body?: ArrayBuffer; error?: string }> {
  const cfg = await getConfig();
  if (!cfg.configured) return { ok: false, error: "CarryBee কনফিগার করা হয়নি।" };
  try {
    const url = cfg.baseUrl + "api/v2/order-print-pod?consignment_ids=" + encodeURIComponent(consignmentIds);
    const res = await fetch(url, { headers: headers(cfg), cache: "no-store" });
    const contentType = res.headers.get("content-type") || "application/octet-stream";
    if (res.status !== 200 && res.status !== 201) {
      const t = await res.text().catch(() => "");
      return { ok: false, error: t.slice(0, 200) || "লেবেল আনতে ব্যর্থ।" };
    }
    const body = await res.arrayBuffer();
    return { ok: true, contentType, body };
  } catch (e: any) {
    return { ok: false, error: e?.message ?? "নেটওয়ার্ক সমস্যা।" };
  }
}
