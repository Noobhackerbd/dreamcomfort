// lib/push.ts — server-side Web Push sender (VAPID). Sends new-order pushes to
// every saved admin subscription. Safe no-op if VAPID keys are not configured.
import webpush from "web-push";
import { getServerSupabase } from "@/lib/supabase/server";

const PUB = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const PRIV = process.env.VAPID_PRIVATE_KEY;
const SUBJECT = process.env.VAPID_SUBJECT || "mailto:admin@dreamcomfortbd.com";

let configured = false;
function ensureConfigured(): boolean {
  if (configured) return true;
  if (!PUB || !PRIV) return false;
  webpush.setVapidDetails(SUBJECT, PUB, PRIV);
  configured = true;
  return true;
}

export function pushConfigured(): boolean {
  return !!(PUB && PRIV);
}

export interface OrderPushInput {
  id: string;
  orderNumber: string;
  total: number;
  customerName?: string | null;
  area?: string | null;
}

/** Send a "new order" push to all subscribed admins. Never throws. */
export async function sendOrderPush(o: OrderPushInput): Promise<void> {
  try {
    if (!ensureConfigured()) return;
    const supabase = getServerSupabase();
    const { data: subs } = await supabase
      .from("push_subscriptions")
      .select("endpoint, p256dh, auth");
    if (!subs || subs.length === 0) return;

    const payload = JSON.stringify({
      title: `🛒 নতুন অর্ডার · ${o.orderNumber}`,
      body: `${o.customerName || "গ্রাহক"} · ৳${Math.round(Number(o.total) || 0)}${
        o.area ? " · " + o.area : ""
      }`,
      url: `/admin/orders/${o.id}`,
      tag: `order-${o.id}`,
      icon: "/icon.png",
    });

    await Promise.all(
      subs.map(async (s: any) => {
        try {
          await webpush.sendNotification(
            { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
            payload
          );
        } catch (err: any) {
          const code = err?.statusCode;
          // 404/410 = subscription expired/gone → clean it up.
          if (code === 404 || code === 410) {
            await supabase.from("push_subscriptions").delete().eq("endpoint", s.endpoint);
          }
        }
      })
    );
  } catch {
    // push must never break order creation
  }
}
