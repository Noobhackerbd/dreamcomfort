# Master Build Prompt — dreamcomfortbd.com

> Paste this whole thing into your AI coding tool (Cursor, v0, Lovable, Bolt, Claude Code, etc.).
> It is written to produce a **fast, production-ready Next.js e-commerce store + admin panel** with
> **server-side Meta Conversions API (CAPI)** and near-perfect pixel deduplication.
> Build it in the order given. Do not skip the tracking or deduplication sections.

---

## 1. Role & Goal

You are a senior full-stack engineer. Build a complete, production-ready e-commerce platform for **Dream Comfort BD** (domain: `dreamcomfortbd.com`), a Bangladesh-based online store.

Deliver two apps in ONE Next.js project:
1. **Storefront** (public landing page + product pages + Cash-on-Delivery checkout).
2. **Admin panel** (protected dashboard to add/manage products, manage orders, send SMS updates, and view analytics).

Non-negotiable requirements:
- **No WordPress, no WooCommerce.** Pure Next.js.
- **Blazing fast**: server components, image optimization, edge-cached static pages, Lighthouse performance ≥ 90 on mobile.
- **Meta Pixel + Conversions API (server-side)** with **zero event duplication** and **Event Match Quality (EMQ) / event health target of 8–10 out of 10**.
- **Mobile-first** — 80%+ of BD traffic is mobile.

---

## 2. Tech Stack (use exactly this)

- **Framework:** Next.js 14+ (App Router, TypeScript, Server Components + Server Actions).
- **Styling:** Tailwind CSS + shadcn/ui components. Support Bangla (`Noto Sans Bengali`) + English fonts.
- **Database + Auth + Storage:** Supabase (Postgres, Row Level Security, Supabase Auth, Supabase Storage for product images).
- **Hosting:** Vercel (Edge/Serverless functions).
- **Forms/validation:** react-hook-form + zod.
- **State:** minimal — React Server Components + a small client cart store (Zustand) persisted to `localStorage`.
- **Package manager:** pnpm.

---

## 3. Data Model (Supabase / Postgres)

Create these tables with sensible types, timestamps (`created_at`, `updated_at`), and Row Level Security.

**products**
- `id` (uuid, pk), `slug` (unique), `name_en`, `name_bn`, `description_en`, `description_bn`
- `price` (numeric), `compare_at_price` (nullable, for discounts), `sku`, `stock` (int)
- `category_id` (fk), `images` (text[] of Supabase Storage URLs), `is_active` (bool)
- `meta_title`, `meta_description` (SEO)

**categories**
- `id`, `slug` (unique), `name_en`, `name_bn`, `sort_order`

**orders**
- `id` (uuid), `order_number` (human-readable, e.g. `DC-10001`), `status` (enum: `pending`, `confirmed`, `processing`, `shipped`, `delivered`, `cancelled`, `returned`)
- `customer_name`, `customer_phone`, `customer_email` (nullable)
- `address_line`, `area`, `city`, `district`, `postcode` (nullable)
- `payment_method` (enum: `cod`), `subtotal`, `shipping_fee`, `discount`, `total`
- `notes`, `courier` (nullable), `tracking_id` (nullable)
- **`fbp`, `fbc`, `client_user_agent`, `client_ip`, `event_id`** ← store these at order creation for later CAPI Purchase firing.

**order_items**
- `id`, `order_id` (fk), `product_id` (fk), `product_name`, `unit_price`, `quantity`, `line_total`

**customers** (optional, auto-upsert by phone)
- `id`, `phone` (unique), `name`, `email`, `total_orders`, `total_spent`

**admins** — use Supabase Auth; restrict admin panel to allow-listed emails or a `role = 'admin'` claim.

**sms_logs**
- `id`, `order_id`, `phone`, `message`, `provider_response`, `status`, `created_at`

**events_log** (for tracking debug/dedup audit)
- `id`, `event_name`, `event_id`, `source` (`browser` | `server`), `fbtrace_id`, `payload` (jsonb), `created_at`

---

## 4. Storefront (public)

Pages (App Router):
- `/` — **Landing page**: sticky header w/ logo + cart, hero banner, featured products, category grid, best-sellers, trust badges (COD available, delivery all over Bangladesh, easy return), customer reviews, footer with contact + social. Clean modern design, brand colors (ask me / use a calm comfort-brand palette: soft blue/teal + warm neutral).
- `/products` — all products with category + price filters and search.
- `/product/[slug]` — product detail: image gallery, price/discount, quantity selector, "Order Now (Cash on Delivery)" button, description tabs (EN/BN), related products.
- `/cart` — cart review.
- `/checkout` — **COD checkout form**: name, phone (BD format `01XXXXXXXXX` validation), full address, area/city/district, order notes, shipping fee logic (e.g. Dhaka vs outside Dhaka), order summary. On submit → create order via Server Action → redirect to…
- `/order/[order_number]` — **thank-you / confirmation** page with order details and "we will call you to confirm" message. **Fire the Purchase event here** (browser + server, deduplicated).
- Standard: `/about`, `/contact`, `/track-order` (lookup by order number + phone), `/privacy`, `/terms`, `/return-policy`.

UX requirements:
- Fully responsive, mobile-first, fast tap targets.
- One-click "Order Now" flow (product → direct checkout) because BD shoppers convert best with fewest steps.
- Bangla + English toggle.
- SEO: per-page metadata, Open Graph, JSON-LD `Product` schema, sitemap.xml, robots.txt.

---

## 5. Admin Panel (`/admin`, protected)

Protect all `/admin/**` routes with Supabase Auth + middleware; redirect unauthenticated users to `/admin/login`. Only allow-listed admin emails.

Screens:
- **Dashboard**: today's orders, revenue, pending orders, low-stock alerts, top products, a 30-day sales chart.
- **Products**: table with search/filter; create/edit form with **image upload to Supabase Storage** (multi-image, drag to reorder), EN/BN fields, price/compare price, stock, category, active toggle, SEO fields.
- **Categories**: CRUD + sort order.
- **Orders**: filterable table (by status, date, phone); order detail drawer with items, customer info, address, timeline; **change status** (dropdown) which optionally triggers an **SMS to the customer**; add courier + tracking id; print/download invoice (PDF).
- **Customers**: list + order history per phone.
- **SMS**: log of sent messages, manual send, editable status-change templates.
- **Settings**: shipping fees (inside/outside Dhaka), store info, Meta Pixel ID + CAPI token (stored in env, shown read-only), SMS provider credentials.
- **Tracking Health** page: shows recent `events_log`, browser vs server event counts, and dedup match status so I can confirm no duplication.

Advanced/nice-to-have (scaffold, can be filled later): discount codes, stock auto-decrement on order, abandoned-checkout capture, CSV export of orders, role-based staff accounts, Bengali-language admin UI option.

---

## 6. SMS Notifications (Bangladesh)

- Integrate a Bangladeshi SMS gateway. Support one via an abstraction layer so it can be swapped: **BulkSMSBD**, **SSL Wireless**, or **Mobishastra** (use a simple `sendSms(phone, message)` server function that calls the provider's HTTP API with credentials from env).
- Trigger SMS automatically on: order placed (confirmation), status → confirmed, status → shipped (with tracking), status → delivered. Templates editable in admin, support Bangla text.
- Normalize BD phone numbers to `8801XXXXXXXXX`. Log every send to `sms_logs`.
- Never block order creation if SMS fails — send async and log the error.

---

## 7. Meta Pixel + Conversions API — SERVER-SIDE, DEDUPLICATED (most important section)

Implement **dual tracking**: the browser Pixel AND the server-side Conversions API send the **same events**, tied together by a shared `event_id` so Meta deduplicates them. Target **event/deduplication health and EMQ of 8–10**.

### 7.1 Events to implement (browser + server for each)
`PageView`, `ViewContent`, `AddToCart`, `InitiateCheckout`, `Purchase`, `Lead` (for contact form / phone click if used). Search if relevant.

### 7.2 Deduplication rules (do exactly this)
- For every event, generate ONE `event_id` (uuid) on the trigger.
- Send it to the **browser pixel** as `eventID` AND to the **CAPI** call as `event_id` — identical value.
- Use the **same `event_name`** and the **same `action_source`** semantics. Browser events: `action_source: "website"`. Server events: also `"website"`.
- For **Purchase specifically**: generate `event_id` at checkout, **store it on the order row**, and reuse that exact `event_id` when firing both the browser Purchase (on the thank-you page) and the server Purchase (from the order-creation server action / API). This guarantees dedup even if the browser event is blocked by an ad blocker.
- Do NOT send the same event from two different server calls. One browser + one server per event, sharing `event_id`.

### 7.3 Maximize Event Match Quality (aim > 7, ideally 8–10)
Send as much **hashed** customer data (Advanced Matching) as available, **SHA-256 hashed, lowercased, trimmed** on the server before sending to CAPI (Meta requires hashing for PII):
- `em` (email), `ph` (phone in E.164 digits only, e.g. `8801...`), `fn` (first name), `ln` (last name), `ct` (city), `st` (state/district), `zp` (postcode), `country` (`bd`).
- Also send NON-hashed: `fbp` (from `_fbp` cookie), `fbc` (from `_fbc` cookie or built from `fbclid` URL param), `client_ip_address` (server-read from request headers, e.g. `x-forwarded-for`), `client_user_agent` (from request headers), and `external_id` (hashed customer phone or id).
- Build `fbc` from `fbclid` if `_fbc` cookie is missing: `fb.1.<timestamp>.<fbclid>`.
- Persist `fbp`, `fbc`, `client_ip`, `client_user_agent` on the order at checkout so the server Purchase has full matching data.

### 7.4 Implementation details
- Load the Pixel via `next/script` (`strategy="afterInteractive"`) in the root layout; initialize with `NEXT_PUBLIC_META_PIXEL_ID`.
- Create a server route/action `POST /api/capi` (or a shared server util) that sends to
  `https://graph.facebook.com/v20.0/<PIXEL_ID>/events` with `access_token` from env (`META_CAPI_ACCESS_TOKEN`).
- Include `test_event_code` from env when testing (`META_TEST_EVENT_CODE`) so events show in **Events Manager → Test Events**.
- Payload per event: `event_name`, `event_time` (unix seconds), `event_id`, `event_source_url`, `action_source`, `user_data` (hashed + fbp/fbc/ip/ua), and `custom_data` (`currency: "BDT"`, `value`, `contents`, `content_ids`, `content_type: "product"`, `num_items`).
- Fire the **server Purchase from the checkout server action** (most reliable, runs even if the user closes the tab), and the **browser Purchase on the thank-you page** — both with the order's stored `event_id`.
- Log every browser + server event to `events_log` with `fbtrace_id` from the CAPI response for the Tracking Health page.
- Handle errors gracefully; retry server CAPI once on network failure.

### 7.5 Acceptance / verification (must pass)
- In **Events Manager → Test Events**, each action shows the event **once**, marked as received from **both Browser and Server**, and **"Deduplicated"** / processed once.
- **Event Match Quality shows a good score (target 8–10)** for Purchase using the hashed data.
- No "duplicate events" warning in the Pixel diagnostics.
- Purchase fires reliably even with an ad blocker enabled (server side still records it).

---

## 8. Environment Variables (`.env.local` — document all)

```
NEXT_PUBLIC_SITE_URL=https://dreamcomfortbd.com
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_META_PIXEL_ID=
META_CAPI_ACCESS_TOKEN=
META_TEST_EVENT_CODE=
SMS_PROVIDER=bulksmsbd
SMS_API_KEY=
SMS_SENDER_ID=
ADMIN_ALLOWED_EMAILS=owner@dreamcomfortbd.com
```

---

## 9. Deliverables & Structure

- Clean App Router structure: `app/(store)/...`, `app/admin/...`, `app/api/...`, `lib/` (supabase clients, capi, sms, hashing, cart), `components/`, `types/`.
- Provide **Supabase SQL migrations** (create tables, enums, RLS policies, storage bucket `product-images`) I can run in the Supabase SQL editor.
- Provide a **seed script** with 6–8 sample comfort products (bedding/pillows/etc.) and 2 categories.
- Include a `README.md` with: setup steps, how to run migrations, how to create the first admin user, how to get the Meta CAPI access token, how to run Test Events, and how to deploy to Vercel.
- TypeScript everywhere, no `any`. Reusable, well-commented tracking + SMS utilities.

---

## 10. Build Order (follow this sequence)

1. Scaffold Next.js + Tailwind + shadcn + Supabase clients + folder structure.
2. Supabase schema + RLS + storage bucket + seed data.
3. Storefront: layout, home, product list, product detail, cart, COD checkout, order confirmation, track order.
4. Admin auth + middleware + dashboard + products CRUD (with image upload) + categories.
5. Orders management + status changes + invoice PDF.
6. SMS integration + templates + logs.
7. **Meta Pixel + CAPI dual tracking with shared event_id deduplication + Advanced Matching** (Section 7) + Tracking Health page.
8. SEO, performance pass (Lighthouse ≥ 90 mobile), and the verification checklist in 7.5.

Ask me for the brand colors, logo, and product list before finalizing the design. Start now with steps 1–2.
```
