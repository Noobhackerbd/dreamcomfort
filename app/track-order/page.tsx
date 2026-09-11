// app/track-order/page.tsx — premium public order tracking (order number + phone).
import type { Metadata } from "next";
import { getServerSupabase } from "@/lib/supabase/server";
import { taka } from "@/lib/format";
import { OrderTimeline } from "@/components/account/OrderTimeline";
import { OrderStatusBadge } from "@/components/account/OrderStatusBadge";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "অর্ডার ট্র্যাক",
  description: "অর্ডার নম্বর ও মোবাইল নম্বর দিয়ে আপনার অর্ডারের অবস্থা দেখুন।",
};

function normalizePhone(raw: string): string {
  let d = (raw || "").replace(/\D/g, "");
  if (d.startsWith("00")) d = d.slice(2);
  if (d.startsWith("0")) d = "88" + d;
  else if (d.startsWith("1")) d = "880" + d;
  else if (!d.startsWith("880")) d = "880" + d;
  return d;
}

async function lookup(orderNumber: string, phone: string) {
  const supabase = getServerSupabase();
  const { data: order } = await supabase
    .from("orders")
    .select("*, order_items(product_name, quantity, line_total)")
    .eq("order_number", orderNumber.trim().toUpperCase())
    .eq("customer_phone", normalizePhone(phone))
    .maybeSingle();
  return order;
}

export default async function TrackOrderPage({ searchParams }: { searchParams: { order?: string; phone?: string } }) {
  const { order: orderNo, phone } = searchParams;
  const order: any = orderNo && phone ? await lookup(orderNo, phone) : null;
  const notFound = orderNo && phone && !order;
  const inputCls = "w-full rounded-xl border border-black/10 bg-white px-4 py-3 text-[15px] outline-none focus:border-brand focus:ring-2 focus:ring-brand/15 transition";
  const address = order ? [order.address_line, order.area, order.city || order.district].filter((s: any) => s && String(s).trim()).join(", ") : "";

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="text-center mb-6">
        <h1 className="font-display text-[26px] font-bold text-gray-900">অর্ডার ট্র্যাক করুন</h1>
        <p className="mt-1.5 text-sm text-gray-500">অর্ডার নম্বর ও মোবাইল নম্বর দিন।</p>
      </div>

      <form method="get" className="rounded-3xl bg-white ring-1 ring-black/5 shadow-sm p-5 grid sm:grid-cols-[1fr_1fr_auto] gap-3 items-end">
        <div>
          <label className="block text-[13px] font-medium text-gray-600 mb-1.5">অর্ডার নম্বর</label>
          <input name="order" defaultValue={orderNo ?? ""} placeholder="DC-10001" className={inputCls} />
        </div>
        <div>
          <label className="block text-[13px] font-medium text-gray-600 mb-1.5">মোবাইল নম্বর</label>
          <input name="phone" defaultValue={phone ?? ""} inputMode="numeric" placeholder="01XXXXXXXXX" className={inputCls} />
        </div>
        <button className="rounded-xl bg-brand text-white px-6 py-3 font-semibold shadow-sm hover:bg-brand-dark transition whitespace-nowrap">খুঁজুন</button>
      </form>

      {notFound && (
        <p className="mt-5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-700 px-4 py-3 text-sm">
          এই তথ্য দিয়ে কোনো অর্ডার পাওয়া যায়নি। অর্ডার নম্বর ও মোবাইল নম্বর যাচাই করুন।
        </p>
      )}

      {order && (
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
      )}
    </div>
  );
}
