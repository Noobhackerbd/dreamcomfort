// lib/sms/index.ts — Bangladeshi SMS gateway abstraction.
// A single sendSms(phone, message) function that calls the configured provider's
// HTTP API. Swap providers via SMS_PROVIDER env. Every send is logged to sms_logs.
//
// Supported providers (SMS_PROVIDER):
//   - "bulksmsbd"  (default)  — https://bulksmsbd.net/api/smsapi
//   - "mock"                  — logs only, never calls out (for local/dev)
//
// Env used:
//   SMS_PROVIDER, SMS_API_KEY, SMS_SENDER_ID
//
// IMPORTANT: callers should never block order creation on SMS. Use sendSmsAsync(),
// which swallows errors and always logs the attempt.

import { getServerSupabase } from "@/lib/supabase/server";

const PROVIDER = (process.env.SMS_PROVIDER || "bulksmsbd").toLowerCase();
const API_KEY = process.env.SMS_API_KEY || "";
const SENDER_ID = process.env.SMS_SENDER_ID || "";

export interface SmsResult {
  ok: boolean;
  status: "sent" | "failed" | "skipped";
  providerResponse?: string;
  error?: string;
}

/** Normalize any BD phone to 8801XXXXXXXXX (digits only) for the gateway. */
export function normalizeBdPhone(raw: string): string {
  let d = (raw || "").replace(/\D/g, "");
  if (d.startsWith("00")) d = d.slice(2);
  if (d.startsWith("0")) d = "88" + d; // 017... -> 88017...
  else if (d.startsWith("1")) d = "880" + d; // 17...  -> 88017...
  else if (!d.startsWith("880")) d = "880" + d;
  return d;
}

async function callBulkSmsBd(to: string, message: string): Promise<SmsResult> {
  // https://bulksmsbd.net docs: GET/POST with api_key, senderid, number, message
  const url = "https://bulksmsbd.net/api/smsapi";
  const body = new URLSearchParams({
    api_key: API_KEY,
    senderid: SENDER_ID,
    number: to,
    message,
  });
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
      cache: "no-store",
    });
    const text = await res.text();
    // BulkSMSBD returns a JSON-ish body; response_code 202 == accepted.
    const ok = res.ok && /202|success|"success_message"/i.test(text);
    return {
      ok,
      status: ok ? "sent" : "failed",
      providerResponse: text.slice(0, 500),
      error: ok ? undefined : "provider rejected message",
    };
  } catch (e: any) {
    return { ok: false, status: "failed", error: e?.message ?? "network error" };
  }
}

/** Low-level send. Returns a result; does NOT throw. */
export async function sendSms(rawPhone: string, message: string): Promise<SmsResult> {
  const to = normalizeBdPhone(rawPhone);
  if (!to || to.length < 12) {
    return { ok: false, status: "failed", error: "invalid phone" };
  }

  // If not configured, skip the outbound call but still record intent.
  if (PROVIDER === "mock" || !API_KEY || !SENDER_ID) {
    return {
      ok: false,
      status: "skipped",
      providerResponse: "SMS not configured (set SMS_API_KEY + SMS_SENDER_ID)",
    };
  }

  switch (PROVIDER) {
    case "bulksmsbd":
    default:
      return callBulkSmsBd(to, message);
  }
}

/**
 * Fire-and-log helper. Sends the SMS, writes a row to sms_logs, and never throws.
 * Call this from server actions with `void sendSmsAsync(...)` so it can't block or
 * fail the order flow.
 */
export async function sendSmsAsync(params: {
  phone: string;
  message: string;
  orderId?: string | null;
}): Promise<void> {
  const { phone, message, orderId } = params;
  let result: SmsResult;
  try {
    result = await sendSms(phone, message);
  } catch (e: any) {
    result = { ok: false, status: "failed", error: e?.message ?? "error" };
  }
  try {
    const supabase = getServerSupabase();
    await supabase.from("sms_logs").insert({
      order_id: orderId ?? null,
      phone: normalizeBdPhone(phone),
      message,
      provider_response: result.providerResponse ?? result.error ?? null,
      status: result.status,
    });
  } catch {
    // logging failure must never bubble up
  }
}
