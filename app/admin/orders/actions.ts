"use server";

import { getServerSupabase } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/admin-auth";
import { getSmsTemplates, getCarryBeeSettings } from "@/lib/settings";
import { sendSmsAsync } from "@/lib/sms";
import { fillTemplate, STATUS_SMS_MAP } from "@/lib/sms/templates";
import { createParcel, getParcelStatus, carrybeeConfigured, listCities, listZones, listAreas } from "@/lib/carrybee";
import { extractOrderFromImage } from "@/lib/ai";
import { markLeadConverted } from "@/app/checkout/lead-actions";
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

  // Auto-send to CarryBee when an order is confirmed (from any device).
  if (status === "confirmed") {
    try {
      const cb = await getCarryBeeSettings();
      if (cb.autoOnConfirm && cb.clientId && cb.clientSecret && cb.clientContext) {
        await sendToCarryBee(orderId); // best-effort; guards against double-send
      }
    } catch {
      /* never block a status change on courier errors */
    }
  }

  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${orderId}`);
  revalidatePath("/admin/print-station");
  return { ok: true };
}

/** Print Station: confirmed CarryBee orders whose label hasn't been printed yet. */
export async function getPrintQueue() {
  await requireAdmin();
  const supabase = getServerSupabase();
  const { data, error } = await supabase
    .from("orders")
    .select("id, order_number, tracking_id, customer_name")
    .eq("courier", "CarryBee")
    .eq("label_printed", false)
    .not("tracking_id", "is", null)
    .in("status", ["confirmed", "processing", "shipped"])
    .order("created_at", { ascending: true })
    .limit(20);
  if (error) return { ok: false, error: error.message, orders: [] as any[] };
  return { ok: true, orders: data ?? [] };
}

/** Mark an order's label as printed so the Print Station doesn't re-print it. */
export async function markLabelPrinted(orderId: string) {
  await requireAdmin();
  const supabase = getServerSupabase();
  // Try to set both the flag and the timestamp (migration 8). If the timestamp
  // column doesn't exist yet, fall back to just the flag so printing still works.
  const stamped = await supabase
    .from("orders")
    .update({ label_printed: true, label_printed_at: new Date().toISOString() })
    .eq("id", orderId);
  if (stamped.error) {
    const { error } = await supabase.from("orders").update({ label_printed: true }).eq("id", orderId);
    if (error) return { ok: false, error: error.message };
  }
  return { ok: true };
}

/**
 * Print Station tally: for every label printed TODAY (Bangladesh time), sum the
 * product quantities so the operator sees "which products, how many" to pack.
 * Falls back to all-time printed if migration 8 (label_printed_at) isn't run yet.
 */
export async function getPrintedProductCounts() {
  await requireAdmin();
  const supabase = getServerSupabase();

  // Start of "today" in Bangladesh (UTC+6), expressed as a UTC instant.
  const nowBd = new Date(Date.now() + 6 * 3600 * 1000);
  const cutoff = new Date(
    Date.UTC(nowBd.getUTCFullYear(), nowBd.getUTCMonth(), nowBd.getUTCDate()) - 6 * 3600 * 1000
  ).toISOString();

  const cols = "id, order_items(product_name, quantity, products(images))";
  let res = await supabase
    .from("orders")
    .select(cols)
    .eq("courier", "CarryBee")
    .eq("label_printed", true)
    .gte("label_printed_at", cutoff);

  let scopedToday = true;
  if (res.error) {
    // label_printed_at column missing (migration 8 not run) — count all printed.
    scopedToday = false;
    res = await supabase
      .from("orders")
      .select(cols)
      .eq("courier", "CarryBee")
      .eq("label_printed", true);
  }
  if (res.error) return { ok: false, error: res.error.message, products: [] as any[], totalLabels: 0, scopedToday };

  const map = new Map<string, { name: string; image: string | null; count: number }>();
  let totalLabels = 0;
  for (const o of (res.data ?? []) as any[]) {
    totalLabels++;
    for (const it of o.order_items ?? []) {
      const name = (it.product_name || "পণ্য").trim();
      const qty = Number(it.quantity || 0) || 0;
      const image = it.products?.images?.[0] ?? null;
      const cur = map.get(name) || { name, image, count: 0 };
      cur.count += qty;
      if (!cur.image && image) cur.image = image;
      map.set(name, cur);
    }
  }
  const products = Array.from(map.values()).sort((a, b) => b.count - a.count);
  return { ok: true, products, totalLabels, scopedToday };
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

/** Permanently delete many orders at once (items cascade). Requires the delete code. */
export async function bulkDeleteOrders(orderIds: string[], code: string) {
  await requireAdmin();
  const expected = process.env.ADMIN_DELETE_CODE || "103020";
  if (String(code || "").trim() !== expected) {
    return { ok: false, error: "ভুল কোড। ডিলিট করতে সঠিক কোড দিন।" };
  }
  const ids = (orderIds || []).filter(Boolean);
  if (ids.length === 0) return { ok: false, error: "কোনো অর্ডার নির্বাচন করা হয়নি।" };
  const supabase = getServerSupabase();
  const { error } = await supabase.from("orders").delete().in("id", ids);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/orders");
  return { ok: true, deleted: ids.length };
}

/** Normalize a BD phone to 8801XXXXXXXXX for storage. */
function normalizeBdPhone(raw: string): string {
  let d = (raw || "").replace(/\D/g, "");
  if (d.startsWith("00")) d = d.slice(2);
  if (d.startsWith("0")) d = "88" + d;
  else if (d.startsWith("1")) d = "880" + d;
  else if (!d.startsWith("880")) d = "880" + d;
  return d;
}

export interface ManualOrderInput {
  name: string;
  phone: string;
  address: string;
  area?: string;
  city?: string;
  notes?: string;
  items: { productId: string; qty: number }[];
  customAmount?: number; // overrides computed total when > 0
  shippingFee?: number;
  status?: string; // default "confirmed"
  sendSms?: boolean; // default true
  isBooked?: boolean;
  bookedDate?: string | null; // YYYY-MM-DD
  leadId?: string; // abandoned-cart lead being converted to an order
}

/** Create an order manually from the admin (e.g. a Messenger/WhatsApp order). */
export async function createManualOrder(input: ManualOrderInput) {
  await requireAdmin();
  const name = (input.name || "").trim();
  const address = (input.address || "").trim();
  const phoneDigits = (input.phone || "").replace(/\D/g, "");

  if (!name) return { ok: false, error: "গ্রাহকের নাম দিন।" };
  if (!/^01\d{9}$/.test(phoneDigits.startsWith("880") ? "0" + phoneDigits.slice(3) : phoneDigits)) {
    return { ok: false, error: "সঠিক মোবাইল নম্বর দিন (০১XXXXXXXXX)।" };
  }
  if (!address || address.length < 4) return { ok: false, error: "সম্পূর্ণ ঠিকানা দিন।" };
  const items = (input.items || []).filter((i) => i.productId && Number(i.qty) > 0);
  if (items.length === 0) return { ok: false, error: "কমপক্ষে একটি পণ্য নির্বাচন করুন।" };

  const supabase = getServerSupabase();
  const ids = items.map((i) => i.productId);
  const { data: products, error: pErr } = await supabase
    .from("products")
    .select("id, name_bn, name_en, price")
    .in("id", ids);
  if (pErr) return { ok: false, error: pErr.message };
  const priceMap = new Map((products ?? []).map((p: any) => [p.id, p]));

  let subtotal = 0;
  const lineItems = items
    .map((i) => {
      const p: any = priceMap.get(i.productId);
      if (!p) return null;
      const qty = Math.max(1, Math.floor(i.qty));
      const unitPrice = Number(p.price);
      const line = unitPrice * qty;
      subtotal += line;
      return { product_id: p.id, product_name: p.name_bn || p.name_en, unit_price: unitPrice, quantity: qty, line_total: line };
    })
    .filter(Boolean) as any[];
  if (lineItems.length === 0) return { ok: false, error: "পণ্য খুঁজে পাওয়া যায়নি।" };

  const shippingFee = Math.max(0, Number(input.shippingFee) || 0);
  const custom = Number(input.customAmount) || 0;
  const total = custom > 0 ? custom : subtotal + shippingFee;
  const phone = normalizeBdPhone(input.phone);
  const status = input.status || "confirmed";

  const { data: order, error: oErr } = await supabase
    .from("orders")
    .insert({
      status,
      customer_name: name,
      customer_phone: phone,
      address_line: address,
      area: input.area?.trim() || null,
      city: input.city?.trim() || null,
      district: input.city?.trim() || null,
      payment_method: "cod",
      subtotal,
      shipping_fee: shippingFee,
      discount: custom > 0 ? Math.max(0, subtotal + shippingFee - custom) : 0,
      total,
      notes: input.notes?.trim() || null,
      is_booked: !!input.isBooked,
      booked_date: input.isBooked && input.bookedDate ? input.bookedDate : null,
    })
    .select("id, order_number, total")
    .single();
  if (oErr || !order) return { ok: false, error: oErr?.message ?? "অর্ডার তৈরি ব্যর্থ।" };

  const { error: iErr } = await supabase
    .from("order_items")
    .insert(lineItems.map((li) => ({ ...li, order_id: order.id })));
  if (iErr) return { ok: false, error: iErr.message };

  // If this order was created from an abandoned-cart lead, mark it converted.
  if (input.leadId) {
    void markLeadConverted(input.leadId, order.id, order.order_number);
  }

  // Customer upsert (best-effort).
  try {
    const { data: existing } = await supabase
      .from("customers")
      .select("id, total_orders, total_spent")
      .eq("phone", phone)
      .maybeSingle();
    if (existing) {
      await supabase.from("customers").update({
        name,
        total_orders: (existing.total_orders ?? 0) + 1,
        total_spent: Number(existing.total_spent ?? 0) + Number(order.total),
      }).eq("id", existing.id);
    } else {
      await supabase.from("customers").insert({ phone, name, total_orders: 1, total_spent: Number(order.total) });
    }
  } catch {
    /* ignore */
  }

  // Send confirmation SMS (default on).
  if (input.sendSms !== false) {
    try {
      const templates = await getSmsTemplates();
      const key = status === "confirmed" ? "confirmed" : "order_placed";
      const tpl = (templates as any)[key] || templates.order_placed;
      const msg = fillTemplate(tpl, { name, order: order.order_number, total: Number(order.total) });
      void sendSmsAsync({ phone, message: msg, orderId: order.id });
    } catch {
      /* never block */
    }
  }

  revalidatePath("/admin/orders");
  return { ok: true, orderNumber: order.order_number, id: order.id };
}

/** Mark/unmark an order as booked (scheduled) and set its delivery date. */
export async function saveBooking(orderId: string, isBooked: boolean, bookedDate: string | null) {
  await requireAdmin();
  const supabase = getServerSupabase();
  const { error } = await supabase
    .from("orders")
    .update({ is_booked: !!isBooked, booked_date: isBooked && bookedDate ? bookedDate : null })
    .eq("id", orderId);
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/admin/orders/${orderId}`);
  revalidatePath("/admin/orders");
  revalidatePath("/admin");
  return { ok: true };
}

/** AI: read a Messenger/WhatsApp order screenshot and extract name/phone/address. */
export async function parseOrderScreenshot(base64: string, mediaType: string) {
  await requireAdmin();
  if (!base64) return { ok: false, error: "ছবি পাওয়া যায়নি।" };
  return extractOrderFromImage(base64, mediaType);
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
