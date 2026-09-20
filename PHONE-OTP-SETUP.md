# Phone (Number) OTP Login — Setup with Automas SMS

The login **code is already built** (LoginModal → ফোন নম্বর tab: number → কোড পাঠান →
OTP → যাচাই করুন). It uses Supabase's native phone OTP, and Supabase hands the code
to our Edge Function, which sends it through **Automas** (api.automas.com.bd).
To make real SMS send, finish these 4 one-time steps.

## 1. Get your Automas credentials
In the Automas panel:
- Generate an **API key** (User validation → Generate Api Key).
- Note your **approved Sender ID** (e.g. `8809617641677`).
- Keep some SMS balance topped up (each OTP = 1 SMS).

## 2. Deploy the Edge Function (file: supabase/functions/send-sms/index.ts)
With the Supabase CLI, from the project folder:
```
supabase functions deploy send-sms --no-verify-jwt --project-ref zsmcmofuiteovgvjaeds
```
(No CLI? Supabase dashboard → Edge Functions → Deploy a new function → name it
`send-sms` → paste the contents of that file.)

## 3. Add the secrets (Supabase → Project Settings → Edge Functions → Secrets)
- `AUTOMAS_API_KEY`      = your Automas API key
- `AUTOMAS_SENDER_ID`    = your approved sender id (e.g. 8809617641677)
- `SEND_SMS_HOOK_SECRET` = the value Supabase shows in step 4 (paste it back here)

## 4. Turn on Phone auth + the hook (Supabase → Authentication)
- **Sign In / Providers → Phone**: enable it. (You do NOT need to fill Twilio /
  MessageBird — the hook below takes over the actual sending.)
- **Hooks → "Send SMS hook"**: enable → type = HTTPS →
  URL = `https://zsmcmofuiteovgvjaeds.supabase.co/functions/v1/send-sms`
  → copy the generated secret into `SEND_SMS_HOOK_SECRET` (step 3).

## How it works (active-number login)
1. Customer types their mobile number → কোড পাঠান.
2. Supabase generates a 6-digit OTP and calls our `send-sms` function.
3. The function sends the OTP via Automas to that number.
4. Customer types the code → যাচাই করুন → Supabase verifies it and logs them in.

Because the code only arrives on a working SIM, this proves the number is a **real,
active number** — exactly "active number login".

## Message format
Sent as ASCII (cheapest, 1 SMS): 
`DreamComfort login code: 123456. Valid 5 minutes. Do not share this code.`

## Test the Automas API directly (optional, before wiring the hook)
```
curl -X POST https://api.automas.com.bd/smsapiv4 \
  -H "Content-Type: application/json" \
  -d '{"api_key":"YOUR_KEY","senderid":"YOUR_SENDER","type":"text","scheduledDateTime":"","msg":"DreamComfort test 123456","contacts":"01XXXXXXXXX"}'
```
Success looks like: `{"response":[{"status":0,"id":296334,"msisdn":"01XXXXXXXXX"}]}`
(`status: 0` = sent). Other status codes: 103 auth failed, 106 wrong API key,
102 sender not valid, 1000 insufficient balance, 105 invalid number.

## Notes
- Every OTP costs one SMS from your Automas balance — keep it topped up.
- Switching gateways later? Only step 3 of `supabase/functions/send-sms/index.ts`
  (the fetch to Automas) needs changing; the rest stays the same.
