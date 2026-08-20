# Dream Comfort Admin — Android App (TWA)

This turns the existing admin panel (`https://dreamcomfortbd.com/admin`) into a real
installable Android app using a **Trusted Web Activity (TWA)**. Because a TWA runs on
Chrome under the hood, your **web push notifications (new-order alerts) keep working**,
and the app can go on the Google Play Store.

The site is already prepared for this:
- `public/manifest.webmanifest` — app name, icons, `start_url: /admin`, standalone.
- `public/icon-192.png`, `icon-512.png`, `icon-maskable-512.png` — app icons.
- `public/.well-known/assetlinks.json` — domain ownership proof (needs your app's
  fingerprint pasted in — see step below).

> **Deploy the site first** (`npm run build` then deploy) so the manifest, icons and
> `.well-known/assetlinks.json` are all live at `https://dreamcomfortbd.com/...`.
> The build below reads them from the live URL.

---

## Option A — PWABuilder (easiest, NO tools to install) ✅ recommended

Env needed: **just a web browser.** Nothing installed locally.

1. Go to **https://www.pwabuilder.com**
2. Enter `https://dreamcomfortbd.com` and click **Start**.
3. Open the **Android** package → **Generate Package**.
   - Package ID: `com.dreamcomfort.admin`
   - App name: `Dream Comfort Admin`
   - Launcher name: `DC Admin`
   - Start URL: `/admin`
   - Keep **"Include web notification delegation"** / notifications ON.
4. Download the ZIP. It contains:
   - `app-release-signed.apk` — install this on your phone (sideload / share).
   - `app-release-bundle.aab` — upload this to Google Play.
   - `signing.keystore` + `signing-key-info.txt` — **KEEP THESE SAFE**, you need the
     same keystore for every future update.
   - `assetlinks.json` — this one already has your real fingerprint in it.
5. **Copy the SHA-256 fingerprint** from the downloaded `assetlinks.json` (or from
   `signing-key-info.txt`) and paste it into this project's
   `public/.well-known/assetlinks.json`, replacing
   `REPLACE_WITH_YOUR_APP_SIGNING_SHA256_FINGERPRINT`. Re-deploy the site.
   (This removes the browser address bar so it looks like a native app.)

That's it — install the APK on your phone.

---

## Option B — Bubblewrap CLI (local build)

Env / tools needed:
- **Node.js 18+** (you already have it)
- **JDK 17** (Temurin/OpenJDK) — Bubblewrap can auto-download it
- **Android SDK build-tools + platform** — Bubblewrap can auto-download it on first run

Steps:
```bash
npm install -g @bubblewrap/cli

# from this android-twa/ folder (twa-manifest.json is here):
bubblewrap init --manifest https://dreamcomfortbd.com/manifest.webmanifest
# when asked, accept the values from twa-manifest.json (packageId com.dreamcomfort.admin,
# start url /admin, notifications = yes)

bubblewrap build
# → produces app-release-signed.apk (install on phone) and app-release-bundle.aab (Play Store)
```
On first `build` Bubblewrap creates a signing keystore and prints the **SHA-256
fingerprint** — paste it into `public/.well-known/assetlinks.json` and re-deploy the site.
Get the fingerprint again anytime with:
```bash
keytool -list -v -keystore android.keystore -alias android
```

---

## Google Play (optional)
Upload the `.aab` to Play Console. Play re-signs your app, so afterwards also add the
**Play App Signing** SHA-256 (Play Console → Setup → App signing) as a SECOND entry in
`assetlinks.json`, then re-deploy.

## Notes
- **No new server env vars are required.** The app just loads your live site, which
  already has all its env (Supabase, VAPID push keys, Meta) on the server.
- The one thing you MUST get right is `assetlinks.json` with the correct fingerprint —
  otherwise the app shows a browser URL bar (it still works, just looks less native).
- To update the app later: change the site (no rebuild needed for content), OR bump
  `appVersionCode`/`appVersionName` and rebuild only if you changed app-level settings.
