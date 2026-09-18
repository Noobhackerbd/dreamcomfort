# Facebook Login — Setup

The login **code is already built** (login popup → Facebook button, same as Google).
To turn it on you just need a Facebook app + paste 2 values into Supabase.

## 1. Create a Facebook app  (developers.facebook.com)
- Log in → **My Apps → Create App**.
- Use case: **Authenticate and request data from users with Facebook Login**
  (app type: Consumer/Business is fine) → give it a name (e.g. "DreamComfort").
- In the app, add the **Facebook Login** product ("Set up").

## 2. Add the redirect URL  (Facebook Login → Settings)
Under **Valid OAuth Redirect URIs** paste EXACTLY:
```
https://zsmcmofuiteovgvjaeds.supabase.co/auth/v1/callback
```
Save changes.

## 3. Fill app basics  (Settings → Basic)
- **App Domains:** `dreamcomfortbd.com`
- **Privacy Policy URL:** `https://www.dreamcomfortbd.com/privacy`
- **Site URL:** `https://www.dreamcomfortbd.com`
- Copy your **App ID** and **App Secret** (click "Show" for the secret).

## 4. Enable the provider in Supabase
Authentication → **Sign In / Providers → Facebook** → enable →
- **Client ID** = App ID
- **Client Secret** = App Secret
Save.

## 5. Make the app Live
Top of the Facebook app: flip **App Mode** from "Development" to **Live**
(needs the Privacy Policy URL from step 3). Only then can normal users log in.

## Done
Site → account icon → **Facebook** → login works.

---

### Honest heads-up (Meta is stricter than Google)
- **Live mode + Privacy Policy** are required — that part is quick.
- To receive the user's **email** from Facebook, Meta may require **Business
  Verification + App Review** for the `email` permission. Without it you still get
  the user's name/Facebook id, but maybe not a verified email.
- Because of this, **Google login (already working) covers most customers more
  easily.** Facebook is a nice extra, but if Meta's verification is a hassle, it's
  optional — your store works fully without it.

I can do steps 2–4 clicks WITH you once your Chrome extension is back and you have
the App ID + App Secret ready (you type the secret yourself — I can't enter secrets).
