import { getServerSupabase } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { taka } from "@/lib/format";
import { getStoreSettings } from "@/lib/settings";
import { PrintButton } from "./PrintButton";

export const dynamic = "force-dynamic";

export default async function InvoicePage({ params }: { params: { id: string } }) {
  const supabase = getServerSupabase();
  const { data: order } = await supabase
    .from("orders")
    .select("*, order_items(*)")
    .eq("id", params.id)
    .single();
  if (!order) notFound();
  const store = await getStoreSettings();
  const items = order.order_items ?? [];
  const date = new Date(order.created_at).toLocaleDateString("en-GB");

  return (
    <div className="max-w-2xl mx-auto bg-white p-8 rounded-xl border">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-2xl font-bold text-brand">{store.name}</h1>
          <p className="text-sm text-gray-500">{store.address}</p>
          <p className="text-sm text-gray-500">{store.phone} · {store.email}</p>
        </div>
        <div className="text-right">
          <p className="text-lg font-bold">ইনভয়েস</p>
          <p className="text-sm">{order.order_number}</p>
          <p className="text-sm text-gray-500">{date}</p>
        </div>
      </div>

      <div className="mb-6 text-sm">
        <p className="font-semibold">গ্রাহক:</p>
        <p>{order.customer_name} · {order.customer_phone}</p>
        <p className="text-gray-600">{order.address_line}</p>
        <p className="text-gray-600">
          {[order.area, order.city, order.district].filter(Boolean).join(", ")}
        </p>
      </div>

      <table className="w-full text-sm mb-6">
        <thead className="border-b">
          <tr className="text-left text-gray-500">
            <th className="py-2">পণ্য</th>
            <th className="py-2 text-center">পরিমাণ</th>
            <th className="py-2 text-right">দাম</th>
            <th className="py-2 text-right">মোট</th>
          </tr>
        </thead>
        <tbody>
          {items.map((it: any) => (
            <tr key={it.id} className="border-b">
              <td className="py-2">{it.product_name}</td>
              <td className="py-2 text-center">{it.quantity}</td>
              <td className="py-2 text-right">{taka(Number(it.unit_price))}</td>
              <td className="py-2 text-right">{taka(Number(it.line_total))}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="ml-auto w-56 text-sm space-y-1">
        <div className="flex justify-between">
          <span>সাবটোটাল</span>
          <span>{taka(Number(order.subtotal))}</span>
        </div>
        <div className="flex justify-between">
          <span>ডেলিভারি</span>
          <span>{taka(Number(order.shipping_fee))}</span>
        </div>
        {Number(order.discount) > 0 && (
          <div className="flex justify-between">
            <span>ডিসকাউন্ট</span>
            <span>-{taka(Number(order.discount))}</span>
          </div>
        )}
        <div className="flex justify-between font-bold text-base border-t pt-1">
          <span>সর্বমোট</span>
          <span>{taka(Number(order.total))}</span>
        </div>
      </div>

      <p className="mt-6 text-center text-xs text-gray-400">
        পেমেন্ট: ক্যাশ অন ডেলিভারি · ধন্যবাদ আমাদের সাথে কেনাকাটা করার জন্য!
      </p>

      <div className="mt-6 text-center">
        <PrintButton />
      </div>
    </div>
  );
}
