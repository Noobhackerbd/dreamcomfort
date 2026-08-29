import Link from "next/link";
import { getServerSupabase } from "@/lib/supabase/server";
import { carrybeeConfigured } from "@/lib/carrybee";
import { aiConfigured } from "@/lib/ai";
import { getManualSettings } from "@/lib/settings";
import { OrdersList, type OrderRow } from "./OrdersList";
import { ManualOrderModal, type PickProduct } from "./ManualOrderModal";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 20;

const STATUS_FILTERS = [
  { value: "", label: "সব" },
  { value: "booked", label: "📅 বুকড" },
  { value: "pending", label: "পেন্ডিং" },
  { value: "call_attempt", label: "📞 কল অ্যাটেম্পট" },
  { value: "confirmed", label: "কনফার্মড" },
  { value: "processing", label: "প্রসেসিং" },
  { value: "shipped", label: "শিপড" },
  { value: "delivered", label: "ডেলিভার্ড" },
  { value: "cancelled", label: "বাতিল" },
  { value: "returned", label: "রিটার্ন" },
  { value: "trash", label: "🗑️ ট্রাশ" },
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

  const statusFilter = searchParams.status;
  const isTrash = statusFilter === "trash";
  const isCallAttempt = statusFilter === "call_attempt";

  // Does the orders table have the call-attempts column yet? (Resilient — the pending
  // split + "call attempt" filter only apply when the migration has been run.)
  const caProbe = await supabase.from("orders").select("call_attempts").limit(1);
  const hasCallAttempts = !(caProbe.error && ((caProbe.error as any).code === "42703" || /call_attempts/i.test(caProbe.error.message || "")));

  const SELECT_COLS =
    "id, order_number, customer_name, customer_phone, address_line, area, city, district, courier, tracking_id, total, status, notes, created_at, is_booked, booked_date" +
    (hasCallAttempts ? ", call_attempts" : "") +
    ", order_items(product_name, quantity, products(images))";

  const CALL_LIMIT = 3;

  function build(withDeleted: boolean) {
    let q = supabase.from("orders").select(SELECT_COLS, { count: "exact" }).order("created_at", { ascending: false }).range(from, to);
    if (isTrash) {
      if (withDeleted) q = q.not("deleted_at", "is", null);
    } else {
      // Exclude trashed orders from every normal view.
      if (withDeleted) q = q.is("deleted_at", null);
      if (statusFilter === "booked") q = q.eq("is_booked", true).eq("status", "pending");
      else if (isCallAttempt) {
        // Orders that hit the attempt limit — pending, still unreached.
        q = q.eq("status", "pending").eq("is_booked", false);
        q = hasCallAttempts ? q.gte("call_attempts", CALL_LIMIT) : q.eq("id", "00000000-0000-0000-0000-000000000000");
      } else if (statusFilter === "pending") {
        // Pending list hides orders that already reached the attempt limit.
        q = q.eq("status", "pending").eq("is_booked", false);
        if (hasCallAttempts) q = q.lt("call_attempts", CALL_LIMIT);
      } else if (statusFilter) q = q.eq("status", statusFilter);
    }
    if (searchParams.q) {
      const s = searchParams.q.trim();
      q = q.or(`order_number.ilike.%${s}%,customer_phone.ilike.%${s}%,customer_name.ilike.%${s}%`);
    }
    return q;
  }

  let { data: orders, count, error } = await build(true);
  let trashUnavailable = false;
  if (error && ((error as any).code === "42703" || /deleted_at/i.test(error.message || ""))) {
    // The `deleted_at` column hasn't been added yet — run the migration.
    if (isTrash) { orders = []; count = 0; trashUnavailable = true; }
    else { ({ data: orders, count } = await build(false)); }
  }
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
  const [cbReady, aiReady, productsRes, manualCfg] = await Promise.all([
    carrybeeConfigured(),
    aiConfigured(),
    supabase
      .from("products")
      .select("id, name_bn, name_en, price, images")
      .eq("is_active", true)
      .order("created_at", { ascending: false }),
    getManualSettings(),
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
    notes: o.notes ?? "",
    call_attempts: Number(o.call_attempts ?? 0),
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
        {manualCfg.enabled && <ManualOrderModal products={pickProducts} aiReady={aiReady} />}
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
        {isTrash ? "ট্রাশে" : "মোট"} {total}টি অর্ডার · পৃষ্ঠা {page}/{totalPages}
      </p>

      {trashUnavailable && (
        <p className="mb-3 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          ট্রাশ ফিচার চালু করতে <code className="bg-white/60 px-1 rounded">deleted_at</code> কলাম যোগ করার migration চালান (নিচে SQL দেওয়া আছে)।
        </p>
      )}

      {!hasCallAttempts && (isCallAttempt || active === "pending") && (
        <p className="mb-3 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          কল-অ্যাটেম্পট ফিচার চালু করতে <code className="bg-white/60 px-1 rounded">call_attempts</code> কলাম যোগ করুন — Supabase SQL:
          <code className="block mt-1 bg-white/70 px-2 py-1 rounded text-xs">ALTER TABLE orders ADD COLUMN IF NOT EXISTS call_attempts int NOT NULL DEFAULT 0;</code>
        </p>
      )}

      <OrdersList orders={rows} cbReady={cbReady} isTrash={isTrash} />

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
