# Phone (Number) OTP Login — Setup

The login **code is already built** (LoginModal → ফোন নম্বর tab: number → কোড পাঠান →
OTP → যাচাই করুন). To make the SMS actually send, finish these 4 steps once.

## 1. Get a BD SMS gateway account
Sign up at **bulksmsbd.net** (or SSL Wireless / Alpha SMS). Buy a small SMS balance
and get your **API key** and **Sender ID** (numeric works; masking/branded needs
their approval). OTP delivery works with a numeric sender too.

## 2. Deploy the Edge Function (file: supabase/functions/send-sms/index.ts)
With the Supabase CLI (once, from the project folder):
```
supabase functions deploy send-sms --no-verify-jwt --project-ref zsmcmofuiteovgvjaeds
```
(If you don't use the CLI, you can paste the function in the Supabase dashboard →
Edge Functions → Deploy a new function → name it `send-sms`.)

## 3. Add the secrets (Supabase → Project Settings → Edge Functions → Secrets)
- `BULKSMSBD_API_KEY`   = your gateway API key
- `BULKSMSBD_SENDER_ID` = your sender id
- `SEND_SMS_HOOK_SECRET` = the value Supabase shows in step 4 (paste it back here)

## 4. Turn on Phone auth + the hook (Supabase → Authentication)
- **Sign In / Providers → Phone**: enable it. (Leave the built-in SMS provider
  fields — the hook below overrides sending.)
- **Hooks → "Send SMS hook"**: enable → type = HTTPS →
  URL = `https://zsmcmofuiteovgvjaeds.supabase.co/functions/v1/send-sms`
  → copy the generated secret into `SEND_SMS_HOOK_SECRET` (step 3).

## Done
Now: site → account icon → ফোন নম্বর → enter 01XXXXXXXXX → কোড পাঠান → the code
arrives by SMS → যাচাই করুন → logged in.

Notes:
- Every OTP costs one SMS from your gateway balance — keep it topped up.
- I can do steps 2–4 with you once your Chrome extension is back **and** you have
  the gateway API key ready (you'll type the secret/API key yourself).
- Using a different gateway? Tell me which — I'll swap the API block in index.ts
  (Alpha SMS / SSL Wireless variants are already noted at the bottom of that file).
