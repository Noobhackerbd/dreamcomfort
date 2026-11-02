// lib/chat-orders.ts — turn a confirmed Messenger chat into a real order (Admin → Orders).
//
// When the customer has given name, address and phone, the AI ends its reply with
//   [[CONFIRM {"name":"…","phone":"01…","address":"…","area":"inside|outside","items":[{"n":1,"qty":1}]}]]
// "n" is the product's # in the bot's PRODUCTS list. Prices come from the store's product
// (matched by its page link or name), never from the AI. Delivery charge comes from
// Saved replies → Order confirmed.
import "server-only";
import { getServerSupabase } from "@/lib/supabase/server";
import { namedProducts, type ChatbotSettings } from "@/lib/chatbot";
import { sendOrderPush } from "@/lib/push";

export interface ChatOrderDetails {
  name: string;
  phone: string;
  address: string;
  area: "inside" | "outside";
  items: { n: number; qty: number }[];
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
  const items = (Array.isArray(j?.items) ? j.items : [])
    .map((i: any) => ({ n: Math.floor(Number(i?.n)), qty: Math.min(Math.max(Math.floor(Number(i?.qty) || 1), 1), 20) }))
    .filter((i: any) => i.n >= 1)
    .slice(0, 10);
  return { name, phone, address, area, items };
}

const priceNumber = (v: string) => Number(bnDigits(String(v || "")).replace(/,/g, "").match(/\d+(\.\d+)?/)?.[0] || 0);

interface Line { product_id: string | null; product_name: string; unit_price: number; quantity: number; line_total: number }

/** Lines + totals for the order, priced from the store. */
export async function priceChatOrder(s: ChatbotSettings, d: ChatOrderDetails) {
  const list = namedProducts(s);
  const db = getServerSupabase();
  const wanted = d.items.length ? d.items : list.length === 1 ? [{ n: 1, qty: 1 }] : [];
  const lines: Line[] = [];
  for (const it of wanted) {
    const p = list[it.n - 1];
    if (!p) continue;
    let store: any = null;
    const slug = (p.url || "").match(/\/product\/([^/?#]+)/)?.[1];
    if (slug) {
      ({ data: store } = await db.from("products").select("id, name_bn, name_en, price").eq("slug", decodeURIComponent(slug)).maybeSingle());
    }
    if (!store) {
      ({ data: store } = await db.from("products").select("id, name_bn, name_en, price").eq("name_bn", p.name.trim()).limit(1).maybeSingle());
    }
    const unit = store ? Number(store.price) : priceNumber(p.price);
    lines.push({
      product_id: store?.id ?? null,
      product_name: (store?.name_bn || store?.name_en || p.name).trim(),
      unit_price: unit,
      quantity: it.qty,
      line_total: unit * it.qty,
    });
  }
  const subtotal = lines.reduce((a, l) => a + l.line_total, 0);
  const cr = s.confirmReply;
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
  if (!priced.lines.length) return { ok: false as const, error: "Couldn't tell which product was ordered." };

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
