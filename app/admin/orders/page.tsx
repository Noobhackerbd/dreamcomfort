import { getServerSupabase } from "@/lib/supabase/server";
import { taka } from "@/lib/format";
import { StatusSelect } from "./StatusSelect";

export const dynamic = "force-dynamic";

const STATUS_FILTERS = [
  { value: "", label: "সব" },
  { value: "pending", label: "পেন্ডিং" },
  { value: "confirmed", label: "কনফার্মড" },
  { value: "processing", label: "প্রসেসিং" },
  { value: "shipped", label: "শিপড" },
  { value: "delivered", label: "ডেলিভার্ড" },
  { value: "cancelled", label: "বাতিল" },
  { value: "returned", label: "রিটার্ন" },
];

export default async function AdminOrders({
  searchParams,
}: {
  searchParams: { status?: string; q?: string };
}) {
  const supabase = getServerSupabase();
  let query = supabase
    .from("orders")
    .select(
      "id, order_number, customer_name, customer_phone, address_line, total, status, created_at, order_items(product_name, quantity)"
    )
    .order("created_at", { ascending: false })
    .limit(200);

  if (searchParams.status) query = query.eq("status", searchParams.status);
  if (searchParams.q) {
    const q = searchParams.q.trim();
    query = query.or(`order_number.ilike.%${q}%,customer_phone.ilike.%${q}%,customer_name.ilike.%${q}%`);
  }

  const { data: orders } = await query;
  const active = searchParams.status ?? "";

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">অর্ডার</h1>

      <form method="get" className="flex gap-2 mb-4">
        <input
          name="q"
          defaultValue={searchParams.q ?? ""}
          placeholder="অর্ডার নম্বর / নাম / ফোন"
          className="flex-1 rounded-lg border px-4 py-2.5 text-sm outline-none focus:border-brand"
        />
        <button className="rounded-lg bg-brand text-white px-5 py-2.5 text-sm">খুঁজুন</button>
      </form>

      <div className="flex flex-wrap gap-2 mb-6">
        {STATUS_FILTERS.map((f) => (
          <a
            key={f.value}
            href={`/admin/orders${f.value ? `?status=${f.value}` : ""}`}
            className={
              "rounded-full border px-4 py-1.5 text-sm " +
              (active === f.value ? "border-brand text-brand bg-brand/5" : "")
            }
          >
            {f.label}
          </a>
        ))}
      </div>

      <div className="space-y-3">
        {(orders ?? []).map((o: any) => (
          <div key={o.id} className="rounded-xl border bg-white p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <a href={`/admin/orders/${o.id}`} className="font-bold text-brand hover:underline">
                  {o.order_number}
                </a>
                <p className="text-sm mt-1">
                  {o.customer_name} · {o.customer_phone}
                </p>
                <p className="text-sm text-gray-500">{o.address_line}</p>
                <p className="text-xs text-gray-400 mt-1">
                  {(o.order_items ?? [])
                    .map((it: any) => `${it.product_name} ×${it.quantity}`)
                    .join("، ")}
                </p>
              </div>
              <div className="text-right">
                <p className="font-bold text-lg">{taka(Number(o.total))}</p>
                <div className="mt-2">
                  <StatusSelect id={o.id} value={o.status} />
                </div>
                <a href={`/admin/orders/${o.id}`} className="text-xs text-brand hover:underline">
                  বিস্তারিত →
                </a>
              </div>
            </div>
          </div>
        ))}
        {(!orders || orders.length === 0) && (
          <p className="text-center text-gray-400 py-10">কোনো অর্ডার নেই।</p>
        )}
      </div>
    </div>
  );
}
