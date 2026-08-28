// src/api.ts — tiny API client for the DreamComfort admin app.
// The app stores only the site URL + access token (never any DB key). Every request
// sends `Authorization: Bearer <token>` to /api/mobile/* on the store's Next.js server.
import * as SecureStore from "expo-secure-store";

let BASE = "";
let TOKEN = "";

const K_BASE = "dc_api_base";
const K_TOKEN = "dc_api_token";

export async function loadAuth(): Promise<{ base: string; token: string }> {
  BASE = (await SecureStore.getItemAsync(K_BASE)) || "";
  TOKEN = (await SecureStore.getItemAsync(K_TOKEN)) || "";
  return { base: BASE, token: TOKEN };
}

export async function saveAuth(base: string, token: string) {
  BASE = base.replace(/\/+$/, "");
  TOKEN = token.trim();
  await SecureStore.setItemAsync(K_BASE, BASE);
  await SecureStore.setItemAsync(K_TOKEN, TOKEN);
}

export async function clearAuth() {
  BASE = "";
  TOKEN = "";
  await SecureStore.deleteItemAsync(K_BASE);
  await SecureStore.deleteItemAsync(K_TOKEN);
}

export function isLoggedIn() {
  return !!BASE && !!TOKEN;
}

async function req(path: string, opts: RequestInit = {}): Promise<any> {
  if (!BASE || !TOKEN) throw new Error("লগইন করা নেই।");
  const res = await fetch(`${BASE}${path}`, {
    ...opts,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${TOKEN}`,
      ...(opts.headers || {}),
    },
  });
  const json = await res.json().catch(() => ({}));
  if (res.status === 401) throw new Error("টোকেন ভুল বা মেয়াদ শেষ। আবার লগইন করুন।");
  if (!res.ok || json?.ok === false) throw new Error(json?.error || `ত্রুটি (${res.status})`);
  return json;
}

/** Verify a base URL + token pair before saving (login). */
export async function ping(base: string, token: string) {
  const res = await fetch(`${base.replace(/\/+$/, "")}/api/mobile/ping`, {
    headers: { Authorization: `Bearer ${token.trim()}` },
  });
  const json = await res.json().catch(() => ({}));
  if (res.status === 401) throw new Error("Access Token ভুল।");
  if (!res.ok || json?.ok === false) throw new Error(json?.error || "সংযোগ ব্যর্থ। URL ঠিক আছে কি?");
  return json.store as { name: string; phone: string };
}

export const api = {
  dashboard: () => req("/api/mobile/dashboard"),
  orders: (status: string, q: string, page: number) =>
    req(`/api/mobile/orders?status=${encodeURIComponent(status)}&q=${encodeURIComponent(q)}&page=${page}`),
  order: (id: string) => req(`/api/mobile/orders/${id}`),
  setStatus: (id: string, status: string) =>
    req(`/api/mobile/orders/${id}`, { method: "PATCH", body: JSON.stringify({ action: "status", status }) }),
  logCall: (id: string) =>
    req(`/api/mobile/orders/${id}`, { method: "PATCH", body: JSON.stringify({ action: "call" }) }),
  resetCall: (id: string) =>
    req(`/api/mobile/orders/${id}`, { method: "PATCH", body: JSON.stringify({ action: "resetCall" }) }),
};

export function taka(n: number) {
  return "৳ " + Math.round(Number(n) || 0).toLocaleString("en-US");
}
