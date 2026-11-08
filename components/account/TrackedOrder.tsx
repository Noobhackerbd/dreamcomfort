// components/account/TrackedOrder.tsx — the order status card used by /track-order and
// the SMS tracking link /t/[code].
import { taka } from "@/lib/format";
import { OrderTimeline } from "@/components/account/OrderTimeline";
import { OrderStatusBadge } from "@/components/account/OrderStatusBadge";

export function TrackedOrder({ order }: { order: any }) {
  const address = [order.address_line, order.area, order.city || order.district].filter((s: any) => s && String(s).trim()).join(", ");
  return (
        <div className="mt-6 space-y-4">
          <div className="rounded-3xl bg-white ring-1 ring-black/5 shadow-sm p-5">
            <div className="flex items-center justify-between gap-2 pb-4 mb-4 border-b border-black/5">
              <div>
                <p className="text-xs text-gray-400">অর্ডার নম্বর</p>
                <p className="font-bold text-lg text-gray-900">{order.order_number}</p>
              </div>
              <OrderStatusBadge status={order.status} />
            </div>
            <OrderTimeline status={order.status} courierStatus={order.courier_status} />
            {order.courier && order.tracking_id && (
              <div className="mt-4 rounded-xl bg-gray-50 ring-1 ring-black/5 px-3 py-2.5 text-sm">
                <span className="text-gray-500">কুরিয়ার:</span> <b className="text-gray-900">{order.courier}</b>
                <span className="text-gray-400"> · </span>
                <span className="text-gray-500">ট্র্যাকিং:</span> <span className="font-mono text-gray-900">{order.tracking_id}</span>
              </div>
            )}
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="rounded-3xl bg-white ring-1 ring-black/5 shadow-sm p-5 text-sm">
              <h2 className="font-semibold text-gray-900 mb-3">পণ্যসমূহ</h2>
              <div className="space-y-1.5">
                {(order.order_items ?? []).map((it: any, i: number) => (
                  <div key={i} className="flex justify-between text-gray-600"><span className="truncate pr-2">{it.product_name} × {it.quantity}</span><span className="whitespace-nowrap">{taka(Number(it.line_total))}</span></div>
                ))}
                <div className="flex justify-between font-bold text-gray-900 border-t border-black/5 pt-2 mt-1"><span>সর্বমোট</span><span>{taka(Number(order.total))}</span></div>
              </div>
            </div>
            <div className="rounded-3xl bg-white ring-1 ring-black/5 shadow-sm p-5 text-sm">
              <h2 className="font-semibold text-gray-900 mb-2">ডেলিভারি ঠিকানা</h2>
              <p className="text-gray-900 font-medium">{order.customer_name}</p>
              <p className="text-gray-600">{(order.customer_phone || "").replace(/^88/, "")}</p>
              <p className="text-gray-600 mt-1 leading-relaxed">{address || order.address_line}</p>
              <p className="mt-3 inline-flex items-center gap-1 rounded-md bg-green-50 text-green-700 text-xs font-medium px-2 py-0.5 ring-1 ring-green-200">💵 ক্যাশ অন ডেলিভারি</p>
            </div>
          </div>
        </div>
  );
}
