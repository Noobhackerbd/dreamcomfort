// lib/chat-orders.ts — turn a confirmed Messenger chat into a real order (Admin → Orders).
//
// When the customer has given name, address and phone, the AI ends its reply with
//   [[CONFIRM {"name":"…","phone":"01…","address":"…","area":"inside|outside","color":"Pink","qty":1}]]
// The order line is the product name + price set in Saved replies → Order confirmed
// (plus the colour the customer chose) — never a price from the AI, and not linked to a
// store product, so the order list shows its placeholder picture.
import "server-only";
import { getServerSupabase } from "@/lib/supabase/server";
import { namedProducts, type ChatbotSettings } from "@/lib/chatbot";
import { sendOrderPush } from "@/lib/push";

export interface ChatOrderDetails {
  name: string;
  phone: string;
  address: string;
  area: "inside" | "outside";
  color: string;
  qty: number;
}

const bnDigits = (v: string) => v.replace(/[০-৯]/g, (ch) => String("০১২৩৪৫৬৭৮৯".indexOf(ch)));

/** 01XXXXXXXXX, or null when it isn't a Bangladeshi mobile number. */
export function bdMobile(raw: string): string | null {
  let d = bnDigits(String(raw || "")).replace(/\D/g, "");
  if (d.startsWith("00")) d = d.slice(2);
  if (d.startsWith("880")) d = d.slice(3);
  if (d.length === 10 && d.startsWith("1")) d = "0" + d;
  return /^01[3-9]\d{8}$/.test(d) ? d : null;
}

/** The JSON inside [[CONFIRM {…}]], cleaned. Null when unusable. */
export function parseConfirmDetails(json: string | undefined | null): ChatOrderDetails | null {
  if (!json) return null;
  let j: any;
  try { j = JSON.parse(json); } catch { return null; }
  const name = String(j?.name || "").trim().slice(0, 120);
  const address = String(j?.address || "").trim().slice(0, 500);
  const phone = bdMobile(String(j?.phone || ""));
  if (!name || !address || !phone) return null;
  const area = String(j?.area || "").toLowerCase().startsWith("in") ? "inside" : "outside";
  const color = String(j?.color || "").trim().slice(0, 60);
  const qty = Math.min(Math.max(Math.floor(Number(j?.qty) || 1), 1), 20);
  return { name, phone, address, area, color, qty };
}

const priceNumber = (v: string) => Number(bnDigits(String(v || "")).replace(/,/g, "").match(/\d+(\.\d+)?/)?.[0] || 0);

interface Line { product_id: string | null; product_name: string; unit_price: number; quantity: number; line_total: number }

/** The order line + totals: product name and price from Saved replies → Order confirmed. */
export async function priceChatOrder(s: ChatbotSettings, d: ChatOrderDetails) {
  const cr = s.confirmReply;
  const base = (cr.productName || namedProducts(s)[0]?.name || "Messenger order").trim();
  const unit = Math.max(0, Number(cr.productPrice) || priceNumber(namedProducts(s)[0]?.price || ""));
  const lines: Line[] = [{
    product_id: null,
    product_name: d.color ? `${base} (${d.color})` : base,
    unit_price: unit,
    quantity: d.qty,
    line_total: unit * d.qty,
  }];
  const subtotal = unit * d.qty;
  const shipping = Math.max(0, Number(d.area === "inside" ? cr.shippingInside : cr.shippingOutside) || 0);
  return { lines, subtotal, shipping, total: subtotal + shipping };
}

/**
 * Create the order. A second confirmation from the same phone within 6 hours (the
 * customer repeating their details) returns the existing order instead of a duplicate.
 */
export async function createChatOrder(s: ChatbotSettings, d: ChatOrderDetails, chatName: string | null) {
  const db = getServerSupabase();
  const phone = "88" + d.phone;
  const since = new Date(Date.now() - 6 * 3600 * 1000).toISOString();
  const { data: recent } = await db
    .from("orders").select("id, order_number, total")
    .eq("customer_phone", phone).gte("created_at", since)
    .order("created_at", { ascending: false }).limit(1);
  if (recent?.[0]) return { ok: true as const, duplicate: true, orderNumber: recent[0].order_number as string, total: Number(recent[0].total) };

  const priced = await priceChatOrder(s, d);
  if (!priced.subtotal) return { ok: false as const, error: "Set the chat order price in Saved replies → Order confirmed." };

  const row: Record<string, unknown> = {
    status: "pending",
    customer_name: d.name,
    customer_phone: phone,
    address_line: d.address,
    area: d.area === "inside" ? "ঢাকার ভিতরে" : "ঢাকার বাইরে",
    payment_method: "cod",
    subtotal: priced.subtotal,
    shipping_fee: priced.shipping,
    discount: 0,
    total: priced.total,
    notes: `Messenger চ্যাট থেকে (AI)${chatName ? ` — ${chatName}` : ""}`,
    source: "messenger",
  };
  let { data: order, error } = await db.from("orders").insert(row).select("id, order_number, total").single();
  if (error && ((error as any).code === "42703" || /source/i.test(error.message || ""))) {
    delete row.source;
    ({ data: order, error } = await db.from("orders").insert(row).select("id, order_number, total").single());
  }
  if (error || !order) return { ok: false as const, error: error?.message || "Order not saved." };

  const { error: iErr } = await db.from("order_items").insert(priced.lines.map((l) => ({ ...l, order_id: order!.id })));
  if (iErr) return { ok: false as const, error: iErr.message };

  await sendOrderPush({ id: order.id, orderNumber: order.order_number, total: Number(order.total), customerName: d.name, area: String(row.area) });
  return { ok: true as const, duplicate: false, orderNumber: order.order_number as string, total: Number(order.total) };
}
