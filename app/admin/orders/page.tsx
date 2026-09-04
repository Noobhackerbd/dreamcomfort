import Link from "next/link";
import { getServerSupabase } from "@/lib/supabase/server";
import { carrybeeConfigured } from "@/lib/carrybee";
import { bdcourierConfigured } from "@/lib/bdcourier";
import { aiConfigured } from "@/lib/ai";
import { OrdersList, type OrderRow } from "./OrdersList";
import { ManualOrderModal, type PickProduct } from "./ManualOrderModal";
import { OrderSearch } from "./OrderSearch";
import { DateFilter } from "./DateFilter";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 20;

const STATUS_FILTERS = [
  { value: "", label: "All" },
  { value: "booked", label: "Booked" },
  { value: "pending", label: "Pending" },
  { value: "call_attempt", label: "Call attempt" },
  { value: "confirmed", label: "Confirmed" },
  { value: "processing", label: "Processing" },
  { value: "shipped", label: "Shipped" },
  { value: "delivered", label: "Delivered" },
  { value: "cancelled", label: "Cancelled" },
  { value: "returned", label: "Returned" },
  { value: "trash", label: "Trash" },
];

/** Convert BD-local date strings (YYYY-MM-DD) to the UTC instants bounding that day range. */
function dateRangeUtc(from?: string, to?: string): { fromUtc?: string; toUtc?: string } {
  const out: { fromUtc?: string; toUtc?: string } = {};
  if (from && /^\d{4}-\d{2}-\d{2}$/.test(from)) {
    const d = new Date(`${from}T00:00:00.000+06:00`);
    if (!isNaN(d.getTime())) out.fromUtc = d.toISOString();
  }
  if (to && /^\d{4}-\d{2}-\d{2}$/.test(to)) {
    const d = new Date(`${to}T23:59:59.999+06:00`);
    if (!isNaN(d.getTime())) out.toUtc = d.toISOString();
  }
  return out;
}

export default async function AdminOrders({
  searchParams,
}: {
  searchParams: { status?: string; q?: string; page?: string; from?: string; to?: string };
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
    // Date range filter (Bangladesh day boundaries).
    const { fromUtc, toUtc } = dateRangeUtc(searchParams.from, searchParams.to);
    if (fromUtc) q = q.gte("created_at", fromUtc);
    if (toUtc) q = q.lte("created_at", toUtc);
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
    if (searchParams.from) sp.set("from", searchParams.from);
    if (searchParams.to) sp.set("to", searchParams.to);
    if (p > 1) sp.set("page", String(p));
    const qs = sp.toString();
    return `/admin/orders${qs ? `?${qs}` : ""}`;
  };
  const filterHref = (value: string) => {
    const sp = new URLSearchParams();
    if (value) sp.set("status", value);
    if (searchParams.from) sp.set("from", searchParams.from);
    if (searchParams.to) sp.set("to", searchParams.to);
    const qs = sp.toString();
    return `/admin/orders${qs ? `?${qs}` : ""}`;
  };
  const [cbReady, bdcReady, aiReady, productsRes] = await Promise.all([
    carrybeeConfigured(),
    bdcourierConfigured(),
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
      <div className="flex items-center justify-between gap-3 mb-5">
        <h1 className="text-2xl font-bold">Orders</h1>
        <ManualOrderModal products={pickProducts} aiReady={aiReady} />
      </div>

      <OrderSearch initialQuery={searchParams.q ?? ""} status={searchParams.status} from={searchParams.from} to={searchParams.to} />

      {/* Filters: date (fixed) + status (single scrollable row, mobile friendly) */}
      <div className="flex items-center gap-2 mb-4">
        <DateFilter from={searchParams.from} to={searchParams.to} status={searchParams.status} q={searchParams.q} />
        <span className="h-5 w-px shrink-0" style={{ background: "var(--a-border)" }} />
        <div className="dc-scroll-x flex items-center gap-1.5 overflow-x-auto pb-1 flex-1 min-w-0">
          {STATUS_FILTERS.map((f) => (
            <Link
              key={f.value}
              href={filterHref(f.value)}
              className={
                "shrink-0 whitespace-nowrap rounded-full border px-3.5 py-1.5 text-[13px] font-medium transition " +
                (active === f.value ? "dc-pill-active" : "dc-pill")
              }
            >
              {f.label}
            </Link>
          ))}
        </div>
      </div>

      <p className="text-xs dc-muted mb-3">
        {isTrash ? "In trash" : "Total"} {total} orders · Page {page}/{totalPages}
      </p>

      {trashUnavailable && (
        <p className="mb-3 rounded-xl border px-4 py-3 text-sm" style={{ borderColor: "var(--a-warn-soft)", background: "var(--a-warn-soft)", color: "var(--a-warn)" }}>
          To enable Trash, run the migration adding the <code className="px-1 rounded bg-white/60">deleted_at</code> column.
        </p>
      )}

      {!hasCallAttempts && (isCallAttempt || active === "pending") && (
        <p className="mb-3 rounded-xl border px-4 py-3 text-sm" style={{ borderColor: "var(--a-warn-soft)", background: "var(--a-warn-soft)", color: "var(--a-warn)" }}>
          To enable call attempts, add the <code className="px-1 rounded bg-white/60">call_attempts</code> column — Supabase SQL:
          <code className="block mt-1 bg-white/70 px-2 py-1 rounded text-xs">ALTER TABLE orders ADD COLUMN IF NOT EXISTS call_attempts int NOT NULL DEFAULT 0;</code>
        </p>
      )}

      <OrdersList orders={rows} cbReady={cbReady} bdcReady={bdcReady} isTrash={isTrash} />

      {totalPages > 1 && (
        <div className="mt-6 flex items-center justify-center gap-1.5 flex-wrap">
          <PageLink href={pageHref(page - 1)} disabled={page <= 1} label="‹ Prev" />
          {pageNumbers(page, totalPages).map((p, i) =>
            p === "…" ? (
              <span key={`e${i}`} className="px-2 dc-muted">…</span>
            ) : (
              <Link
                key={p}
                href={pageHref(p as number)}
                className={
                  "min-w-[38px] text-center rounded-lg border px-3 py-1.5 text-sm " +
                  (p === page ? "dc-pill-active" : "dc-pill")
                }
              >
                {p}
              </Link>
            )
          )}
          <PageLink href={pageHref(page + 1)} disabled={page >= totalPages} label="Next ›" />
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
