// lib/manual-conversion.ts
// One idempotent place to forward a manual / chat order to Meta CAPI + TikTok EAPI
// as a server-side Purchase. Called from three spots depending on the admin's
// chosen firing mode (Settings → ম্যানুয়াল / চ্যাট অর্ডার):
//   • on_create          → fired right after createManualOrder inserts the order
//   • on_confirm         → fired when the order's status becomes "confirmed"
//   • on_confirm_or_24h  → fired on confirm, else by the /api/cron/manual-conversions
//                          fallback once the order is >24h old
//
// De-duplication is the whole point: an order is sent AT MOST ONCE. We guard with
// the `capi_sent` column (set true after a successful send) and only ever fire for
// orders flagged `is_manual` — so website orders (already tracked at checkout via
// Pixel + CAPI) are never re-sent, and no order is double-counted.

import { getServerSupabase } from "@/lib/supabase/server";
import { getManualSettings, getMetaSettings } from "@/lib/settings";
import { sendServerEvent } from "@/lib/meta/capi";
import { logEvent } from "@/lib/meta/log";
import { sendTikTokEvent, toTikTokProps } from "@/lib/tiktok/events";

export interface FireOpts {
  /** Treat the order as manual even if the is_manual column isn't set/available yet
   *  (used right after createManualOrder, where we know it's a manual order). */
  assumeManual?: boolean;
  /** Site origin for the event_source_url (e.g. https://dreamcomfortbd.com). */
  origin?: string;
}

function resolveOrigin(origin?: string): string {
  if (origin) return origin.replace(/\/$/, "");
  const env = process.env.NEXT_PUBLIC_SITE_URL;
  if (env) return env.replace(/\/$/, "");
  return "https://www.dreamcomfortbd.com";
}

/**
 * Idempotently forward one order's Purchase to Meta CAPI + TikTok EAPI.
 * Returns a small status object (never throws). Safe to call multiple times —
 * repeat calls short-circuit once capi_sent is true.
 */
export async function fireOrderConversion(
  orderId: string,
  opts: FireOpts = {}
): Promise<{ sent: boolean; reason?: string }> {
  try {
    const manual = await getManualSettings();
    if (!manual.sendMeta && !manual.sendTiktok) return { sent: false, reason: "disabled" };

    const supabase = getServerSupabase();

    // Load the order. is_manual / capi_sent may not exist yet (migration not run) —
    // select them separately and fall back if the column is missing.
    const baseCols =
      "id, order_number, total, customer_name, customer_phone, city, status, order_items(product_id, product_name, quantity, unit_price)";
    let isManual = !!opts.assumeManual;
    let alreadySent = false;

    let order: any = null;
    const withFlags = await supabase
      .from("orders")
      .select(baseCols + ", is_manual, capi_sent")
      .eq("id", orderId)
      .single();

    if (withFlags.error) {
      const code = (withFlags.error as any).code;
      const missingCol = code === "42703" || /is_manual|capi_sent/i.test(withFlags.error.message || "");
      if (!missingCol) return { sent: false, reason: withFlags.error.message };
      // Columns not migrated yet — load without them. We can't dedup via capi_sent,
      // so we lean on assumeManual + the single-call sites to avoid doubles.
      const fallback = await supabase.from("orders").select(baseCols).eq("id", orderId).single();
      if (fallback.error || !fallback.data) return { sent: false, reason: fallback.error?.message || "not found" };
      order = fallback.data;
    } else {
      order = withFlags.data;
      isManual = isManual || order.is_manual === true;
      alreadySent = order.capi_sent === true;
    }

    if (!order) return { sent: false, reason: "not found" };
    if (!isManual) return { sent: false, reason: "not manual" };
    if (alreadySent) return { sent: false, reason: "already sent" };

    // Never (re)send for cancelled/returned orders.
    if (order.status === "cancelled" || order.status === "returned") {
      return { sent: false, reason: "cancelled/returned" };
    }

    const items: any[] = order.order_items ?? [];
    if (items.length === 0) return { sent: false, reason: "no items" };

    const origin = resolveOrigin(opts.origin);
    // Deterministic event_id per order — this is a SECOND dedup safety net beyond the
    // capi_sent column. If this order were ever fired twice (e.g. a rare race, or a
    // failed capi_sent write), Meta and TikTok both collapse events that share the
    // same event_id + event name, so the order still counts only once.
    const eventId = `dc-purchase-${order.id}`;
    const name = (order.customer_name || "").trim();
    const parts = name.split(/\s+/).filter(Boolean);
    const first = parts[0];
    const last = parts.length > 1 ? parts.slice(1).join(" ") : undefined;
    const phone = order.customer_phone || undefined; // stored as 8801XXXXXXXXX
    const city = order.city || undefined;
    const contents = items.map((li) => ({
      id: li.product_id,
      quantity: Number(li.quantity) || 1,
      item_price: Number(li.unit_price) || 0,
    }));
    const numItems = contents.reduce((n, c) => n + c.quantity, 0);
    const value = Number(order.total) || 0;
    const url = `${origin}/order/${order.order_number}`;

    let anySent = false;

    if (manual.sendMeta) {
      try {
        const meta = await getMetaSettings();
        if (meta.pixelId && meta.capiToken) {
          const res = await sendServerEvent({
            eventName: "Purchase",
            eventId,
            eventSourceUrl: url,
            // No fbp/fbc/IP/UA — this is an admin/server action, not the customer's
            // browser. Hashed phone/name/city carry the match quality.
            user: { phone, firstName: first, lastName: last, city },
            customData: {
              currency: "BDT",
              value,
              num_items: numItems,
              content_ids: contents.map((c) => c.id),
              content_type: "product",
              contents,
            },
          });
          if (res.ok) anySent = true;
          await logEvent({
            event_name: "Purchase",
            event_id: eventId,
            source: "server",
            fbtrace_id: res.fbtrace_id,
            payload: { order_number: order.order_number, manual: true },
          });
        }
      } catch {
        /* best-effort */
      }
    }

    if (manual.sendTiktok) {
      try {
        await sendTikTokEvent({
          eventName: "CompletePayment",
          eventId,
          url,
          user: { phone, firstName: first, lastName: last },
          properties: toTikTokProps({
            currency: "BDT",
            value,
            contents: contents.map((c) => ({ id: c.id, quantity: c.quantity, item_price: c.item_price })),
          }),
        });
        anySent = true;
      } catch {
        /* best-effort */
      }
    }

    // Mark as sent so we never double-count. Best-effort — ignore a missing column.
    if (anySent) {
      try {
        await supabase.from("orders").update({ capi_sent: true }).eq("id", orderId);
      } catch {
        /* column may not exist yet */
      }
    }

    return { sent: anySent };
  } catch (e: any) {
    return { sent: false, reason: e?.message || "error" };
  }
}
