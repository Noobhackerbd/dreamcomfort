// lib/meta/capi.ts
// Server-side Meta Conversions API sender.
// The SAME event_id you pass to the browser Pixel must be passed here so Meta
// deduplicates the browser + server copies into one event.

import { buildHashedUserData, RawUserData } from "./hash";

const GRAPH_VERSION = "v20.0"; // bump to the current Graph API version when you build
const PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID!;
const ACCESS_TOKEN = process.env.META_CAPI_ACCESS_TOKEN!;
const TEST_EVENT_CODE = process.env.META_TEST_EVENT_CODE; // set only while testing

export type MetaEventName =
  | "PageView"
  | "ViewContent"
  | "AddToCart"
  | "InitiateCheckout"
  | "Purchase"
  | "Lead";

export interface ServerSignals {
  fbp?: string;
  fbc?: string;
  client_ip_address?: string;
  client_user_agent?: string;
}

export interface CustomData {
  currency?: string; // "BDT"
  value?: number;
  content_ids?: string[];
  content_type?: "product";
  contents?: { id: string; quantity: number; item_price?: number }[];
  num_items?: number;
  [k: string]: unknown;
}

export interface SendServerEventInput {
  eventName: MetaEventName;
  eventId: string;                 // <-- MUST match the browser Pixel's eventID
  eventSourceUrl: string;
  eventTime?: number;              // unix seconds; defaults to now
  user: RawUserData;               // raw PII (hashed inside)
  signals?: ServerSignals;         // fbp/fbc/ip/ua (not hashed)
  customData?: CustomData;
  actionSource?: "website";
}

export interface CapiResult {
  ok: boolean;
  fbtrace_id?: string;
  status?: number;
  error?: string;
}

/**
 * Send one event to the Conversions API. Retries once on network failure.
 * Returns fbtrace_id so you can log it to events_log for the Tracking Health page.
 */
export async function sendServerEvent(input: SendServerEventInput): Promise<CapiResult> {
  const {
    eventName,
    eventId,
    eventSourceUrl,
    eventTime = Math.floor(Date.now() / 1000),
    user,
    signals = {},
    customData,
    actionSource = "website",
  } = input;

  const user_data = {
    ...buildHashedUserData(user),
    ...(signals.fbp ? { fbp: signals.fbp } : {}),
    ...(signals.fbc ? { fbc: signals.fbc } : {}),
    ...(signals.client_ip_address ? { client_ip_address: signals.client_ip_address } : {}),
    ...(signals.client_user_agent ? { client_user_agent: signals.client_user_agent } : {}),
  };
  // strip undefined keys
  Object.keys(user_data).forEach(
    (k) => (user_data as Record<string, unknown>)[k] === undefined &&
      delete (user_data as Record<string, unknown>)[k]
  );

  const payload: Record<string, unknown> = {
    data: [
      {
        event_name: eventName,
        event_time: eventTime,
        event_id: eventId,
        event_source_url: eventSourceUrl,
        action_source: actionSource,
        user_data,
        ...(customData ? { custom_data: customData } : {}),
      },
    ],
    ...(TEST_EVENT_CODE ? { test_event_code: TEST_EVENT_CODE } : {}),
  };

  const url = `https://graph.facebook.com/${GRAPH_VERSION}/${PIXEL_ID}/events?access_token=${ACCESS_TOKEN}`;

  async function attempt(): Promise<CapiResult> {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      cache: "no-store",
    });
    const json: any = await res.json().catch(() => ({}));
    if (!res.ok) {
      return {
        ok: false,
        status: res.status,
        fbtrace_id: json?.fbtrace_id,
        error: json?.error?.message ?? "CAPI request failed",
      };
    }
    return { ok: true, status: res.status, fbtrace_id: json?.fbtrace_id };
  }

  try {
    return await attempt();
  } catch {
    // one retry on network failure
    try {
      return await attempt();
    } catch (e: any) {
      return { ok: false, error: e?.message ?? "network error" };
    }
  }
}
