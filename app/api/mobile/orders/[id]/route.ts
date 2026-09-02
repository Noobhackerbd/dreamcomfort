// GET  /api/mobile/orders/:id        → full order detail
// PATCH /api/mobile/orders/:id        → { action: "status"|"call"|"resetCall", status? }
import { NextRequest } from "next/server";
import { verifyMobileToken, unauthorized } from "@/lib/mobile-auth";
import { getServerSupabase } from "@/lib/supabase/server";
import { getSmsTemplates } from "@/lib/settings";
import { sendSmsAsync } from "@/lib/sms";
import { fillTemplate, STATUS_SMS_MAP } from "@/lib/sms/templates";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const STATUSES = ["pending", "confirmed", "processing", "shipped", "delivered", "cancelled", "returned"];

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  if (!(await verifyMobileToken(req))) return unauthorized();
  const supabase = getServerSupabase();
  const { data: o, error } = await supabase
    .from("orders")
    .select("*, order_items(product_name, quantity, unit_price, line_total, products(images))")
    .eq("id", params.id)
    .single();
  if (error || !o) return Response.json({ ok: false, error: "not found" }, { status: 404 });

  return Response.json({
    ok: true,
    order: {
      id: o.id,
      orderNumber: o.order_number,
      name: o.customer_name ?? "",
      phone: o.customer_phone ?? "",
      email: o.customer_email ?? "",
      address: [o.address_line, o.area, o.city || o.district].filter(Boolean).join(", "),
      total: Number(o.total ?? 0),
      subtotal: Number(o.subtotal ?? 0),
      shippingFee: Number(o.shipping_fee ?? 0),
      status: o.status,
      notes: o.notes ?? "",
      courier: o.courier ?? "",
      trackingId: o.tracking_id ?? "",
      callAttempts: Number(o.call_attempts ?? 0),
      createdAt: o.created_at,
      items: (o.order_items ?? []).map((it: any) => ({
        name: it.product_name,
        qty: Number(it.quantity || 0),
        unitPrice: Number(it.unit_price || 0),
        lineTotal: Number(it.line_total || 0),
        image: it.products?.images?.[0] ?? null,
      })),
    },
  });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  if (!(await verifyMobileToken(req))) return unauthorized();
  const supabase = getServerSupabase();
  const body = await req.json().catch(() => ({}));
  const action = body?.action as string;

  if (action === "status") {
    const status = String(body?.status || "");
    if (!STATUSES.includes(status)) return Response.json({ ok: false, error: "invalid status" }, { status: 400 });
    const { error } = await supabase.from("orders").update({ status }).eq("id", params.id);
    if (error) return Response.json({ ok: false, error: error.message }, { status: 500 });
    // Status SMS (best-effort).
    const key = STATUS_SMS_MAP[status];
    if (key) {
      try {
        const { data: order } = await supabase
          .from("orders")
          .select("customer_name, customer_phone, order_number, tracking_id")
          .eq("id", params.id)
          .single();
        if (order) {
          const templates = await getSmsTemplates();
          const msg = fillTemplate((templates as any)[key], {
            name: order.customer_name,
            order: order.order_number,
            tracking: order.tracking_id ?? "",
          });
          void sendSmsAsync({ phone: order.customer_phone, message: msg, orderId: params.id });
        }
      } catch { /* ignore */ }
    }
    return Response.json({ ok: true, status });
  }

  if (action === "call" || action === "resetCall") {
    const { data, error } = await supabase.from("orders").select("call_attempts").eq("id", params.id).single();
    if (error) {
      if ((error as any).code === "42703") return Response.json({ ok: false, error: "call_attempts column missing", needsMigration: true }, { status: 400 });
      return Response.json({ ok: false, error: error.message }, { status: 500 });
    }
    const next = action === "resetCall" ? 0 : Number((data as any)?.call_attempts ?? 0) + 1;
    const upd = await supabase.from("orders").update({ call_attempts: next }).eq("id", params.id);
    if (upd.error) return Response.json({ ok: false, error: upd.error.message }, { status: 500 });
    return Response.json({ ok: true, callAttempts: next });
  }

  return Response.json({ ok: false, error: "unknown action" }, { status: 400 });
}
