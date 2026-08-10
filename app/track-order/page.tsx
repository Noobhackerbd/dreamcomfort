// app/track-order/page.tsx — look up an order by order number + phone (server component).
import type { Metadata } from "next";
import { getServerSupabase } from "@/lib/supabase/server";
import { taka } from "@/lib/format";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "অর্ডার ট্র্যাক",
  description: "অর্ডার নম্বর ও মোবাইল নম্বর দিয়ে আপনার অর্ডারের অবস্থা দেখুন।",
};

const STATUS_STEPS = [
  { key: "pending", label: "পেন্ডিং" },
  { key: "confirmed", label: "কনফার্মড" },
  { key: "processing", label: "প্রসেসিং" },
  { key: "shipped", label: "শিপড" },
  { key: "delivered", label: "ডেলিভার্ড" },
];

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

export default async function TrackOrderPage({
  searchParams,
}: {
  searchParams: { order?: string; phone?: string };
}) {
  const { order: orderNo, phone } = searchParams;
  const order = orderNo && phone ? await lookup(orderNo, phone) : null;
  const notFound = orderNo && phone && !order;
  const inputCls = "w-full rounded-lg border px-4 py-3 outline-none focus:border-brand";

  return (
    <div className="max-w-xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">অর্ডার ট্র্যাক করুন</h1>

      <form method="get" className="space-y-4">
        <div>
          <label className="block text-sm mb-1">অর্ডার নম্বর</label>
          <input name="order" defaultValue={orderNo ?? ""} placeholder="যেমন: DC-10001" className={inputCls} />
        </div>
        <div>
          <label className="block text-sm mb-1">মোবাইল নম্বর</label>
          <input name="phone" defaultValue={phone ?? ""} inputMode="numeric" placeholder="০১XXXXXXXXX" className={inputCls} />
        </div>
        <button className="w-full rounded-lg bg-brand text-white px-6 py-3 font-medium hover:bg-brand-dark">
          খুঁজুন
        </button>
      </form>

      {notFound && (
        <p className="mt-6 rounded-lg bg-amber-50 border border-amber-200 text-amber-700 px-4 py-3 text-sm">
          এই তথ্য দিয়ে কোনো অর্ডার পাওয়া যায়নি। অর্ডার নম্বর ও মোবাইল নম্বর যাচাই করুন।
        </p>
      )}

      {order && (
        <div className="mt-8 rounded-xl border bg-white p-5">
          <div className="flex justify-between border-b pb-3 mb-4">
            <span className="text-gray-500">অর্ডার নম্বর</span>
            <span className="font-bold text-brand">{order.order_number}</span>
          </div>

          {order.status === "cancelled" || order.status === "returned" ? (
            <p className="text-red-600 font-medium">
              অবস্থা: {order.status === "cancelled" ? "বাতিল" : "রিটার্ন"}
            </p>
          ) : (
            <div className="flex justify-between mb-4">
              {STATUS_STEPS.map((s, idx) => {
                const currentIdx = STATUS_STEPS.findIndex((x) => x.key === order.status);
                const done = idx <= currentIdx;
                return (
                  <div key={s.key} className="flex-1 text-center">
                    <div
                      className={
                        "mx-auto h-6 w-6 rounded-full flex items-center justify-center text-xs " +
                        (done ? "bg-brand text-white" : "bg-gray-200 text-gray-400")
                      }
                    >
                      {done ? "✓" : idx + 1}
                    </div>
                    <div className={"mt-1 text-[10px] " + (done ? "text-brand" : "text-gray-400")}>
                      {s.label}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="mt-4 border-t pt-3 space-y-1 text-sm">
            {(order.order_items ?? []).map((it: any, i: number) => (
              <div key={i} className="flex justify-between">
                <span className="truncate pr-2">
                  {it.product_name} × {it.quantity}
                </span>
                <span>{taka(Number(it.line_total))}</span>
              </div>
            ))}
            <div className="flex justify-between font-bold border-t pt-2">
              <span>সর্বমোট</span>
              <span className="text-brand">{taka(Number(order.total))}</span>
            </div>
            {order.tracking_id && (
              <p className="text-gray-500 pt-2">
                কুরিয়ার ট্র্যাকিং: <b>{order.tracking_id}</b>
                {order.courier ? ` (${order.courier})` : ""}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
