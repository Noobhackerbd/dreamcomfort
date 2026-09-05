// lib/sms/index.ts — SMS feature REMOVED.
// The store no longer sends SMS. These functions are kept as safe no-ops so the
// order flow (which used to fire optional order/status SMS) keeps working untouched —
// they simply do nothing now. No outbound calls, no sms_logs writes.

export interface SmsResult {
  ok: boolean;
  status: "sent" | "failed" | "skipped";
  providerResponse?: string;
  error?: string;
}

/** Normalize any BD phone to 8801XXXXXXXXX (digits only). Kept for callers. */
export function normalizeBdPhone(raw: string): string {
  let d = (raw || "").replace(/\D/g, "");
  if (d.startsWith("00")) d = d.slice(2);
  if (d.startsWith("0")) d = "88" + d;
  else if (d.startsWith("1")) d = "880" + d;
  else if (!d.startsWith("880")) d = "880" + d;
  return d;
}

/** No-op — SMS is disabled. */
export async function sendSms(_rawPhone: string, _message: string): Promise<SmsResult> {
  return { ok: false, status: "skipped", providerResponse: "SMS feature disabled" };
}

/** No-op — SMS is disabled. Never sends, never writes a log. */
export async function sendSmsAsync(_params: { phone: string; message: string; orderId?: string | null }): Promise<void> {
  /* SMS removed */
}
