// lib/bdcourier.ts — BD Courier "order ratio" / fraud-check integration.
//
// Looks a customer's phone number up against the BD Courier API (api.bdcourier.com)
// and returns how many parcels that number has EVER had across the major couriers
// (Pathao, Steadfast, RedX, Paperfly …), how many were delivered (success) vs
// cancelled/returned, and the overall success ratio. Used in the admin order list so
// the owner can judge, before confirming, how reliable a new customer is.
//
// Auth: a single Bearer API token from a bdcourier.com account. Managed from the admin
// Settings page (settings table, key "bdcourier") with a BDCOURIER_API_TOKEN env fallback.

import { getBdCourierSettings } from "@/lib/settings";
import { toLocalBdPhone } from "@/lib/carrybee";

const API_URL = "https://api.bdcourier.com/courier-check";

export interface CourierBreakdown {
  name: string; // e.g. "pathao"
  total: number;
  success: number;
  cancelled: number;
  ratio: number; // 0–100 (integer)
}

export interface CourierRatio {
  phone: string; // normalized local 01XXXXXXXXX
  total: number;
  success: number;
  cancelled: number;
  ratio: number; // 0–100 (integer)
  couriers: CourierBreakdown[];
}

export type CourierRatioResult =
  | { ok: true; data: CourierRatio }
  | { ok: false; error: string };

export async function bdcourierConfigured(): Promise<boolean> {
  const s = await getBdCourierSettings();
  return !!s.apiToken;
}

function toNum(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

/** Pick the courier map out of the various response shapes the API has used. */
function pickCourierMap(body: any): Record<string, any> | null {
  if (!body || typeof body !== "object") return null;
  if (body.courierData && typeof body.courierData === "object") return body.courierData;
  if (body.data && typeof body.data === "object" && !Array.isArray(body.data)) {
    // { status:"success", data:{ pathao:{…}, summary:{…} } }
    return body.data;
  }
  // Sometimes the couriers sit at the top level next to a summary key.
  if (body.summary && typeof body.summary === "object") return body;
  return null;
}

/**
 * Fetch a customer's courier success ratio. Returns ok:false with a human message on
 * any failure (no token, network, bad number) so callers can degrade gracefully.
 */
export async function fetchCourierRatio(rawPhone: string): Promise<CourierRatioResult> {
  const s = await getBdCourierSettings();
  const token = (s.apiToken || "").trim();
  if (!token) return { ok: false, error: "BD Courier API token সেট করা নেই।" };

  const phone = toLocalBdPhone(rawPhone);
  if (!/^01\d{9}$/.test(phone)) return { ok: false, error: "সঠিক মোবাইল নম্বর নয়।" };

  let res: Response;
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 25000);
    res = await fetch(`${API_URL}?phone=${encodeURIComponent(phone)}`, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
      signal: ctrl.signal,
      cache: "no-store",
    });
    clearTimeout(t);
  } catch (e: any) {
    return { ok: false, error: e?.name === "AbortError" ? "সময় শেষ (timeout)।" : "নেটওয়ার্ক সমস্যা।" };
  }

  const text = await res.text();
  let body: any = null;
  try { body = text ? JSON.parse(text) : null; } catch { /* non-JSON */ }

  if (res.status === 401 || res.status === 403) return { ok: false, error: "API token ভুল বা মেয়াদ শেষ।" };
  if (res.status === 429) return { ok: false, error: "অনেক বেশি রিকোয়েস্ট — একটু পরে দেখুন।" };
  if (res.status !== 200) {
    const msg = body?.message || body?.error || `HTTP ${res.status}`;
    return { ok: false, error: typeof msg === "string" ? msg : `HTTP ${res.status}` };
  }

  const map = pickCourierMap(body);
  if (!map) {
    const msg = body?.message || body?.error;
    return { ok: false, error: typeof msg === "string" && msg ? msg : "কোনো ডেটা পাওয়া যায়নি।" };
  }

  // Per-courier breakdown (everything except the "summary" key that has parcels).
  const couriers: CourierBreakdown[] = [];
  for (const [key, val] of Object.entries(map)) {
    if (key === "summary" || !val || typeof val !== "object") continue;
    const total = toNum((val as any).total_parcel);
    if (total <= 0) continue;
    const success = toNum((val as any).success_parcel);
    const cancelled = Math.max(0, total - success);
    const ratio = total > 0 ? Math.round((success / total) * 100) : 0;
    couriers.push({ name: key, total, success, cancelled, ratio });
  }

  // Overall summary — prefer the API's, else sum the couriers.
  const sum: any = map.summary || {};
  let total = toNum(sum.total_parcel);
  let success = toNum(sum.success_parcel);
  if (total <= 0 && couriers.length) {
    total = couriers.reduce((n, c) => n + c.total, 0);
    success = couriers.reduce((n, c) => n + c.success, 0);
  }
  const cancelled = Math.max(0, total - success);
  const ratio = total > 0 ? Math.round((success / total) * 100) : 0;

  return {
    ok: true,
    data: {
      phone,
      total,
      success,
      cancelled,
      ratio,
      couriers: couriers.sort((a, b) => b.total - a.total),
    },
  };
}
