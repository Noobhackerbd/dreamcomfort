import { getServerSupabase } from "@/lib/supabase/server";
import { carrybeeConfigured } from "@/lib/carrybee";
import { OrdersList, type OrderRow } from "./OrdersList";

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
      "id, order_number, customer_name, customer_phone, address_line, area, city, district, courier, tracking_id, total, status, created_at, order_items(product_name, quantity)"
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
  const cbReady = await carrybeeConfigured();

  const rows: OrderRow[] = (orders ?? []).map((o: any) => ({
    id: o.id,
    order_number: o.order_number,
    customer_name: o.customer_name ?? "",
    customer_phone: o.customer_phone ?? "",
    address_line: o.address_line ?? "",
    area: o.area ?? "",
    city: o.city ?? "",
    district: o.district ?? "",
    courier: o.courier ?? "",
    tracking_id: o.tracking_id ?? "",
    total: Number(o.total ?? 0),
    status: o.status,
    created_at: o.created_at,
    items: (o.order_items ?? []).map((it: any) => ({ product_name: it.product_name, quantity: Number(it.quantity || 0) })),
  }));

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

      <OrdersList orders={rows} cbReady={cbReady} />
    </div>
  );
}
