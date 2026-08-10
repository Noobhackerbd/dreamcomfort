"use server";

import { getServerSupabase } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/admin-auth";
import { getSmsTemplates } from "@/lib/settings";
import { sendSmsAsync } from "@/lib/sms";
import { fillTemplate, STATUS_SMS_MAP } from "@/lib/sms/templates";
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
