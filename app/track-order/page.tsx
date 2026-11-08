// app/track-order/page.tsx — premium public order tracking (order number + phone).
import type { Metadata } from "next";
import { getServerSupabase } from "@/lib/supabase/server";
import { TrackedOrder } from "@/components/account/TrackedOrder";

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

      {order && <TrackedOrder order={order} />}
    </div>
  );
}
