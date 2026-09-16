// Supabase Auth "Send SMS Hook" — delivers phone OTP codes through a Bangladeshi
// SMS gateway (default: bulksmsbd.net). Supabase POSTs { user, sms:{ otp } } here
// whenever a customer requests a login/verify code; we forward it to the gateway.
//
// Deploy:  supabase functions deploy send-sms --no-verify-jwt
// Secrets (set in Supabase → Project Settings → Edge Functions → Secrets, or via CLI):
//   BULKSMSBD_API_KEY      = your bulksmsbd API key
//   BULKSMSBD_SENDER_ID    = your approved sender/masking id (or numeric)
//   SEND_SMS_HOOK_SECRET   = the secret Supabase shows when you enable the hook
//
// Then: Auth → Hooks → "Send SMS hook" → enable → URL =
//   https://<project-ref>.supabase.co/functions/v1/send-sms

import { Webhook } from "https://esm.sh/standardwebhooks@1.0.0";

Deno.serve(async (req) => {
  const raw = await req.text();

  // 1) Verify the request really came from Supabase (recommended).
  const secret = (Deno.env.get("SEND_SMS_HOOK_SECRET") || "").replace("v1,whsec_", "");
  try {
    if (secret) {
      const headers = Object.fromEntries(req.headers);
      new Webhook(secret).verify(raw, headers);
    }
  } catch (_e) {
    return json({ error: { message: "invalid signature" } }, 401);
  }

  // 2) Pull the phone number + one-time code Supabase generated.
  let phone = "", otp = "";
  try {
    const body = JSON.parse(raw);
    phone = body?.user?.phone || "";          // e.g. "8801712345678" (no +)
    otp = body?.sms?.otp || "";
  } catch {
    return json({ error: { message: "bad payload" } }, 400);
  }
  if (!phone || !otp) return json({ error: { message: "missing phone/otp" } }, 400);

  // 3) Send it through the BD gateway.
  const apiKey = Deno.env.get("BULKSMSBD_API_KEY") || "";
  const senderId = Deno.env.get("BULKSMSBD_SENDER_ID") || "";
  const message = `DreamComfort OTP: ${otp}\nএই কোডটি কাউকে দেবেন না।`;

  const url = "https://bulksmsbd.net/api/smsapi"
    + `?api_key=${encodeURIComponent(apiKey)}`
    + `&type=text`
    + `&number=${encodeURIComponent(phone)}`
    + `&senderid=${encodeURIComponent(senderId)}`
    + `&message=${encodeURIComponent(message)}`;

  try {
    const res = await fetch(url);
    const text = await res.text();
    // bulksmsbd returns response_code 202 on success.
    let code: number | null = null;
    try { code = JSON.parse(text)?.response_code ?? null; } catch { code = /(^|[^0-9])202([^0-9]|$)/.test(text) ? 202 : null; }
    if (!res.ok || code !== 202) {
      return json({ error: { message: `gateway: ${text}` } }, 502);
    }
    return json({}, 200);
  } catch (e) {
    return json({ error: { message: `send failed: ${(e as Error).message}` } }, 502);
  }
});

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

/* ─────────────────────────────────────────────────────────────────────────
   USING A DIFFERENT BD GATEWAY?  Replace the block in step 3 above.

   Alpha SMS (sms.net.bd):
     const url = `https://api.sms.net.bd/sendsms?api_key=${apiKey}&to=${phone}&msg=${encodeURIComponent(message)}`;
     // success: JSON { "error": 0, ... }

   SSL Wireless:
     POST https://smsplus.sslwireless.com/api/v3/send-sms
     body: { api_token, sid, msisdn: phone, sms: message, csms_id: crypto.randomUUID() }
   ───────────────────────────────────────────────────────────────────────── */
