import { redirect, notFound } from "next/navigation";
import { getCustomerSession } from "@/lib/customer-auth";
import { getMyOrderDetail } from "../../actions";
import { DashboardShell } from "@/components/account/DashboardShell";
import { OrderStatusBadge } from "@/components/account/OrderStatusBadge";
import { OrderTimeline } from "@/components/account/OrderTimeline";
import { taka } from "@/lib/format";

export const dynamic = "force-dynamic";
export const metadata = { title: "অর্ডার বিস্তারিত" };

export default async function OrderDetailPage({ params }: { params: { order_number: string } }) {
  const session = await getCustomerSession();
  if (!session) redirect("/account/login");
  const res = await getMyOrderDetail(params.order_number);
  if (!res.ok) notFound();
  const { order, items } = res as any;
  const name = session.profile?.name || "";

  const address = [order.address_line, order.area, order.city || order.district].filter((s: any) => s && String(s).trim()).join(", ");
  const subtotal = Number(order.subtotal ?? Number(order.total) - Number(order.shipping_fee || 0));

  return (
    <DashboardShell active="orders" name={name} email={session.email || ""}>
      <div className="mb-5 flex items-center gap-3">
        <a href="/account/orders" className="h-9 w-9 grid place-items-center rounded-xl bg-white ring-1 ring-black/5 hover:bg-gray-50">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4"><path d="M15 18l-6-6 6-6" /></svg>
        </a>
        <div className="flex-1 min-w-0">
          <h1 className="font-display text-xl font-bold text-gray-900">অর্ডার #{order.order_number}</h1>
          <p className="text-xs text-gray-400 mt-0.5">{new Date(new Date(order.created_at).getTime() + 6 * 3600000).toISOString().slice(0, 16).replace("T", " ")}</p>
        </div>
        <OrderStatusBadge status={order.status} />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
        {/* Left: timeline + items */}
        <div className="space-y-4">
          <div className="rounded-3xl bg-white ring-1 ring-black/5 shadow-sm p-5">
            <h2 className="font-semibold text-gray-900 mb-4">ট্র্যাকিং</h2>
            <OrderTimeline status={order.status} courierStatus={order.courier_status} />
            {order.courier && order.tracking_id && (
              <div className="mt-4 rounded-xl bg-gray-50 ring-1 ring-black/5 px-3 py-2.5 text-sm">
                <span className="text-gray-500">কুরিয়ার:</span> <b className="text-gray-900">{order.courier}</b>
                <span className="text-gray-400"> · </span>
                <span className="text-gray-500">ট্র্যাকিং:</span> <span className="font-mono text-gray-900">{order.tracking_id}</span>
              </div>
            )}
          </div>

          <div className="rounded-3xl bg-white ring-1 ring-black/5 shadow-sm overflow-hidden">
            <h2 className="font-semibold text-gray-900 px-5 pt-5 pb-3">পণ্যসমূহ</h2>
            <ul className="divide-y divide-black/5">
              {items.map((it: any) => (
                <li key={it.id} className="flex items-center gap-3 px-5 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900 line-clamp-2">{it.product_name}</p>
                    <p className="text-xs text-gray-500 mt-0.5">পরিমাণ: {it.quantity}</p>
                  </div>
                  <span className="text-sm font-semibold text-gray-900 whitespace-nowrap">{taka(Number(it.line_total))}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Right: summary + address */}
        <div className="space-y-4">
          <div className="rounded-3xl bg-white ring-1 ring-black/5 shadow-sm p-5 text-sm">
            <h2 className="font-semibold text-gray-900 mb-3">সামারি</h2>
            <div className="flex justify-between text-gray-500 mb-1.5"><span>সাবটোটাল</span><span>{taka(subtotal)}</span></div>
            <div className="flex justify-between text-gray-500 mb-1.5"><span>ডেলিভারি চার্জ</span><span>{Number(order.shipping_fee) === 0 ? "ফ্রি" : taka(Number(order.shipping_fee))}</span></div>
            {Number(order.discount) > 0 && <div className="flex justify-between text-green-600 mb-1.5"><span>ডিসকাউন্ট</span><span>−{taka(Number(order.discount))}</span></div>}
            <div className="flex justify-between font-bold text-base text-gray-900 border-t border-black/5 pt-2 mt-2"><span>সর্বমোট</span><span>{taka(Number(order.total))}</span></div>
            <p className="mt-3 inline-flex items-center gap-1 rounded-md bg-green-50 text-green-700 text-xs font-medium px-2 py-0.5 ring-1 ring-green-200">💵 ক্যাশ অন ডেলিভারি</p>
          </div>

          <div className="rounded-3xl bg-white ring-1 ring-black/5 shadow-sm p-5 text-sm">
            <h2 className="font-semibold text-gray-900 mb-2">ডেলিভারি ঠিকানা</h2>
            <p className="text-gray-900 font-medium">{order.customer_name}</p>
            <p className="text-gray-600">{order.customer_phone}</p>
            <p className="text-gray-600 mt-1 leading-relaxed">{address || order.address_line}</p>
          </div>

          <a href={`/track-order?order=${encodeURIComponent(order.order_number)}`} className="block text-center rounded-xl bg-gray-900 text-white py-3 text-sm font-semibold hover:bg-gray-800">পাবলিক ট্র্যাকিং পেজ</a>
        </div>
      </div>
    </DashboardShell>
  );
}
