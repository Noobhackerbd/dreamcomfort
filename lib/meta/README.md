# Meta Pixel + CAPI — how these files fit together

Goal: every event fires **once from the browser** and **once from the server**, sharing one
`event_id`, so Meta deduplicates them — and the server copy carries enough hashed + cookie data
to push Event Match Quality past 7.

## Files
- `lib/meta/hash.ts` — SHA-256 + BD phone normalization, builds hashed `user_data`.
- `lib/meta/fb-cookies.ts` — reads `_fbp` / `_fbc` / IP / user-agent on the server.
- `lib/meta/capi.ts` — `sendServerEvent()` posts to the Conversions API (with retry).
- `lib/meta/event-id.ts` — `newEventId()` (server) / `newBrowserEventId()` (client).
- `components/MetaPixel.tsx` — loads the browser Pixel + `trackBrowser(name, params, eventId)`.
- `app/api/capi/route.ts` — generic endpoint for browser-driven events.

## 1. Add the Pixel to the root layout
```tsx
// app/layout.tsx
import { MetaPixel } from "@/components/MetaPixel";
export default function RootLayout({ children }) {
  return (<html><body>{children}<MetaPixel /></body></html>);
}
```

## 2. The golden rule for deduplication
Generate ONE `event_id` per action and use it in BOTH places:

```tsx
// client component, e.g. AddToCart button
import { trackBrowser } from "@/components/MetaPixel";
import { newBrowserEventId } from "@/lib/meta/event-id";

async function onAddToCart(product) {
  const eventId = newBrowserEventId();               // (1) one id
  trackBrowser("AddToCart", {                        // (2) browser copy
    currency: "BDT", value: product.price,
    content_ids: [product.id], content_type: "product",
    contents: [{ id: product.id, quantity: 1, item_price: product.price }],
  }, eventId);

  await fetch("/api/capi", {                          // (3) server copy, SAME id
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      eventName: "AddToCart", eventId, url: window.location.href,
      customData: { currency: "BDT", value: product.price,
        content_ids: [product.id], content_type: "product" },
    }),
  });
}
```

## 3. Purchase — the important one (fire server-side from checkout)
Generate the `event_id` at checkout, **store it on the order**, fire the server Purchase inside the
Server Action (runs even if the tab closes), and fire the browser Purchase on the thank-you page
with the SAME stored id.

```ts
// app/(store)/checkout/actions.ts  (Server Action)
"use server";
import { newEventId } from "@/lib/meta/event-id";
import { sendServerEvent } from "@/lib/meta/capi";
import { getServerMatchSignals } from "@/lib/meta/fb-cookies";
// import { createOrder, logEvent } from "@/lib/db";

export async function placeOrder(form: CheckoutForm) {
  const eventId = newEventId();
  const signals = getServerMatchSignals(form.fbclid); // fbp/fbc/ip/ua

  // Save order WITH eventId + signals so the thank-you page can reuse eventId
  const order = await createOrder({
    ...form,
    event_id: eventId,
    fbp: signals.fbp, fbc: signals.fbc,
    client_ip: signals.client_ip_address,
    client_user_agent: signals.client_user_agent,
  });

  // Server Purchase (reliable, ad-blocker proof)
  const res = await sendServerEvent({
    eventName: "Purchase",
    eventId,
    eventSourceUrl: `${process.env.NEXT_PUBLIC_SITE_URL}/order/${order.order_number}`,
    user: {
      phone: form.phone, firstName: form.firstName, lastName: form.lastName,
      city: form.city, state: form.district, zip: form.postcode,
      email: form.email, externalId: form.phone,
    },
    signals,
    customData: {
      currency: "BDT", value: order.total, num_items: order.itemCount,
      content_ids: order.items.map(i => i.product_id),
      content_type: "product",
      contents: order.items.map(i => ({ id: i.product_id, quantity: i.quantity, item_price: i.unit_price })),
    },
  });

  // await logEvent({ event_name: "Purchase", event_id: eventId, source: "server", fbtrace_id: res.fbtrace_id });
  return { orderNumber: order.order_number };
}
```

```tsx
// app/(store)/order/[order_number]/PurchasePixel.tsx  (client)
"use client";
import { useEffect } from "react";
import { trackBrowser } from "@/components/MetaPixel";
export function PurchasePixel({ order }) {
  useEffect(() => {
    trackBrowser("Purchase", {
      currency: "BDT", value: order.total,
      content_ids: order.item_product_ids, content_type: "product",
    }, order.event_id); // <-- SAME id stored on the order = dedup
  }, [order]);
  return null;
}
```

## 4. Verify (target pixel health / EMQ 8–10)
1. Set `META_TEST_EVENT_CODE` in `.env.local`, run a test order.
2. Events Manager → your dataset → **Test Events**: each action appears **once**, tagged
   **Browser + Server**, marked deduplicated.
3. Check **Event Match Quality** on Purchase — the hashed phone/name/city + fbp/fbc/IP/UA
   should put it in the good range.
4. Remove `META_TEST_EVENT_CODE` before going live.

## Gotchas
- Hash on the **server only**. Never hash in the browser and never send raw PII to CAPI.
- Same `event_name`, same `event_id`, `action_source: "website"` on both sides.
- One browser + one server per event. Don't also fire the server Purchase from `/api/capi` if
  you already fire it in the Server Action — that would double-send from the server.
- `randomUUID`/crypto needs the Node runtime (`export const runtime = "nodejs"`), not Edge.
