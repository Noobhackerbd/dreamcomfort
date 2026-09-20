// Supabase Auth "Send SMS Hook" — delivers phone OTP codes through the Automas
// Bangladeshi SMS gateway (api.automas.com.bd). Supabase POSTs { user, sms:{ otp } }
// here whenever a customer requests a login/verify code; we forward it to Automas.
//
// Deploy:  supabase functions deploy send-sms --no-verify-jwt --project-ref zsmcmofuiteovgvjaeds
// Secrets (Supabase → Project Settings → Edge Functions → Secrets, or via CLI):
//   AUTOMAS_API_KEY       = your Automas API key (panel → Generate Api Key)
//   AUTOMAS_SENDER_ID     = your approved Automas sender id (e.g. 8809617641677)
//   SEND_SMS_HOOK_SECRET  = the secret Supabase shows when you enable the hook
//
// Then: Auth → Hooks → "Send SMS hook" → enable → URL =
//   https://zsmcmofuiteovgvjaeds.supabase.co/functions/v1/send-sms

import { Webhook } from "https://esm.sh/standardwebhooks@1.0.0";

const AUTOMAS_URL = "https://api.automas.com.bd/smsapiv4";

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

  // Automas accepts 8801XXXXXXXXX or local 01XXXXXXXXX. Normalise to local 01…
  const contact = phone.replace(/^\+?88/, "");

  // 3) Send it through Automas (JSON single-SMS endpoint, ASCII text = cheapest).
  const apiKey = Deno.env.get("AUTOMAS_API_KEY") || "";
  const senderId = Deno.env.get("AUTOMAS_SENDER_ID") || "";
  const message = `DreamComfort login code: ${otp}. Valid 5 minutes. Do not share this code.`;

  try {
    const res = await fetch(AUTOMAS_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: apiKey,
        senderid: senderId,
        type: "text",
        scheduledDateTime: "",
        msg: message,
        contacts: contact,
      }),
    });
    const text = await res.text();

    // Automas success == status 0. The live API returns a BARE array
    // [ { "status":0, "id":..., "msisdn":"..." } ] (the docs' { "response":[…] }
    // wrapper is not what the endpoint actually sends), so handle both shapes.
    let status: number | null = null;
    try {
      const j = JSON.parse(text);
      let first: any = null;
      if (Array.isArray(j)) first = j[0];
      else if (Array.isArray(j?.response)) first = j.response[0];
      else first = j?.response ?? j;
      status = typeof first?.status === "number" ? first.status : null;
    } catch { status = null; }

    if (!res.ok || status !== 0) {
      return json({ error: { message: `automas: ${text}` } }, 502);
    }
    return json({}, 200);
  } catch (e) {
    return json({ error: { message: `send failed: ${(e as Error).message}` } }, 502);
  }
});

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}
