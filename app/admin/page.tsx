// app/admin/page.tsx — admin dashboard (overview). Server component.
import { getServerSupabase } from "@/lib/supabase/server";
import { taka } from "@/lib/format";

export const dynamic = "force-dynamic";

const DHAKA_OFFSET_MS = 6 * 60 * 60 * 1000; // UTC+6

/** Bucket an ISO timestamp into a Dhaka-local YYYY-MM-DD key. */
function dhakaDayKey(iso: string): string {
  return new Date(new Date(iso).getTime() + DHAKA_OFFSET_MS).toISOString().slice(0, 10);
}

function todayKey(): string {
  return new Date(Date.now() + DHAKA_OFFSET_MS).toISOString().slice(0, 10);
}

async function getStats() {
  const supabase = getServerSupabase();
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const [productsRes, ordersRes, pendingRes, allOrdersRes, recentRes, lowStockRes, itemsRes, abandonedRes, bookedRes, visitsRes] =
    await Promise.all([
      supabase.from("products").select("id", { count: "exact", head: true }),
      supabase.from("orders").select("id", { count: "exact", head: true }),
      supabase.from("orders").select("id", { count: "exact", head: true }).eq("status", "pending"),
      supabase.from("orders").select("total, created_at, status").gte("created_at", since),
      supabase
        .from("orders")
        .select("id, order_number, customer_name, total, status, created_at")
        .order("created_at", { ascending: false })
        .limit(6),
      supabase
        .from("products")
        .select("id, name_bn, name_en, stock")
        .lte("stock", 5)
        .order("stock", { ascending: true })
        .limit(8),
      supabase.from("order_items").select("product_name, quantity"),
      // Guarded: table may not exist until migration 4 is run → count falls back to 0.
      supabase.from("abandoned_carts").select("id", { count: "exact", head: true }).eq("status", "abandoned"),
      // Booked orders (migration 5). Guarded — returns [] if columns don't exist yet.
      supabase
        .from("orders")
        .select("id, order_number, customer_name, customer_phone, booked_date, total, status")
        .eq("is_booked", true)
        .not("booked_date", "is", null)
        .not("status", "in", "(delivered,cancelled,returned)")
        .order("booked_date", { ascending: true })
        .limit(60),
      // Visitors (migration 6). Guarded — returns [] until the table exists.
      supabase.from("page_visits").select("visitor_id, created_at").gte("created_at", since).limit(100000),
    ]);

  const allOrders = allOrdersRes.data ?? [];
  const revenue30 = allOrders.reduce((s: number, o: any) => s + Number(o.total || 0), 0);

  const today = todayKey();
  const todayOrders = allOrders.filter((o: any) => dhakaDayKey(o.created_at) === today);
  const todayRevenue = todayOrders.reduce((s: number, o: any) => s + Number(o.total || 0), 0);

  // Status groups.
  const CONFIRMED_SET = new Set(["confirmed", "processing", "shipped", "delivered"]);
  const isConfirmed = (s: string) => CONFIRMED_SET.has(s);
  const isCancelled = (s: string) => s === "cancelled" || s === "returned";
  const isDelivered = (s: string) => s === "delivered";

  // 30-day daily buckets: revenue + per-status counts.
  type Day = { day: string; total: number; count: number; confirmed: number; cancelled: number; pending: number; delivered: number };
  const buckets = new Map<string, Day>();
  for (let i = 29; i >= 0; i--) {
    const key = new Date(Date.now() + DHAKA_OFFSET_MS - i * 86400000).toISOString().slice(0, 10);
    buckets.set(key, { day: key, total: 0, count: 0, confirmed: 0, cancelled: 0, pending: 0, delivered: 0 });
  }
  for (const o of allOrders as any[]) {
    const key = dhakaDayKey(o.created_at);
    const b = buckets.get(key);
    if (!b) continue;
    b.total += Number(o.total || 0);
    b.count += 1;
    if (isDelivered(o.status)) b.delivered += 1;
    else if (isConfirmed(o.status)) b.confirmed += 1;
    else if (isCancelled(o.status)) b.cancelled += 1;
    else b.pending += 1;
  }
  const chart = Array.from(buckets.values());

  // 30-day KPI totals.
  const total30 = allOrders.length;
  const confirmed30 = allOrders.filter((o: any) => isConfirmed(o.status)).length;
  const cancelled30 = allOrders.filter((o: any) => isCancelled(o.status)).length;
  const salesConfirmed30 = allOrders
    .filter((o: any) => isConfirmed(o.status))
    .reduce((s: number, o: any) => s + Number(o.total || 0), 0);
  const confirmRate = total30 ? Math.round((confirmed30 / total30) * 100) : 0;
  const cancelRate = total30 ? Math.round((cancelled30 / total30) * 100) : 0;

  // Daily unique visitors (by visitor_id) over the 30-day window.
  const visitDays = new Map<string, Set<string>>();
  for (const v of (visitsRes.data ?? []) as any[]) {
    const key = dhakaDayKey(v.created_at);
    if (!buckets.has(key)) continue;
    if (!visitDays.has(key)) visitDays.set(key, new Set());
    visitDays.get(key)!.add(v.visitor_id || v.created_at);
  }
  const visitorsChart = chart.map((c) => ({ day: c.day, visitors: visitDays.get(c.day)?.size ?? 0 }));
  const todayVisitors = visitDays.get(today)?.size ?? 0;
  const visitors30 = (visitsRes.data ?? []).length
    ? new Set((visitsRes.data as any[]).map((v) => v.visitor_id || v.created_at)).size
    : 0;

  // Booked orders due within the next 3 days (or already overdue) → reminder list.
  const cutoff = new Date(Date.now() + DHAKA_OFFSET_MS + 3 * 86400000).toISOString().slice(0, 10);
  const bookedSoon = (bookedRes.data ?? [])
    .filter((b: any) => b.booked_date && b.booked_date <= cutoff)
    .map((b: any) => ({
      id: b.id,
      order_number: b.order_number,
      name: b.customer_name,
      phone: b.customer_phone,
      date: b.booked_date as string,
      total: Number(b.total || 0),
      overdue: b.booked_date < today,
    }));

  // Top products by quantity sold.
  const qtyByName = new Map<string, number>();
  for (const it of (itemsRes.data ?? []) as any[]) {
    qtyByName.set(it.product_name, (qtyByName.get(it.product_name) || 0) + Number(it.quantity || 0));
  }
  const topProducts = Array.from(qtyByName.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  return {
    products: productsRes.count ?? 0,
    orders: ordersRes.count ?? 0,
    pending: pendingRes.count ?? 0,
    abandoned: abandonedRes.count ?? 0,
    total30,
    confirmed30,
    cancelled30,
    confirmRate,
    cancelRate,
    salesConfirmed30,
    bookedSoon,
    todayVisitors,
    visitors30,
    visitorsChart,
    revenue30,
    todayOrders: todayOrders.length,
    todayRevenue,
    recent: (recentRes.data ?? []) as any[],
    lowStock: (lowStockRes.data ?? []) as any[],
    chart,
    topProducts,
  };
}

const STATUS_LABELS: Record<string, string> = {
  pending: "পেন্ডিং",
  confirmed: "কনফার্মড",
  processing: "প্রসেসিং",
  shipped: "শিপড",
  delivered: "ডেলিভার্ড",
  cancelled: "বাতিল",
  returned: "রিটার্ন",
};

function StatCard({ label, value, href, accent }: { label: string; value: string | number; href?: string; accent?: boolean }) {
  const inner = (
    <>
      <p className="text-sm text-gray-500">{label}</p>
      <p className={"mt-1 text-2xl font-bold " + (accent && Number(value) > 0 ? "text-amber-600" : "")}>{value}</p>
    </>
  );
  const cls =
    "rounded-xl border bg-white p-5 block " +
    (href ? "hover:border-brand hover:shadow-sm transition " : "") +
    (accent && Number(value) > 0 ? "border-amber-300 bg-amber-50/40" : "");
  return href ? <a href={href} className={cls}>{inner}</a> : <div className={cls}>{inner}</div>;
}

function Meter({ label, pct, color }: { label: string; pct: number; color: string }) {
  return (
    <div className="rounded-xl border bg-white p-5">
      <div className="flex items-baseline justify-between">
        <p className="text-sm text-gray-500">{label}</p>
        <p className="text-2xl font-bold">{pct}%</p>
      </div>
      <div className="mt-2 h-2 rounded-full bg-gray-100 overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${Math.min(100, pct)}%`, background: color }} />
      </div>
    </div>
  );
}

export default async function AdminDashboard() {
  const stats = await getStats();
  const maxBar = Math.max(1, ...stats.chart.map((c) => c.total));
  const maxCount = Math.max(1, ...stats.chart.map((c) => c.count));
  const maxVisitors = Math.max(1, ...stats.visitorsChart.map((c) => c.visitors));

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">ড্যাশবোর্ড</h1>

      {stats.bookedSoon.length > 0 && (
        <div className="mb-6 rounded-xl border border-amber-300 bg-amber-50 p-4">
          <h2 className="font-bold text-amber-800 mb-2">📅 বুকড অর্ডার রিমাইন্ডার ({stats.bookedSoon.length})</h2>
          <p className="text-xs text-amber-700/80 mb-3">নিচের বুকড অর্ডারগুলোর ডেলিভারি তারিখ ৩ দিনের মধ্যে (বা পার হয়ে গেছে)।</p>
          <div className="space-y-2">
            {stats.bookedSoon.map((b) => (
              <div key={b.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-white px-3 py-2 text-sm">
                <div className="min-w-0">
                  <a href={`/admin/orders/${b.id}`} className="font-semibold text-brand hover:underline">{b.order_number}</a>
                  <span className="text-gray-600"> · {b.name} · {b.phone}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className={"rounded-full px-2 py-0.5 text-xs font-medium " + (b.overdue ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700")}>
                    {b.overdue ? "⏰ পার হয়েছে" : "📅"} {b.date}
                  </span>
                  <a href={`tel:+${(b.phone || "").replace(/\D/g, "")}`} className="rounded-lg bg-brand text-white px-3 py-1 text-xs">📞 কল</a>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
        <StatCard label="👥 আজকের ভিজিটর" value={stats.todayVisitors} />
        <StatCard label="আজকের অর্ডার" value={stats.todayOrders} />
        <StatCard label="আজকের আয়" value={taka(stats.todayRevenue)} />
        <StatCard label="পেন্ডিং অর্ডার" value={stats.pending} href="/admin/orders?status=pending" />
        <StatCard label="৩০ দিনের আয়" value={taka(stats.revenue30)} />
        <StatCard label="🛒 অসম্পূর্ণ লিড" value={stats.abandoned} href="/admin/abandoned" accent />
      </div>

      {/* 30-day performance KPIs */}
      <h2 className="mt-8 mb-3 text-lg font-bold">৩০ দিনের পারফরম্যান্স</h2>
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
        <StatCard label="মোট অর্ডার" value={stats.total30} />
        <StatCard label="কনফার্মড" value={stats.confirmed30} />
        <StatCard label="বাতিল" value={stats.cancelled30} />
        <StatCard label="মোট বিক্রি (কনফার্মড)" value={taka(stats.salesConfirmed30)} />
        <Meter label="কনফার্ম রেট" pct={stats.confirmRate} color="#16a34a" />
        <Meter label="বাতিল রেট" pct={stats.cancelRate} color="#dc2626" />
      </div>

      {/* 30-day daily orders by status (stacked) */}
      <div className="mt-8 rounded-xl border bg-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
          <h2 className="text-lg font-bold">দৈনিক অর্ডার (স্ট্যাটাস অনুযায়ী)</h2>
          <div className="flex flex-wrap gap-3 text-xs text-gray-500">
            <span className="inline-flex items-center gap-1"><i className="inline-block h-3 w-3 rounded-sm bg-green-500" /> ডেলিভার্ড</span>
            <span className="inline-flex items-center gap-1"><i className="inline-block h-3 w-3 rounded-sm bg-brand" /> কনফার্মড</span>
            <span className="inline-flex items-center gap-1"><i className="inline-block h-3 w-3 rounded-sm bg-amber-400" /> পেন্ডিং</span>
            <span className="inline-flex items-center gap-1"><i className="inline-block h-3 w-3 rounded-sm bg-red-500" /> বাতিল</span>
          </div>
        </div>
        <div className="flex items-end gap-1 h-44">
          {stats.chart.map((c) => {
            const h = (c.count / maxCount) * 100;
            const seg = (n: number) => (c.count > 0 ? (n / c.count) * h : 0);
            return (
              <div
                key={c.day}
                className="flex-1 flex flex-col justify-end"
                title={`${c.day}\nমোট: ${c.count} · ডেলিভার্ড: ${c.delivered} · কনফার্মড: ${c.confirmed} · পেন্ডিং: ${c.pending} · বাতিল: ${c.cancelled}\nবিক্রি: ${taka(c.total)}`}
              >
                <div className="w-full rounded-t overflow-hidden flex flex-col justify-end" style={{ height: "100%" }}>
                  <div className="bg-red-500" style={{ height: `${seg(c.cancelled)}%` }} />
                  <div className="bg-amber-400" style={{ height: `${seg(c.pending)}%` }} />
                  <div className="bg-brand" style={{ height: `${seg(c.confirmed)}%` }} />
                  <div className="bg-green-500" style={{ height: `${seg(c.delivered)}%` }} />
                </div>
              </div>
            );
          })}
        </div>
        <p className="text-xs text-gray-400 mt-2">প্রতিদিনের অর্ডার সংখ্যা স্ট্যাটাস অনুযায়ী। বারের উপর হোভার করলে বিস্তারিত।</p>
      </div>

      {/* 30-day visitors chart */}
      <div className="mt-6 rounded-xl border bg-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
          <h2 className="text-lg font-bold">দৈনিক ভিজিটর</h2>
          <span className="text-sm text-gray-500">৩০ দিনে মোট: <b>{stats.visitors30}</b> · আজ: <b>{stats.todayVisitors}</b></span>
        </div>
        <div className="flex items-end gap-1 h-40">
          {stats.visitorsChart.map((c) => (
            <div key={c.day} className="flex-1 flex flex-col justify-end" title={`${c.day}: ${c.visitors} ভিজিটর`}>
              <div className="bg-indigo-400 hover:bg-indigo-500 rounded-t transition-colors" style={{ height: `${(c.visitors / maxVisitors) * 100}%`, minHeight: c.visitors > 0 ? "2px" : "0" }} />
            </div>
          ))}
        </div>
        <p className="text-xs text-gray-400 mt-2">প্রতিদিনের ইউনিক ভিজিটর সংখ্যা। বারের উপর হোভার করলে বিস্তারিত।</p>
      </div>

      {/* 30-day sales chart */}
      <div className="mt-6 rounded-xl border bg-white p-5">
        <h2 className="text-lg font-bold mb-4">গত ৩০ দিনের বিক্রি (৳)</h2>
        <div className="flex items-end gap-1 h-40">
          {stats.chart.map((c) => (
            <div key={c.day} className="flex-1 group relative flex flex-col justify-end">
              <div
                className="bg-brand/80 rounded-t hover:bg-brand transition-colors"
                style={{ height: `${(c.total / maxBar) * 100}%`, minHeight: c.total > 0 ? "2px" : "0" }}
                title={`${c.day}: ${taka(c.total)}`}
              />
            </div>
          ))}
        </div>
        <p className="text-xs text-gray-400 mt-2">দৈনিক মোট বিক্রি (৳)। বারের উপর হোভার করলে বিস্তারিত।</p>
      </div>

      <div className="mt-8 grid md:grid-cols-2 gap-6">
        {/* Low stock */}
        <div className="rounded-xl border bg-white p-5">
          <h2 className="text-lg font-bold mb-3">কম স্টকের পণ্য</h2>
          {stats.lowStock.length === 0 ? (
            <p className="text-sm text-gray-400">সব পণ্যের স্টক ঠিক আছে।</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {stats.lowStock.map((p: any) => (
                <li key={p.id} className="flex justify-between">
                  <span>{p.name_bn || p.name_en}</span>
                  <span className={p.stock === 0 ? "text-red-600 font-medium" : "text-amber-600"}>
                    {p.stock} টি
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Top products */}
        <div className="rounded-xl border bg-white p-5">
          <h2 className="text-lg font-bold mb-3">টপ পণ্য (বিক্রি অনুযায়ী)</h2>
          {stats.topProducts.length === 0 ? (
            <p className="text-sm text-gray-400">এখনও কোনো বিক্রি নেই।</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {stats.topProducts.map(([name, qty]) => (
                <li key={name} className="flex justify-between">
                  <span className="truncate pr-2">{name}</span>
                  <span className="text-gray-500">{qty} টি</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Recent orders */}
      <div className="mt-8 flex items-center justify-between mb-3">
        <h2 className="text-lg font-bold">সাম্প্রতিক অর্ডার</h2>
        <a href="/admin/orders" className="text-sm text-brand hover:underline">সব অর্ডার →</a>
      </div>
      <div className="overflow-x-auto rounded-xl border bg-white">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-gray-500">
            <tr>
              <th className="px-4 py-3">অর্ডার নম্বর</th>
              <th className="px-4 py-3">গ্রাহক</th>
              <th className="px-4 py-3">অবস্থা</th>
              <th className="px-4 py-3 text-right">মোট</th>
            </tr>
          </thead>
          <tbody>
            {stats.recent.map((o) => (
              <tr key={o.id} className="border-t">
                <td className="px-4 py-3">
                  <a href={`/admin/orders/${o.id}`} className="font-medium text-brand hover:underline">
                    {o.order_number}
                  </a>
                </td>
                <td className="px-4 py-3">{o.customer_name}</td>
                <td className="px-4 py-3">{STATUS_LABELS[o.status] ?? o.status}</td>
                <td className="px-4 py-3 text-right">{taka(Number(o.total))}</td>
              </tr>
            ))}
            {stats.recent.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-gray-400">এখনও কোনো অর্ডার নেই।</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
