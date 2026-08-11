import Link from "next/link";
import { getServerSupabase } from "@/lib/supabase/server";
import { carrybeeConfigured } from "@/lib/carrybee";
import { aiConfigured } from "@/lib/ai";
import { OrdersList, type OrderRow } from "./OrdersList";
import { ManualOrderModal, type PickProduct } from "./ManualOrderModal";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 20;

const STATUS_FILTERS = [
  { value: "", label: "সব" },
  { value: "booked", label: "📅 বুকড" },
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
  searchParams: { status?: string; q?: string; page?: string };
}) {
  const supabase = getServerSupabase();
  const page = Math.max(1, Number(searchParams.page) || 1);
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  let query = supabase
    .from("orders")
    .select(
      "id, order_number, customer_name, customer_phone, address_line, area, city, district, courier, tracking_id, total, status, created_at, is_booked, booked_date, order_items(product_name, quantity, products(images))",
      { count: "exact" }
    )
    .order("created_at", { ascending: false })
    .range(from, to);

  // "booked" = scheduled orders still pending; once confirmed they move to the
  // Confirmed tab automatically. Pending tab excludes booked so they only show under বুকড.
  const statusFilter = searchParams.status;
  if (statusFilter === "booked") {
    query = query.eq("is_booked", true).eq("status", "pending");
  } else if (statusFilter === "pending") {
    query = query.eq("status", "pending").eq("is_booked", false);
  } else if (statusFilter) {
    query = query.eq("status", statusFilter);
  }
  if (searchParams.q) {
    const q = searchParams.q.trim();
    query = query.or(`order_number.ilike.%${q}%,customer_phone.ilike.%${q}%,customer_name.ilike.%${q}%`);
  }

  const { data: orders, count } = await query;
  const total = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const active = searchParams.status ?? "";

  const pageHref = (p: number) => {
    const sp = new URLSearchParams();
    if (searchParams.status) sp.set("status", searchParams.status);
    if (searchParams.q) sp.set("q", searchParams.q);
    if (p > 1) sp.set("page", String(p));
    const qs = sp.toString();
    return `/admin/orders${qs ? `?${qs}` : ""}`;
  };
  const [cbReady, aiReady, productsRes] = await Promise.all([
    carrybeeConfigured(),
    aiConfigured(),
    supabase
      .from("products")
      .select("id, name_bn, name_en, price, images")
      .eq("is_active", true)
      .order("created_at", { ascending: false }),
  ]);

  const pickProducts: PickProduct[] = (productsRes.data ?? []).map((p: any) => ({
    id: p.id,
    name: p.name_bn || p.name_en,
    price: Number(p.price),
    image: p.images?.[0] ?? null,
  }));

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
    is_booked: !!o.is_booked,
    booked_date: o.booked_date ?? null,
    items: (o.order_items ?? []).map((it: any) => ({
      product_name: it.product_name,
      quantity: Number(it.quantity || 0),
      image: it.products?.images?.[0] ?? null,
    })),
  }));

  return (
    <div>
      <div className="flex items-center justify-between gap-3 mb-6">
        <h1 className="text-2xl font-bold">অর্ডার</h1>
        <ManualOrderModal products={pickProducts} aiReady={aiReady} />
      </div>

      <form method="get" className="flex gap-2 mb-4">
        <input
          name="q"
          defaultValue={searchParams.q ?? ""}
          placeholder="অর্ডার নম্বর / নাম / ফোন"
          className="flex-1 rounded-lg border px-4 py-2.5 text-sm outline-none focus:border-brand"
        />
        <button className="rounded-lg bg-brand text-white px-5 py-2.5 text-sm">খুঁজুন</button>
      </form>

      <div className="flex flex-wrap gap-2 mb-4">
        {STATUS_FILTERS.map((f) => (
          <Link
            key={f.value}
            href={`/admin/orders${f.value ? `?status=${f.value}` : ""}`}
            className={
              "rounded-full border px-4 py-1.5 text-sm " +
              (active === f.value ? "border-brand text-brand bg-brand/5" : "")
            }
          >
            {f.label}
          </Link>
        ))}
      </div>

      <p className="text-xs text-gray-400 mb-3">
        মোট {total}টি অর্ডার · পৃষ্ঠা {page}/{totalPages}
      </p>

      <OrdersList orders={rows} cbReady={cbReady} />

      {totalPages > 1 && (
        <div className="mt-6 flex items-center justify-center gap-1.5 flex-wrap">
          <PageLink href={pageHref(page - 1)} disabled={page <= 1} label="‹ আগের" />
          {pageNumbers(page, totalPages).map((p, i) =>
            p === "…" ? (
              <span key={`e${i}`} className="px-2 text-gray-400">…</span>
            ) : (
              <Link
                key={p}
                href={pageHref(p as number)}
                className={
                  "min-w-[38px] text-center rounded-lg border px-3 py-1.5 text-sm " +
                  (p === page ? "border-brand bg-brand text-white" : "hover:border-brand")
                }
              >
                {p}
              </Link>
            )
          )}
          <PageLink href={pageHref(page + 1)} disabled={page >= totalPages} label="পরের ›" />
        </div>
      )}
    </div>
  );
}

function PageLink({ href, disabled, label }: { href: string; disabled: boolean; label: string }) {
  if (disabled) {
    return <span className="rounded-lg border px-3 py-1.5 text-sm text-gray-300">{label}</span>;
  }
  return <Link href={href} className="rounded-lg border px-3 py-1.5 text-sm hover:border-brand">{label}</Link>;
}

/** Compact page list with ellipses: 1 … 4 5 [6] 7 8 … 20 */
function pageNumbers(current: number, total: number): (number | "…")[] {
  const out: (number | "…")[] = [];
  const push = (n: number) => out.push(n);
  const range = (a: number, b: number) => { for (let i = a; i <= b; i++) push(i); };
  if (total <= 7) { range(1, total); return out; }
  push(1);
  if (current > 4) out.push("…");
  range(Math.max(2, current - 1), Math.min(total - 1, current + 1));
  if (current < total - 3) out.push("…");
  push(total);
  return out;
}
