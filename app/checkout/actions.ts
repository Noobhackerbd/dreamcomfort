"use server";

import { getServerSupabase } from "@/lib/supabase/server";
import { getServerMatchSignals, getExternalId } from "@/lib/meta/fb-cookies";
import { headers } from "next/headers";
import { newEventId } from "@/lib/meta/event-id";
import { sendServerEvent } from "@/lib/meta/capi";
import { logEvent } from "@/lib/meta/log";
import { resolveShippingFee, getSmsTemplates, getMetaSettings } from "@/lib/settings";
import { sendSmsAsync } from "@/lib/sms";
import { fillTemplate } from "@/lib/sms/templates";
import { markLeadConverted } from "./lead-actions";
import type { DeliveryArea } from "@/lib/config";

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
}

export interface PlaceOrderResult {
  ok: boolean;
  orderNumber?: string;
  error?: string;
}

/** Normalize a BD phone to 8801XXXXXXXXX for storage/matching. */
function normalizePhone(raw: string): string {
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
    const phoneDigits = (input.phone || "").replace(/\D/g, "");
    const deliveryArea: DeliveryArea = input.deliveryArea === "outside" ? "outside" : "inside";

    if (!name) return { ok: false, error: "নাম লিখুন।" };
    if (!/^01\d{9}$/.test(phoneDigits))
      return { ok: false, error: "সঠিক মোবাইল নম্বর লিখুন (০১XXXXXXXXX)।" };
    if (!address || address.length < 5)
      return { ok: false, error: "সম্পূর্ণ ঠিকানা লিখুন।" };
    if (!input.items?.length) return { ok: false, error: "কার্ট খালি।" };

    const supabase = getServerSupabase();

    // Re-fetch prices from DB — never trust prices sent from the browser.
    const ids = input.items.map((i) => i.id);
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

    const shippingFee = await resolveShippingFee(deliveryArea);
    const total = subtotal + shippingFee;

    // Meta matching signals + shared event_id (used later for CAPI Purchase dedup).
    const eventId = newEventId();
    const signals = getServerMatchSignals(input.fbclid);
    const phone = normalizePhone(input.phone);

    // Create the order.
    const { data: order, error: oErr } = await supabase
      .from("orders")
      .insert({
        status: "pending",
        customer_name: name,
        customer_phone: phone,
        customer_email: input.email?.trim() || null,
        address_line: address,
        area: input.area?.trim() || null,
        city: input.city?.trim() || (deliveryArea === "inside" ? "Dhaka" : null),
        district: input.city?.trim() || null,
        payment_method: "cod",
        subtotal,
        shipping_fee: shippingFee,
        discount: 0,
        total,
        notes: input.notes?.trim() || null,
        event_id: eventId,
        fbp: signals.fbp ?? null,
        fbc: signals.fbc ?? null,
        client_ip: signals.client_ip_address ?? null,
        client_user_agent: signals.client_user_agent ?? null,
      })
      .select("id, order_number, total, created_at")
      .single();

    if (oErr || !order) return { ok: false, error: oErr?.message ?? "অর্ডার তৈরি ব্যর্থ।" };

    // Insert items.
    const { error: iErr } = await supabase
      .from("order_items")
      .insert(lineItems.map((li) => ({ ...li, order_id: order.id })));
    if (iErr) return { ok: false, error: iErr.message };

    // Mark the abandoned-cart lead (if any) as converted. Best-effort.
    if (input.leadId) {
      void markLeadConverted(input.leadId, order.id, order.order_number);
    }

    // Upsert the customer (best-effort; never blocks the order).
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
            total_spent: Number(existing.total_spent ?? 0) + Number(order.total),
          })
          .eq("id", existing.id);
      } else {
        await supabase.from("customers").insert({
          phone,
          name,
          total_orders: 1,
          total_spent: Number(order.total),
        });
      }
    } catch {
      /* ignore customer upsert errors */
    }

    // Order-placed SMS (async, never blocks / fails the order).
    try {
      const templates = await getSmsTemplates();
      const msg = fillTemplate(templates.order_placed, {
        name,
        order: order.order_number,
        total: Number(order.total),
      });
      void sendSmsAsync({ phone, message: msg, orderId: order.id });
    } catch {
      /* ignore */
    }

    // Fire server-side Purchase ONLY if Meta is configured (safe no-op otherwise).
    const metaCfg = await getMetaSettings();
    if (metaCfg.capiToken && metaCfg.pixelId) {
      try {
        const { first, last } = splitName(name);
        // Robust absolute origin (never "undefined/order/…"): env → request host.
        const host = headers().get("host");
        const origin = process.env.NEXT_PUBLIC_SITE_URL || (host ? `https://${host}` : "");
        const res = await sendServerEvent({
          eventName: "Purchase",
          eventId,
          // Use the order's creation time as the event time (the moment the purchase happened).
          eventTime: Math.floor(new Date(order.created_at).getTime() / 1000) || undefined,
          eventSourceUrl: `${origin}/order/${order.order_number}`,
          user: {
            email: input.email,
            phone: input.phone,
            firstName: first,
            lastName: last,
            city: input.city || (deliveryArea === "inside" ? "dhaka" : undefined),
            // Only send a real division as state; sending city as state can lower match quality.
            state: undefined,
            // Stable, PLAIN external id, identical to the browser value → links the journey.
            externalId: getExternalId() || undefined,
          },
          signals,
          customData: {
            currency: "BDT",
            value: Number(order.total),
            num_items: lineItems.reduce((n, li) => n + li.quantity, 0),
            content_ids: lineItems.map((li) => li.product_id),
            content_type: "product",
            contents: lineItems.map((li) => ({
              id: li.product_id,
              quantity: li.quantity,
              item_price: li.unit_price,
            })),
          },
        });
        await logEvent({
          event_name: "Purchase",
          event_id: eventId,
          source: "server",
          fbtrace_id: res.fbtrace_id,
          payload: { order_number: order.order_number },
        });
      } catch {
        // never fail the order because tracking failed
      }
    }

    return { ok: true, orderNumber: order.order_number };
  } catch (e: any) {
    return { ok: false, error: e?.message ?? "কিছু একটা সমস্যা হয়েছে।" };
  }
}
