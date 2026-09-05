"use server";

import { getServerSupabase } from "@/lib/supabase/server";
import { getServerMatchSignals, getExternalId } from "@/lib/meta/fb-cookies";
import { headers } from "next/headers";
import { newEventId } from "@/lib/meta/event-id";
import { sendServerEvent } from "@/lib/meta/capi";
import { sendTikTokEvent, toTikTokProps } from "@/lib/tiktok/events";
import { getTikTokSignals } from "@/lib/tiktok/signals";
import { logEvent } from "@/lib/meta/log";
import { resolveShippingFee, getSmsTemplates, getMetaSettings, getBdCourierSettings } from "@/lib/settings";
import { sendSmsAsync } from "@/lib/sms";
import { fillTemplate } from "@/lib/sms/templates";
import { markLeadConverted } from "./lead-actions";
import { refreshAndCacheCourierRatio, getCachedRatios } from "@/lib/bdcourier";
import { sendOrderPush } from "@/lib/push";
import { validateCoupon, redeemCoupon, type CouponResult } from "@/lib/coupons";
import { waitUntil } from "@vercel/functions";
import type { DeliveryArea } from "@/lib/config";

/**
 * Keep a background task alive until it finishes, WITHOUT delaying the response.
 * On Vercel a plain `void promise` after a Server Action returns can be killed
 * before it completes — which is why the server Purchase used to be missing.
 * waitUntil tells the platform to wait for it. Falls back to best-effort locally.
 */
function keepAlive(p: Promise<unknown>) {
  try { waitUntil(p); } catch { void Promise.resolve(p).catch(() => {}); }
}

export interface PlaceOrderInput {
  name: string;
  phone: string;
  email?: string;
  address: string;
  area?: string;
  city?: string;
  deliveryArea?: DeliveryArea; // inside | outside Dhaka
  notes?: string;
  items: { id: string; qty: number; variantId?: string }[];
  fbclid?: string;
  leadId?: string; // abandoned-cart lead to mark converted
  couponCode?: string; // store checkout only — never on the landing funnel
}

/** Server action: check a coupon against a subtotal (used by the checkout page). */
export async function checkCoupon(code: string, subtotal: number): Promise<CouponResult> {
  return validateCoupon(code, subtotal);
}

export interface PlaceOrderResult {
  ok: boolean;
  orderNumber?: string;
  error?: string;
}

/**
 * Turn whatever the customer typed into the local BD mobile 01XXXXXXXXX, or null if
 * it isn't a valid BD mobile. Tolerates +880 / 880 / 0088 country code, Bengali
 * digits (০১…), and any spaces / dashes / brackets.
 */
function toLocalBdPhone(raw: string): string | null {
  const en = String(raw || "").replace(/[০-৯]/g, (ch) => "০১২৩৪৫৬৭৮৯".indexOf(ch).toString());
  let d = en.replace(/\D/g, "");
  if (d.startsWith("00")) d = d.slice(2);                       // 0088… → 88…
  if (d.startsWith("880")) d = d.slice(3);                      // strip country code
  else if (d.startsWith("88") && d.length > 11) d = d.slice(2); // stray 88 prefix
  if (d.length === 10 && d.startsWith("1")) d = "0" + d;        // 1XXXXXXXXX → 01XXXXXXXXX
  return /^01\d{9}$/.test(d) ? d : null;
}

/** Normalize a BD phone to 8801XXXXXXXXX for storage/matching. */
function normalizePhone(raw: string): string {
  const local = toLocalBdPhone(raw);
  if (local) return "88" + local; // 8801XXXXXXXXX
  let d = raw.replace(/\D/g, "");
  if (d.startsWith("00")) d = d.slice(2);
  if (d.startsWith("0")) d = "88" + d;
  else if (d.startsWith("1")) d = "880" + d;
  else if (!d.startsWith("880")) d = "880" + d;
  return d;
}

function splitName(full: string): { first: string; last?: string } {
  const parts = full.trim().split(/\s+/);
  return { first: parts[0], last: parts.length > 1 ? parts.slice(1).join(" ") : undefined };
}

export async function placeOrder(input: PlaceOrderInput): Promise<PlaceOrderResult> {
  try {
    const name = input.name?.trim();
    const address = input.address?.trim();
    const localPhone = toLocalBdPhone(input.phone || "");
    const deliveryArea: DeliveryArea = input.deliveryArea === "outside" ? "outside" : "inside";

    if (!name) return { ok: false, error: "নাম লিখুন।" };
    if (!localPhone)
      return { ok: false, error: "সঠিক মোবাইল নম্বর লিখুন (০১XXXXXXXXX)।" };
    if (!address || address.length < 5)
      return { ok: false, error: "সম্পূর্ণ ঠিকানা লিখুন।" };
    if (!input.items?.length) return { ok: false, error: "কার্ট খালি।" };

    const supabase = getServerSupabase();

    // Re-fetch prices from DB — never trust prices sent from the browser.
    // Kick off the shipping-fee lookup CONCURRENTLY (independent round-trip) so the
    // two DB reads overlap instead of running one-after-another → faster checkout.
    const ids = input.items.map((i) => i.id);
    const shippingP = resolveShippingFee(deliveryArea);
    const { data: products, error: pErr } = await supabase
      .from("products")
      .select("id, name_bn, name_en, price")
      .in("id", ids);
    if (pErr) return { ok: false, error: pErr.message };
    if (!products?.length) return { ok: false, error: "পণ্য খুঁজে পাওয়া যায়নি।" };

    const priceMap = new Map(products.map((p: any) => [p.id, p]));
    let subtotal = 0;
    const lineItems = input.items
      .map((i) => {
        const p: any = priceMap.get(i.id);
        if (!p) return null;
        const qty = Math.max(1, Math.floor(i.qty));

        const unitPrice = Number(p.price);
        const name: string = p.name_bn || p.name_en;

        const line = unitPrice * qty;
        subtotal += line;
        return {
          product_id: p.id,
          product_name: name,
          unit_price: unitPrice,
          quantity: qty,
          line_total: line,
        };
      })
      .filter(Boolean) as any[];

    const shippingFee = await shippingP;

    // Coupon (store checkout only) — re-validated server-side against the real subtotal.
    let discount = 0;
    let couponCode: string | null = null;
    if (input.couponCode && input.couponCode.trim()) {
      const c = await validateCoupon(input.couponCode, subtotal);
      if (c.ok) { discount = c.discount; couponCode = c.code; }
    }
    const total = Math.max(0, subtotal + shippingFee - discount);

    // Meta matching signals + shared event_id (used later for CAPI Purchase dedup).
    const eventId = newEventId();
    const signals = getServerMatchSignals(input.fbclid);
    const phone = normalizePhone(input.phone);

    // Ad-quality gate: if this customer's courier success rate is below the configured
    // threshold, don't fire the Meta/TikTok Purchase (Pixel + CAPI) — so the ad
    // algorithms stop optimizing toward fraud-prone / high-return buyers. (0 = off.)
    //
    // IMPORTANT: this uses only the SAVED (cached) rate — a couple of fast DB reads,
    // NO external API call — so checkout is never slowed for the customer. A repeat
    // fraud-prone buyer is already cached (from a prior order or the cron), so they're
    // caught; a brand-new number simply isn't suppressed on its first order. The live
    // fetch that fills the cache always runs in the BACKGROUND below.
    let trackSuppressed = false;
    try {
      const bc = await getBdCourierSettings();
      const threshold = Number(bc.suppressBelowRatio) || 0;
      if (threshold > 0) {
        const local = toLocalBdPhone(input.phone) || "";
        const cached = await getCachedRatios([local]);
        const hit = cached.get(local);
        if (hit && hit.data.total > 0 && hit.data.ratio < threshold) trackSuppressed = true;
      }
    } catch {
      /* never block checkout on the courier lookup */
    }
    // Fetch + save the rate in the background (never awaited) — for the admin list,
    // the cron, and to catch this customer on their NEXT order.
    void refreshAndCacheCourierRatio(phone);

    // Create the order.
    const orderRow: Record<string, unknown> = {
      status: "pending",
      customer_name: name,
      customer_phone: phone,
      customer_email: input.email?.trim() || null,
      address_line: address,
      area: input.area?.trim() || null,
      city: input.city?.trim() || null,
      district: input.city?.trim() || null,
      payment_method: "cod",
      subtotal,
      shipping_fee: shippingFee,
      discount,
      total,
      notes: input.notes?.trim() || null,
      coupon_code: couponCode,
      track_suppressed: trackSuppressed,
      event_id: eventId,
      fbp: signals.fbp ?? null,
      fbc: signals.fbc ?? null,
      client_ip: signals.client_ip_address ?? null,
      client_user_agent: signals.client_user_agent ?? null,
    };
    let { data: order, error: oErr } = await supabase
      .from("orders").insert(orderRow).select("id, order_number, total, created_at").single();
    if (oErr && ((oErr as any).code === "42703" || /coupon_code|track_suppressed/i.test(oErr.message || ""))) {
      // Optional columns not migrated yet — save the order without them.
      delete orderRow.coupon_code;
      delete orderRow.track_suppressed;
      ({ data: order, error: oErr } = await supabase.from("orders").insert(orderRow).select("id, order_number, total, created_at").single());
    }

    if (oErr || !order) return { ok: false, error: oErr?.message ?? "অর্ডার তৈরি ব্যর্থ।" };

    // Count the coupon use (best-effort, after the order exists).
    if (couponCode) void redeemCoupon(couponCode);

    // Insert items.
    const { error: iErr } = await supabase
      .from("order_items")
      .insert(lineItems.map((li) => ({ ...li, order_id: order.id })));
    if (iErr) return { ok: false, error: iErr.message };

    // Mark the abandoned-cart lead (if any) as converted. Best-effort.
    if (input.leadId) {
      void markLeadConverted(input.leadId, order.id, order.order_number);
    }

    // (Courier success rate was already fetched + cached above for the suppression gate.)

    // Upsert the customer (best-effort) — backgrounded so it never blocks checkout.
    const orderTotal = Number(order.total);
    keepAlive((async () => {
      try {
        const { data: existing } = await supabase
          .from("customers")
          .select("id, total_orders, total_spent")
          .eq("phone", phone)
          .maybeSingle();
        if (existing) {
          await supabase
            .from("customers")
            .update({
              name,
              total_orders: (existing.total_orders ?? 0) + 1,
              total_spent: Number(existing.total_spent ?? 0) + orderTotal,
            })
            .eq("id", existing.id);
        } else {
          await supabase.from("customers").insert({ phone, name, total_orders: 1, total_spent: orderTotal });
        }
      } catch {
        /* ignore customer upsert errors */
      }
    })());

    // Order-placed SMS — backgrounded (template fetch + send off the critical path).
    const orderNumber = order.order_number;
    const orderId = order.id;
    void (async () => {
      try {
        const templates = await getSmsTemplates();
        const msg = fillTemplate(templates.order_placed, { name, order: orderNumber, total: orderTotal });
        await sendSmsAsync({ phone, message: msg, orderId });
      } catch {
        /* ignore */
      }
    })();

    // Tracking (Meta CAPI) + admin push — BOTH fully backgrounded, nothing awaited.
    // The customer's "Order confirmed" response returns the instant the order rows are
    // saved. The browser Pixel on the thank-you page is the Purchase safety net (deduped
    // by event_id) so CAPI loses nothing; the admin dashboard also polls for new orders,
    // so a slow push never stalls checkout.
    {
      // Read request-scoped values (headers/cookies) now, before any await.
      const host = headers().get("host");
      const origin = process.env.NEXT_PUBLIC_SITE_URL || (host ? `https://${host}` : "");
      const externalId = getExternalId() || undefined;
      const { first, last } = splitName(name);
      const snap = { order_number: order.order_number, created_at: order.created_at, total: Number(order.total) };
      const contents = lineItems.map((li) => ({ id: li.product_id, quantity: li.quantity, item_price: li.unit_price }));
      const numItems = lineItems.reduce((n, li) => n + li.quantity, 0);

      // CAPI Purchase — runs in the background but is kept alive via waitUntil so it
      // ALWAYS completes after the response (a plain fire-and-forget was getting killed
      // by the serverless runtime, which is why the server Purchase was missing).
      keepAlive((async () => {
        if (trackSuppressed) return; // low courier-ratio customer — don't train the algorithm
        const metaCfg = await getMetaSettings();
        if (!metaCfg.capiToken || !metaCfg.pixelId) return;
        const res = await sendServerEvent({
          eventName: "Purchase",
          eventId,
          eventTime: Math.floor(new Date(snap.created_at).getTime() / 1000) || undefined,
          eventSourceUrl: `${origin}/order/${snap.order_number}`,
          user: {
            email: input.email,
            phone: input.phone,
            firstName: first,
            lastName: last,
            city: input.city || (deliveryArea === "inside" ? "dhaka" : undefined),
            state: undefined,
            externalId,
          },
          signals,
          customData: {
            currency: "BDT",
            value: snap.total,
            num_items: numItems,
            content_ids: contents.map((i) => i.id),
            content_type: "product",
            contents,
          },
        });
        await logEvent({
          event_name: "Purchase",
          event_id: eventId,
          source: "server",
          fbtrace_id: res.fbtrace_id,
          payload: { order_number: snap.order_number },
        });
      })()); // waitUntil keeps it alive to completion

      // TikTok CompletePayment — same event_id as the browser copy (deduped). Kept alive
      // via waitUntil so the server copy reliably reaches TikTok after the response.
      // sendTikTokEvent no-ops if TikTok isn't configured in admin settings.
      keepAlive((async () => {
        if (trackSuppressed) return; // low courier-ratio customer — suppressed
        await sendTikTokEvent({
          eventName: "CompletePayment",
          eventId,
          url: `${origin}/order/${snap.order_number}`,
          eventTime: Math.floor(new Date(snap.created_at).getTime() / 1000) || undefined,
          user: { email: input.email, phone: input.phone, firstName: first, lastName: last, externalId },
          signals: getTikTokSignals(),
          properties: toTikTokProps({
            currency: "BDT",
            value: snap.total,
            contents: contents.map((c) => ({ id: c.id, quantity: c.quantity, item_price: c.item_price })),
          }),
        });
      })());

      // Push — kept alive so the admin notification reliably sends.
      keepAlive(sendOrderPush({
        id: order.id,
        orderNumber: order.order_number,
        total: snap.total,
        customerName: name,
        area: input.area?.trim() || input.city?.trim() || null,
      }));
    }

    return { ok: true, orderNumber: order.order_number };
  } catch (e: any) {
    return { ok: false, error: e?.message ?? "কিছু একটা সমস্যা হয়েছে।" };
  }
}
