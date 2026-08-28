# DreamComfort Admin — Android App (React Native / Expo)

A native admin app for the DreamComfort store. It talks to your existing site through a
secure token API (`/api/mobile/*`) — the app never holds any database key, only the
access token you set in **Admin → সেটিংস → অ্যান্ড্রয়েড অ্যাপ (API টোকেন)**.

**MVP features:** Login · Dashboard (today orders/revenue, pending, total) · Orders list
with status tabs + search · Order detail with status change, call + call-attempt counter,
WhatsApp.

---

## 0) One-time: turn on the API on your site
1. Deploy the site (the `/api/mobile/*` endpoints ship with it).
2. Admin → সেটিংস → **অ্যান্ড্রয়েড অ্যাপ (API টোকেন)** → press **জেনারেট** → **সেভ করুন**.
3. Keep that token — you'll paste it into the app's login screen.

## 1) Install tools (once)
- **Node.js 18+** (you have it)
- `npm install -g eas-cli` (Expo's build tool)
- A free **Expo account** → https://expo.dev (run `eas login`)

## 2) Get the project ready
```bash
cd dc-admin-app
npm install
```

## 3) Build the APK (cloud — easiest, no Android Studio needed)
```bash
eas build -p android --profile preview
```
- First run asks to create an EAS project — say yes; it fills `extra.eas.projectId` for you.
- When it finishes it prints a link — download the **.apk** and install it on your phone.

Prefer a Play Store bundle later? `eas build -p android --profile production` → `.aab`.

## 4) Log in
Open the app → enter:
- **API URL:** `https://dreamcomfortbd.com`
- **Access Token:** the token you generated in step 0.

Done — you'll see the dashboard and orders.

---

### Run it live while developing (optional)
```bash
npx expo start
```
Scan the QR with the **Expo Go** app to preview instantly (no build).

### Local APK build (optional, needs Android SDK)
```bash
npx expo prebuild -p android
cd android && ./gradlew assembleRelease
# APK: android/app/build/outputs/apk/release/app-release.apk
```

### Notes
- **Push notifications (new-order alerts)** are NOT in this MVP — that needs Firebase
  Cloud Messaging + a `google-services.json`. Ask to add it as the next step.
- If login fails: check the API URL has no trailing slash issues and the token matches
  exactly what's saved in admin settings. Changing the token in admin = re-login in the app.
