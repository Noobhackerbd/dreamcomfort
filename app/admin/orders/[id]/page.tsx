import { getServerSupabase } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { taka } from "@/lib/format";
import { StatusSelect } from "../StatusSelect";
import { CourierForm } from "./CourierForm";

export const dynamic = "force-dynamic";

const STATUS_LABELS: Record<string, string> = {
  pending: "পেন্ডিং",
  confirmed: "কনফার্মড",
  processing: "প্রসেসিং",
  shipped: "শিপড",
  delivered: "ডেলিভার্ড",
  cancelled: "বাতিল",
  returned: "রিটার্ন",
};

export default async function OrderDetail({ params }: { params: { id: string } }) {
  const supabase = getServerSupabase();
  const { data: order } = await supabase
    .from("orders")
    .select("*, order_items(*)")
    .eq("id", params.id)
    .single();
  if (!order) notFound();

  const items = order.order_items ?? [];

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <a href="/admin/orders" className="text-sm text-gray-400 hover:underline">← অর্ডার তালিকা</a>
          <h1 className="text-2xl font-bold">{order.order_number}</h1>
        </div>
        <a
          href={`/admin/orders/${order.id}/invoice`}
          target="_blank"
          className="rounded-lg border px-4 py-2 text-sm hover:border-brand"
        >
          🧾 ইনভয়েস
        </a>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="rounded-xl border bg-white p-4">
          <h2 className="font-semibold mb-2">গ্রাহক</h2>
          <p className="text-sm"><b>{order.customer_name}</b></p>
          <p className="text-sm text-gray-600">{order.customer_phone}</p>
          {order.customer_email && <p className="text-sm text-gray-600">{order.customer_email}</p>}
          <p className="text-sm text-gray-600 mt-2">{order.address_line}</p>
          <p className="text-sm text-gray-500">
            {[order.area, order.city, order.district, order.postcode].filter(Boolean).join(", ")}
          </p>
          {order.notes && <p className="text-sm text-amber-700 mt-2">নোট: {order.notes}</p>}
        </div>

        <div className="rounded-xl border bg-white p-4">
          <h2 className="font-semibold mb-2">অবস্থা</h2>
          <p className="text-sm mb-2">
            বর্তমান: <b>{STATUS_LABELS[order.status] ?? order.status}</b>
          </p>
          <StatusSelect id={order.id} value={order.status} />
          <p className="text-xs text-gray-400 mt-2">
            স্ট্যাটাস পরিবর্তন করলে গ্রাহককে স্বয়ংক্রিয়ভাবে এসএমএস পাঠানো হবে (কনফার্মড / শিপড / ডেলিভার্ড)।
          </p>
          <div className="mt-4 pt-4 border-t">
            <h3 className="text-sm font-semibold mb-2">কুরিয়ার</h3>
            <CourierForm
              orderId={order.id}
              courier={order.courier ?? ""}
              trackingId={order.tracking_id ?? ""}
            />
          </div>
        </div>
      </div>

      <div className="mt-4 rounded-xl border bg-white p-4">
        <h2 className="font-semibold mb-3">পণ্য</h2>
        <div className="space-y-2 text-sm">
          {items.map((it: any) => (
            <div key={it.id} className="flex justify-between">
              <span>{it.product_name} × {it.quantity}</span>
              <span>{taka(Number(it.line_total))}</span>
            </div>
          ))}
          <div className="flex justify-between border-t pt-2">
            <span>সাবটোটাল</span>
            <span>{taka(Number(order.subtotal))}</span>
          </div>
          <div className="flex justify-between">
            <span>ডেলিভারি চার্জ</span>
            <span>{taka(Number(order.shipping_fee))}</span>
          </div>
          <div className="flex justify-between font-bold text-lg border-t pt-2">
            <span>সর্বমোট</span>
            <span className="text-brand">{taka(Number(order.total))}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
