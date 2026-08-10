import { getServerSupabase } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { carrybeeConfigured } from "@/lib/carrybee";
import { OrderPanel, type PanelItem } from "./OrderPanel";

export const dynamic = "force-dynamic";

export default async function OrderDetail({ params }: { params: { id: string } }) {
  const supabase = getServerSupabase();
  const { data: order } = await supabase
    .from("orders")
    .select("*, order_items(*)")
    .eq("id", params.id)
    .single();
  if (!order) notFound();

  const cbReady = await carrybeeConfigured();

  const items: PanelItem[] = (order.order_items ?? [])
    .slice()
    .sort((a: any, b: any) => String(a.created_at).localeCompare(String(b.created_at)))
    .map((it: any) => ({
      id: it.id,
      product_id: it.product_id ?? null,
      product_name: it.product_name,
      unit_price: Number(it.unit_price),
      quantity: Number(it.quantity),
    }));

  return (
    <OrderPanel
      cbConfigured={cbReady}
      order={{
        id: order.id,
        order_number: order.order_number,
        status: order.status,
        created_at: order.created_at,
        customer_name: order.customer_name ?? "",
        customer_phone: order.customer_phone ?? "",
        customer_email: order.customer_email ?? "",
        address_line: order.address_line ?? "",
        area: order.area ?? "",
        city: order.city ?? "",
        district: order.district ?? "",
        postcode: order.postcode ?? "",
        notes: order.notes ?? "",
        courier: order.courier ?? "",
        tracking_id: order.tracking_id ?? "",
        payment_method: order.payment_method ?? "cod",
        shipping_fee: Number(order.shipping_fee ?? 0),
        discount: Number(order.discount ?? 0),
        items,
      }}
    />
  );
}
