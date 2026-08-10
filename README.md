# Dream Comfort BD — Next.js Store + Admin + Meta CAPI

A production-ready, mobile-first e-commerce store for **dreamcomfortbd.com**: a public
storefront with Cash-on-Delivery checkout, a protected admin panel, Bangladeshi SMS
notifications, and dual-tracked Meta Pixel + Conversions API with shared-`event_id`
deduplication.

Built with **Next.js 14 (App Router, TypeScript, Server Components + Server Actions)**,
**Tailwind CSS**, and **Supabase** (Postgres + Auth + Storage). Deploys to **Vercel**.

---

## 1. What you need (one time)

1. **Node.js 18+** — https://nodejs.org (check with `node -v`).
2. A code editor — **VS Code** recommended.
3. A **Supabase** project (free tier is fine).

---

## 2. Database setup (Supabase)

In the Supabase dashboard → **SQL Editor** → New query, run these two files in order:

1. `supabase-schema.sql` — tables, enums, RLS, `product-images` storage bucket, seed products.
2. `supabase-migration-2.sql` — `settings` table (shipping fees, store info, editable SMS templates).

Then create your first admin user: **Authentication → Users → Add user** (email + password).
Put that email into `ADMIN_ALLOWED_EMAILS` in `.env.local`.

---

## 3. Configure environment

Copy `.env.example` to `.env.local` and fill in:

- **Supabase**: Project URL, `anon` key, `service_role` key (Settings → API).
- **Admin**: `ADMIN_ALLOWED_EMAILS` (comma-separated).
- **Meta** (optional at first): `NEXT_PUBLIC_META_PIXEL_ID`, `META_CAPI_ACCESS_TOKEN`,
  `META_TEST_EVENT_CODE`.
- **SMS** (optional at first): `SMS_PROVIDER`, `SMS_API_KEY`, `SMS_SENDER_ID`.
  Leave blank to run in "skipped" mode — orders still work; SMS is logged as skipped.

The service-role key and CAPI token are **server-only secrets** — never expose them to the browser.

---

## 4. Run it

```bash
npm install
npm run dev
```

Open **http://localhost:3000** — you'll see the storefront with your seed products.
The admin panel is at **/admin** (redirects to `/admin/login`).

---

## 5. Features

**Storefront** (`app/(store)`): home (hero, categories, featured, reviews, trust badges),
`/products` (search + category filter), `/product/[slug]` (gallery, related products, JSON-LD),
`/cart`, `/checkout` (COD, inside/outside-Dhaka shipping), `/order/[order_number]` (thank-you),
`/track-order`, `/about`, `/contact`, `/privacy`, `/terms`, `/return-policy`.
SEO: per-page metadata, Open Graph, `sitemap.xml`, `robots.txt`, Product JSON-LD.

**Admin** (`app/admin`, protected by middleware + allow-listed emails):
dashboard (today's orders/revenue, 30-day sales chart, low-stock, top products),
products CRUD (multi-image upload + reorder, EN/BN, SEO fields), categories CRUD,
orders (filter, detail, status change, courier + tracking, printable invoice),
customers, SMS (manual send + log), Tracking Health, settings.

---

## 6. Meta Pixel + Conversions API (dual-tracked, deduplicated)

Every event is sent **twice** — once from the browser Pixel and once from the server CAPI —
sharing **one `event_id`** so Meta deduplicates them into a single event. This keeps
conversions accurate even when the browser Pixel is blocked by an ad blocker.

- Events: `PageView`, `ViewContent`, `AddToCart`, `InitiateCheckout`, `Purchase`, `Lead`.
- `Purchase`: `event_id` is generated in the checkout Server Action, **stored on the order row**,
  and reused by both the server Purchase (fires immediately, even if the tab closes) and the
  browser Purchase on the thank-you page.
- Advanced Matching: hashed (SHA-256) `em`, `ph`, `fn`, `ln`, `ct`, `st`, `zp`, `country`,
  plus non-hashed `fbp`, `fbc`, `client_ip_address`, `client_user_agent`, `external_id`.
- `fbc` is reconstructed from `fbclid` when the `_fbc` cookie is missing.

**Getting the CAPI token:** Events Manager → your Pixel → **Settings** → **Conversions API** →
**Generate access token**. Paste into `META_CAPI_ACCESS_TOKEN`.

**Verifying (Test Events):** set `META_TEST_EVENT_CODE` from Events Manager → **Test Events**,
then browse the site and place a test order. Each action should appear **once**, received from
both **Browser** and **Server**, marked processed/deduplicated. The admin **Tracking Health**
page (`/admin/tracking`) shows the same browser-vs-server pairing from `events_log`.

---

## 7. SMS notifications (Bangladesh)

`lib/sms/` wraps a Bangladeshi gateway behind a single `sendSms(phone, message)` function
(default provider: **BulkSMSBD**; swap via `SMS_PROVIDER`). BD numbers are normalized to
`8801XXXXXXXXX`. SMS fires automatically on order placed and on status → confirmed / shipped /
delivered, using editable templates (admin **Settings**). Every send is logged to `sms_logs`
and **never blocks order creation** (fire-and-forget + logged errors).

---

## 8. Deploy to Vercel

1. Push this project to GitHub.
2. Import it at **vercel.com** → New Project.
3. Add the same env vars from `.env.local` in **Project Settings → Environment Variables**
   (set `NEXT_PUBLIC_SITE_URL` to your production domain, e.g. `https://dreamcomfortbd.com`).
4. Deploy. Point your domain to Vercel.

---

## Project structure

```
app/(store pages)     home, products, product, cart, checkout, order, track-order, policies
app/admin/**          dashboard, products, categories, orders (+invoice), customers, sms,
                      tracking (health), settings, login
app/api/capi          server CAPI endpoint (logs server events)
app/api/track-log     logs browser-copy events for the health page
components/            Header, ProductCard, MetaPixel, track (dual-fire), BuyButtons, ...
lib/supabase/         server (service role) + browser + SSR auth clients
lib/meta/             hashing, CAPI sender, event-id, fb cookies, event logging
lib/sms/              gateway abstraction + editable templates
lib/settings.ts       runtime settings (shipping, store, SMS templates)
supabase-schema.sql       base schema (run first)
supabase-migration-2.sql  settings table (run second)
```
