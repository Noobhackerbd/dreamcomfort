// lib/order-courier.ts — changing an order's status, with the CarryBee rule in one place
// (used by the admin panel and the mobile app).
//
// Rule: when "auto-send to CarryBee on confirm" is on, an order only becomes "confirmed"
// AFTER CarryBee has accepted it and returned a consignment id. If CarryBee refuses
// (bad address, phone, store, network…), the order keeps its old status and you get
// CarryBee's error — so nothing is "confirmed" that the courier doesn't know about.
import "server-only";
import { getServerSupabase } from "@/lib/supabase/server";
import { getSmsTemplates, getCarryBeeSettings } from "@/lib/settings";
import { queueSms } from "@/lib/sms";
import { fillTemplate, withTrackLink, STATUS_SMS_MAP } from "@/lib/sms/templates";
import { trackUrl } from "@/lib/track-link";
import { createParcel, carrybeeConfigured } from "@/lib/carrybee";

export const ORDER_STATUSES = ["pending", "confirmed", "processing", "shipped", "delivered", "cancelled", "returned"];

export type PushResult = { ok: true; consignmentId: string; deliveryFee?: number; status?: string } | { ok: false; error: string };

/** Create the CarryBee consignment for an order and store it on the order. */
export async function pushOrderToCarryBee(orderId: string): Promise<PushResult> {
  if (!(await carrybeeConfigured())) {
    return { ok: false, error: "CarryBee কনফিগার করা হয়নি (Settings পেজে CarryBee তথ্য দিন)।" };
  }
  const supabase = getServerSupabase();
  const { data: order } = await supabase
    .from("orders")
    .select("*, order_items(product_name, quantity)")
    .eq("id", orderId)
    .single();
  if (!order) return { ok: false, error: "অর্ডার পাওয়া যায়নি।" };

  if (order.tracking_id && order.courier === "CarryBee") {
    return { ok: false, error: `এই অর্ডার ইতিমধ্যে CarryBee-তে পাঠানো হয়েছে (${order.tracking_id})।` };
  }

  const items = order.order_items ?? [];
  const qty = items.reduce((n: number, it: any) => n + Number(it.quantity || 0), 0) || 1;
  const address = [order.address_line, order.area, order.city, order.district].filter(Boolean).join(", ");
  const productDesc = items.map((it: any) => `${it.product_name} x${it.quantity}`).join(", ").slice(0, 250);

  // Default parcel weight from Settings (kg → grams); falls back to 1.5kg.
  const cb = await getCarryBeeSettings();
  const weightGrams = Math.max(1, Math.round((Number(cb.defaultWeight) || 1.5) * 1000));

  const res = await createParcel({
    recipientName: order.customer_name,
    recipientPhone: order.customer_phone,
    recipientAddress: address,
    collectableAmount: Number(order.total), // COD
    itemQuantity: qty,
    itemWeightGrams: weightGrams,
    merchantOrderId: order.order_number,
    specialInstruction: order.notes || "",
    productDescription: productDesc,
  });

  if (!res.ok || !res.consignmentId) return { ok: false, error: res.error ?? "CarryBee অর্ডার ব্যর্থ — consignment id পাওয়া যায়নি।" };

  await supabase.from("orders").update({ courier: "CarryBee", tracking_id: res.consignmentId }).eq("id", orderId);
  return { ok: true, consignmentId: res.consignmentId, deliveryFee: res.deliveryFee, status: res.status };
}

/**
 * Set an order's status. Confirming with CarryBee auto-send on: CarryBee first; the
 * status changes only when it returns a consignment id. Then the status SMS (which can
 * now include the tracking id).
 */
export async function setOrderStatus(orderId: string, status: string): Promise<{ ok: true; trackingId?: string } | { ok: false; error: string; courierFailed?: boolean }> {
  if (!ORDER_STATUSES.includes(status)) return { ok: false, error: "invalid status" };
  const supabase = getServerSupabase();
  let trackingId: string | undefined;

  if (status === "confirmed") {
    const cb = await getCarryBeeSettings().catch(() => null);
    if (cb?.autoOnConfirm && cb.clientId && cb.clientSecret && cb.clientContext) {
      const { data: cur } = await supabase.from("orders").select("courier, tracking_id").eq("id", orderId).single();
      if (cur?.courier === "CarryBee" && cur?.tracking_id) {
        trackingId = cur.tracking_id; // already with CarryBee
      } else {
        let pushed: PushResult;
        try {
          pushed = await pushOrderToCarryBee(orderId);
        } catch (e: any) {
          pushed = { ok: false, error: e?.message || "CarryBee-তে পাঠানো যায়নি।" };
        }
        if (!pushed.ok) {
          return { ok: false, courierFailed: true, error: `CarryBee: ${pushed.error} — অর্ডার কনফার্ম হয়নি। ঠিকানা/ফোন ঠিক করে আবার চেষ্টা করুন।` };
        }
        trackingId = pushed.consignmentId;
      }
    }
  }

  const { error } = await supabase.from("orders").update({ status }).eq("id", orderId);
  if (error) return { ok: false, error: error.message };

  // Status SMS for statuses that have a template (confirmed/shipped/delivered). Best-effort.
  const templateKey = STATUS_SMS_MAP[status];
  if (templateKey) {
    try {
      const { data: order } = await supabase
        .from("orders")
        .select("customer_name, customer_phone, order_number, tracking_id")
        .eq("id", orderId)
        .single();
      if (order) {
        const templates = await getSmsTemplates();
        const msg = fillTemplate(withTrackLink((templates as any)[templateKey], templateKey), {
          name: order.customer_name,
          order: order.order_number,
          tracking: order.tracking_id ?? "",
          link: trackUrl(order.order_number),
        });
        queueSms({ phone: order.customer_phone, message: msg, orderId, event: templateKey });
      }
    } catch { /* never block a status change on SMS */ }
  }
  return { ok: true, trackingId };
}
