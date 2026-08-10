"use server";

import { getServerSupabase } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/admin-auth";
import { getSmsTemplates } from "@/lib/settings";
import { sendSmsAsync } from "@/lib/sms";
import { fillTemplate, STATUS_SMS_MAP } from "@/lib/sms/templates";
import { createParcel, getParcelStatus, carrybeeConfigured, listCities, listZones, listAreas } from "@/lib/carrybee";
import { revalidatePath } from "next/cache";

const STATUSES = [
  "pending",
  "confirmed",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
  "returned",
];

export async function updateOrderStatus(orderId: string, status: string) {
  await requireAdmin();
  if (!STATUSES.includes(status)) return { ok: false, error: "invalid status" };
  const supabase = getServerSupabase();
  const { error } = await supabase.from("orders").update({ status }).eq("id", orderId);
  if (error) return { ok: false, error: error.message };

  // Send a status SMS if this status maps to a template (confirmed/shipped/delivered).
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
        const msg = fillTemplate(templates[templateKey], {
          name: order.customer_name,
          order: order.order_number,
          tracking: order.tracking_id ?? "",
        });
        void sendSmsAsync({ phone: order.customer_phone, message: msg, orderId });
      }
    } catch {
      /* never block a status change on SMS */
    }
  }

  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${orderId}`);
  return { ok: true };
}

export async function updateOrderCourier(
  orderId: string,
  courier: string,
  trackingId: string
) {
  await requireAdmin();
  const supabase = getServerSupabase();
  const { error } = await supabase
    .from("orders")
    .update({ courier: courier.trim() || null, tracking_id: trackingId.trim() || null })
    .eq("id", orderId);
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/admin/orders/${orderId}`);
  return { ok: true };
}

/** Send an order to CarryBee courier — creates a consignment and stores it on the order. */
export async function sendToCarryBee(orderId: string) {
  await requireAdmin();
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
  const address = [order.address_line, order.area, order.city, order.district]
    .filter(Boolean)
    .join(", ");
  const productDesc = items.map((it: any) => `${it.product_name} x${it.quantity}`).join(", ").slice(0, 250);

  const res = await createParcel({
    recipientName: order.customer_name,
    recipientPhone: order.customer_phone,
    recipientAddress: address,
    collectableAmount: Number(order.total), // COD
    itemQuantity: qty,
    merchantOrderId: order.order_number,
    specialInstruction: order.notes || "",
    productDescription: productDesc,
  });

  if (!res.ok) return { ok: false, error: res.error ?? "CarryBee অর্ডার ব্যর্থ।" };

  await supabase
    .from("orders")
    .update({ courier: "CarryBee", tracking_id: res.consignmentId })
    .eq("id", orderId);

  revalidatePath(`/admin/orders/${orderId}`);
  revalidatePath("/admin/orders");
  return { ok: true, consignmentId: res.consignmentId, deliveryFee: res.deliveryFee, status: res.status };
}

/** Send with edited fields from the "Send Order to Courier" modal. */
interface CarryBeeForm {
  recipientName: string;
  recipientPhone: string;
  recipientSecondaryPhone?: string;
  recipientAddress: string;
  amountToCollect: number;
  quantity: number;
  weightKg: number;
  productDescription: string;
  productType?: number;
  cityId?: number;
  zoneId?: number;
  areaId?: number;
}

export async function sendToCarryBeeCustom(orderId: string, form: CarryBeeForm) {
  await requireAdmin();
  if (!(await carrybeeConfigured())) return { ok: false, error: "CarryBee কনফিগার করা হয়নি।" };
  const supabase = getServerSupabase();
  const { data: order } = await supabase
    .from("orders")
    .select("order_number, courier, tracking_id")
    .eq("id", orderId)
    .single();
  if (!order) return { ok: false, error: "অর্ডার পাওয়া যায়নি।" };
  if (order.tracking_id && order.courier === "CarryBee") {
    return { ok: false, error: `ইতিমধ্যে পাঠানো হয়েছে (${order.tracking_id})।` };
  }

  const res = await createParcel({
    recipientName: form.recipientName,
    recipientPhone: form.recipientPhone,
    recipientSecondaryPhone: form.recipientSecondaryPhone,
    recipientAddress: form.recipientAddress,
    collectableAmount: Number(form.amountToCollect),
    itemQuantity: Math.max(1, Math.floor(Number(form.quantity) || 1)),
    itemWeightGrams: Math.max(1, Math.round((Number(form.weightKg) || 0.5) * 1000)),
    productDescription: form.productDescription,
    productType: form.productType,
    merchantOrderId: order.order_number,
    cityId: form.cityId,
    zoneId: form.zoneId,
    areaId: form.areaId,
  });
  if (!res.ok) return { ok: false, error: res.error ?? "ব্যর্থ।" };

  await supabase.from("orders").update({ courier: "CarryBee", tracking_id: res.consignmentId }).eq("id", orderId);
  revalidatePath(`/admin/orders/${orderId}`);
  revalidatePath("/admin/orders");
  return { ok: true, consignmentId: res.consignmentId, deliveryFee: res.deliveryFee, status: res.status };
}

/** Fetch the latest CarryBee status for an order's consignment. */
export async function refreshCarryBeeStatus(consignmentId: string) {
  await requireAdmin();
  const res = await getParcelStatus(consignmentId);
  return res;
}

export async function cbCities() {
  await requireAdmin();
  return listCities();
}
export async function cbZones(cityId: number) {
  await requireAdmin();
  return listZones(cityId);
}
export async function cbAreas(cityId: number, zoneId: number) {
  await requireAdmin();
  return listAreas(cityId, zoneId);
}

/** Save editable customer / address / notes / order date-time. */
export async function saveOrderInfo(
  orderId: string,
  info: {
    customer_name: string;
    customer_phone: string;
    customer_email?: string;
    address_line: string;
    area?: string;
    city?: string;
    district?: string;
    postcode?: string;
    notes?: string;
    created_at?: string | null; // ISO (UTC) — the order date/time
  }
) {
  await requireAdmin();
  if (!info.customer_name?.trim() || !info.customer_phone?.trim()) {
    return { ok: false, error: "গ্রাহকের নাম ও ফোন আবশ্যক।" };
  }
  if (!info.address_line?.trim()) return { ok: false, error: "ঠিকানা আবশ্যক।" };

  const patch: Record<string, unknown> = {
    customer_name: info.customer_name.trim(),
    customer_phone: info.customer_phone.trim(),
    customer_email: info.customer_email?.trim() || null,
    address_line: info.address_line.trim(),
    area: info.area?.trim() || null,
    city: info.city?.trim() || null,
    district: info.district?.trim() || null,
    postcode: info.postcode?.trim() || null,
    notes: info.notes?.trim() || null,
  };
  if (info.created_at) {
    const d = new Date(info.created_at);
    if (!isNaN(d.getTime())) patch.created_at = d.toISOString();
  }

  const supabase = getServerSupabase();
  const { error } = await supabase.from("orders").update(patch).eq("id", orderId);
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/admin/orders/${orderId}`);
  revalidatePath("/admin/orders");
  return { ok: true };
}

/**
 * Replace an order's line items and recompute money.
 * subtotal = Σ(unit_price × quantity); total = max(0, subtotal + shipping − discount).
 */
export async function saveOrderItemsAndTotals(
  orderId: string,
  items: { product_id?: string | null; product_name: string; unit_price: number; quantity: number }[],
  shippingFee: number,
  discount: number
) {
  await requireAdmin();
  const clean = (items || [])
    .map((it) => ({
      product_id: it.product_id || null,
      product_name: (it.product_name || "").trim(),
      unit_price: Math.max(0, Number(it.unit_price) || 0),
      quantity: Math.max(1, Math.floor(Number(it.quantity) || 1)),
    }))
    .filter((it) => it.product_name);
  if (clean.length === 0) return { ok: false, error: "কমপক্ষে একটি পণ্য থাকতে হবে।" };

  const shipping = Math.max(0, Number(shippingFee) || 0);
  const disc = Math.max(0, Number(discount) || 0);
  const rows = clean.map((it) => ({
    order_id: orderId,
    product_id: it.product_id,
    product_name: it.product_name,
    unit_price: it.unit_price,
    quantity: it.quantity,
    line_total: Math.round(it.unit_price * it.quantity * 100) / 100,
  }));
  const subtotal = rows.reduce((n, r) => n + r.line_total, 0);
  const total = Math.max(0, subtotal + shipping - disc);

  const supabase = getServerSupabase();
  // Replace items: delete existing, insert the new set.
  const del = await supabase.from("order_items").delete().eq("order_id", orderId);
  if (del.error) return { ok: false, error: del.error.message };
  const ins = await supabase.from("order_items").insert(rows);
  if (ins.error) return { ok: false, error: ins.error.message };

  const upd = await supabase
    .from("orders")
    .update({ subtotal, shipping_fee: shipping, discount: disc, total })
    .eq("id", orderId);
  if (upd.error) return { ok: false, error: upd.error.message };

  revalidatePath(`/admin/orders/${orderId}`);
  revalidatePath("/admin/orders");
  return { ok: true, subtotal, total };
}

/** Permanently delete an order (items cascade). */
export async function deleteOrder(orderId: string) {
  await requireAdmin();
  const supabase = getServerSupabase();
  const { error } = await supabase.from("orders").delete().eq("id", orderId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/orders");
  return { ok: true };
}

/** Permanently delete many orders at once (items cascade). */
export async function bulkDeleteOrders(orderIds: string[]) {
  await requireAdmin();
  const ids = (orderIds || []).filter(Boolean);
  if (ids.length === 0) return { ok: false, error: "কোনো অর্ডার নির্বাচন করা হয়নি।" };
  const supabase = getServerSupabase();
  const { error } = await supabase.from("orders").delete().in("id", ids);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/orders");
  return { ok: true, deleted: ids.length };
}

/** Manually (re)send an SMS for an order from the order detail view. */
export async function sendManualOrderSms(orderId: string, message: string) {
  await requireAdmin();
  if (!message.trim()) return { ok: false, error: "মেসেজ খালি।" };
  const supabase = getServerSupabase();
  const { data: order } = await supabase
    .from("orders")
    .select("customer_phone")
    .eq("id", orderId)
    .single();
  if (!order) return { ok: false, error: "অর্ডার পাওয়া যায়নি।" };
  await sendSmsAsync({ phone: order.customer_phone, message, orderId });
  revalidatePath("/admin/sms");
  return { ok: true };
}
