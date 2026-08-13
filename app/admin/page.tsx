// app/admin/page.tsx — premium admin dashboard (server component).
import { getServerSupabase } from "@/lib/supabase/server";
import { taka } from "@/lib/format";

export const dynamic = "force-dynamic";

const DHAKA_OFFSET_MS = 6 * 60 * 60 * 1000; // UTC+6

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
        .limit(8),
      supabase
        .from("products")
        .select("id, name_bn, name_en, stock")
        .lte("stock", 5)
        .order("stock", { ascending: true })
        .limit(8),
      supabase.from("order_items").select("product_name, quantity"),
      supabase.from("abandoned_carts").select("id", { count: "exact", head: true }).eq("status", "abandoned"),
      supabase
        .from("orders")
        .select("id, order_number, customer_name, customer_phone, booked_date, total, status")
        .eq("is_booked", true)
        .not("booked_date", "is", null)
        .not("status", "in", "(delivered,cancelled,returned)")
        .order("booked_date", { ascending: true })
        .limit(60),
      supabase.from("page_visits").select("visitor_id, created_at").gte("created_at", since).limit(100000),
    ]);

  const allOrders = allOrdersRes.data ?? [];
  const revenue30 = allOrders.reduce((s: number, o: any) => s + Number(o.total || 0), 0);

  const today = todayKey();
  const todayOrders = allOrders.filter((o: any) => dhakaDayKey(o.created_at) === today);
  const todayRevenue = todayOrders.reduce((s: number, o: any) => s + Number(o.total || 0), 0);

  const CONFIRMED_SET = new Set(["confirmed", "processing", "shipped", "delivered"]);
  const isConfirmed = (s: string) => CONFIRMED_SET.has(s);
  const isCancelled = (s: string) => s === "cancelled" || s === "returned";
  const isDelivered = (s: string) => s === "delivered";

  type Day = { day: string; total: number; count: number; confirmed: number; cancelled: number; pending: number; delivered: number };
  const buckets = new Map<string, Day>();
  for (let i = 29; i >= 0; i--) {
    const key = new Date(Date.now() + DHAKA_OFFSET_MS - i * 86400000).toISOString().slice(0, 10);
    buckets.set(key, { day: key, total: 0, count: 0, confirmed: 0, cancelled: 0, pending: 0, delivered: 0 });
  }
  for (const o of allOrders as any[]) {
    const b = buckets.get(dhakaDayKey(o.created_at));
    if (!b) continue;
    b.total += Number(o.total || 0);
    b.count += 1;
    if (isDelivered(o.status)) b.delivered += 1;
    else if (isConfirmed(o.status)) b.confirmed += 1;
    else if (isCancelled(o.status)) b.cancelled += 1;
    else b.pending += 1;
  }
  const chart = Array.from(buckets.values());

  const total30 = allOrders.length;
  const confirmed30 = allOrders.filter((o: any) => isConfirmed(o.status)).length;
  const cancelled30 = allOrders.filter((o: any) => isCancelled(o.status)).length;
  const salesConfirmed30 = allOrders
    .filter((o: any) => isConfirmed(o.status))
    .reduce((s: number, o: any) => s + Number(o.total || 0), 0);
  const confirmRate = total30 ? Math.round((confirmed30 / total30) * 100) : 0;
  const cancelRate = total30 ? Math.round((cancelled30 / total30) * 100) : 0;
  const aov = confirmed30 ? Math.round(salesConfirmed30 / confirmed30) : 0;

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

  const qtyByName = new Map<string, number>();
  for (const it of (itemsRes.data ?? []) as any[]) {
    qtyByName.set(it.product_name, (qtyByName.get(it.product_name) || 0) + Number(it.quantity || 0));
  }
  const topProducts = Array.from(qtyByName.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5);

  return {
    products: productsRes.count ?? 0,
    orders: ordersRes.count ?? 0,
    pending: pendingRes.count ?? 0,
    abandoned: abandonedRes.count ?? 0,
    total30, confirmed30, cancelled30, confirmRate, cancelRate, salesConfirmed30, aov,
    bookedSoon, todayVisitors, visitors30, visitorsChart, revenue30,
    todayOrders: todayOrders.length, todayRevenue,
    recent: (recentRes.data ?? []) as any[],
    lowStock: (lowStockRes.data ?? []) as any[],
    chart, topProducts,
  };
}

const STATUS_LABELS: Record<string, string> = {
  pending: "পেন্ডিং", confirmed: "কনফার্মড", processing: "প্রসেসিং",
  shipped: "শিপড", delivered: "ডেলিভার্ড", cancelled: "বাতিল", returned: "রিটার্ন",
};
const STATUS_STYLE: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700",
  confirmed: "bg-brand-soft text-brand-dark",
  processing: "bg-indigo-100 text-indigo-700",
  shipped: "bg-purple-100 text-purple-700",
  delivered: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-700",
  returned: "bg-gray-200 text-gray-600",
};

const CHART_H = 170;

function Kpi({ icon, label, value, sub, href, tone = "brand", alert }: {
  icon: string; label: string; value: string | number; sub?: string; href?: string;
  tone?: "brand" | "accent" | "green" | "amber" | "indigo"; alert?: boolean;
}) {
  const toneMap: Record<string, string> = {
    brand: "from-brand to-brand-dark",
    accent: "from-accent to-accent-dark",
    green: "from-green-400 to-green-600",
    amber: "from-amber-400 to-amber-500",
    indigo: "from-indigo-400 to-indigo-600",
  };
  const inner = (
    <>
      <div className="flex items-center justify-between">
        <span className={"h-10 w-10 rounded-2xl bg-gradient-to-br text-white flex items-center justify-center text-lg shadow-sm " + toneMap[tone]}>
          {icon}
        </span>
        {alert && Number(value) > 0 && <span className="h-2.5 w-2.5 rounded-full bg-amber-500 animate-pulse" />}
      </div>
      <p className="mt-3 text-2xl font-bold font-display tracking-tight">{value}</p>
      <p className="text-sm text-gray-500">{label}</p>
      {sub && <p className="mt-1 text-xs text-gray-400">{sub}</p>}
    </>
  );
  const cls =
    "rounded-2xl border border-black/5 bg-white p-4 shadow-sm block transition " +
    (href ? "hover:shadow-soft hover:-translate-y-0.5 " : "") +
    (alert && Number(value) > 0 ? "ring-1 ring-amber-300 " : "");
  return href ? <a href={href} className={cls}>{inner}</a> : <div className={cls}>{inner}</div>;
}

function Meter({ label, pct, tone }: { label: string; pct: number; tone: "green" | "red" }) {
  const bar = tone === "green" ? "bg-green-500" : "bg-red-500";
  return (
    <div className="rounded-2xl border border-black/5 bg-white p-4 shadow-sm">
      <div className="flex items-baseline justify-between">
        <p className="text-sm text-gray-500">{label}</p>
        <p className="text-2xl font-bold font-display">{pct}%</p>
      </div>
      <div className="mt-2 h-2 rounded-full bg-gray-100 overflow-hidden">
        <div className={"h-full rounded-full " + bar} style={{ width: `${Math.min(100, pct)}%` }} />
      </div>
    </div>
  );
}

function ChartCard({ title, right, children, note }: { title: string; right?: React.ReactNode; children: React.ReactNode; note?: string }) {
  return (
    <div className="rounded-2xl border border-black/5 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
        <h2 className="font-display text-lg font-bold">{title}</h2>
        {right}
      </div>
      {children}
      {note && <p className="text-xs text-gray-400 mt-2">{note}</p>}
    </div>
  );
}

/** X-axis: first / middle / last day labels (dd/mm). */
function AxisLabels({ days }: { days: string[] }) {
  if (!days.length) return null;
  const fmt = (d: string) => d.slice(8, 10) + "/" + d.slice(5, 7);
  const mid = days[Math.floor(days.length / 2)];
  return (
    <div className="flex justify-between text-[10px] text-gray-400 mt-1.5">
      <span>{fmt(days[0])}</span>
      <span>{fmt(mid)}</span>
      <span>{fmt(days[days.length - 1])}</span>
    </div>
  );
}

export default async function AdminDashboard() {
  const stats = await getStats();
  const maxBar = Math.max(1, ...stats.chart.map((c) => c.total));
  const maxCount = Math.max(1, ...stats.chart.map((c) => c.count));
  const maxVisitors = Math.max(1, ...stats.visitorsChart.map((c) => c.visitors));
  const days = stats.chart.map((c) => c.day);
  const px = (v: number, max: number) => Math.max(v > 0 ? 3 : 0, Math.round((v / max) * CHART_H));

  return (
    <div>
      <div className="flex items-center gap-2 mb-6">
        <h1 className="font-display text-2xl font-bold">ড্যাশবোর্ড</h1>
        <span className="inline-flex items-center gap-1.5 text-xs text-green-600 bg-green-50 rounded-full px-2.5 py-1">
          <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" /> লাইভ
        </span>
      </div>

      {stats.bookedSoon.length > 0 && (
        <div className="mb-6 rounded-2xl border border-amber-300 bg-amber-50 p-4">
          <h2 className="font-bold text-amber-800 mb-2">📅 বুকড অর্ডার রিমাইন্ডার ({stats.bookedSoon.length})</h2>
          <div className="space-y-2">
            {stats.bookedSoon.map((b) => (
              <div key={b.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-white px-3 py-2 text-sm">
                <div className="min-w-0">
                  <a href={`/admin/orders/${b.id}`} className="font-semibold text-brand-dark hover:underline">{b.order_number}</a>
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

      {/* Today / key KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
        <Kpi icon="👥" label="আজকের ভিজিটর" value={stats.todayVisitors} tone="indigo" />
        <Kpi icon="🛍️" label="আজকের অর্ডার" value={stats.todayOrders} tone="brand" />
        <Kpi icon="💰" label="আজকের আয়" value={taka(stats.todayRevenue)} tone="green" />
        <Kpi icon="⏳" label="পেন্ডিং অর্ডার" value={stats.pending} href="/admin/orders?status=pending" tone="amber" alert />
        <Kpi icon="📈" label="৩০ দিনের আয়" value={taka(stats.revenue30)} tone="brand" />
        <Kpi icon="🛒" label="অসম্পূর্ণ লিড" value={stats.abandoned} href="/admin/abandoned" tone="accent" alert />
      </div>

      {/* 30-day performance */}
      <h2 className="mt-8 mb-3 font-display text-lg font-bold">৩০ দিনের পারফরম্যান্স</h2>
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
        <Kpi icon="📦" label="মোট অর্ডার" value={stats.total30} tone="brand" />
        <Kpi icon="✅" label="কনফার্মড" value={stats.confirmed30} tone="green" />
        <Kpi icon="❌" label="বাতিল" value={stats.cancelled30} tone="accent" />
        <Kpi icon="🏷️" label="গড় অর্ডার (AOV)" value={taka(stats.aov)} tone="indigo" />
        <Meter label="কনফার্ম রেট" pct={stats.confirmRate} tone="green" />
        <Meter label="বাতিল রেট" pct={stats.cancelRate} tone="red" />
      </div>

      {/* Charts */}
      <div className="mt-8 grid gap-4 lg:grid-cols-2">
        <ChartCard
          title="দৈনিক অর্ডার (স্ট্যাটাস)"
          right={
            <div className="flex flex-wrap gap-3 text-xs text-gray-500">
              <span className="inline-flex items-center gap-1"><i className="h-2.5 w-2.5 rounded-sm bg-green-500 inline-block" /> ডেলিভার্ড</span>
              <span className="inline-flex items-center gap-1"><i className="h-2.5 w-2.5 rounded-sm bg-brand inline-block" /> কনফার্মড</span>
              <span className="inline-flex items-center gap-1"><i className="h-2.5 w-2.5 rounded-sm bg-amber-400 inline-block" /> পেন্ডিং</span>
              <span className="inline-flex items-center gap-1"><i className="h-2.5 w-2.5 rounded-sm bg-red-400 inline-block" /> বাতিল</span>
            </div>
          }
          note="প্রতিদিনের অর্ডার স্ট্যাটাস অনুযায়ী। বারে হোভার করলে বিস্তারিত।"
        >
          <div className="flex items-end gap-[3px]" style={{ height: CHART_H }}>
            {stats.chart.map((c) => {
              const barH = px(c.count, maxCount);
              const seg = (n: number) => (c.count > 0 ? Math.round((n / c.count) * barH) : 0);
              return (
                <div key={c.day} className="flex-1 min-w-0 flex flex-col justify-end"
                  title={`${c.day}\nমোট ${c.count} · ডেলিভার্ড ${c.delivered} · কনফার্মড ${c.confirmed} · পেন্ডিং ${c.pending} · বাতিল ${c.cancelled}\nবিক্রি ${taka(c.total)}`}>
                  <div className="w-full rounded-t overflow-hidden" style={{ height: barH }}>
                    <div className="bg-red-400" style={{ height: seg(c.cancelled) }} />
                    <div className="bg-amber-400" style={{ height: seg(c.pending) }} />
                    <div className="bg-brand" style={{ height: seg(c.confirmed) }} />
                    <div className="bg-green-500" style={{ height: seg(c.delivered) }} />
                  </div>
                </div>
              );
            })}
          </div>
          <AxisLabels days={days} />
        </ChartCard>

        <ChartCard
          title="দৈনিক বিক্রি (৳)"
          right={<span className="text-sm text-gray-500">৩০ দিন: <b>{taka(stats.revenue30)}</b></span>}
          note="দৈনিক মোট বিক্রি (৳)।"
        >
          <div className="flex items-end gap-[3px]" style={{ height: CHART_H }}>
            {stats.chart.map((c) => (
              <div key={c.day} className="flex-1 min-w-0 flex items-end" title={`${c.day}: ${taka(c.total)}`}>
                <div className="w-full rounded-t bg-gradient-to-t from-brand-dark to-brand-light hover:from-brand hover:to-brand-light transition-colors" style={{ height: px(c.total, maxBar) }} />
              </div>
            ))}
          </div>
          <AxisLabels days={days} />
        </ChartCard>
      </div>

      <div className="mt-4">
        <ChartCard
          title="দৈনিক ভিজিটর"
          right={<span className="text-sm text-gray-500">৩০ দিন: <b>{stats.visitors30}</b> · আজ: <b>{stats.todayVisitors}</b></span>}
          note="প্রতিদিনের ইউনিক ভিজিটর।"
        >
          <div className="flex items-end gap-[3px]" style={{ height: 120 }}>
            {stats.visitorsChart.map((c) => (
              <div key={c.day} className="flex-1 min-w-0 flex items-end" title={`${c.day}: ${c.visitors} ভিজিটর`}>
                <div className="w-full rounded-t bg-gradient-to-t from-accent-dark to-accent-light hover:from-accent transition-colors"
                  style={{ height: Math.max(c.visitors > 0 ? 3 : 0, Math.round((c.visitors / maxVisitors) * 120)) }} />
              </div>
            ))}
          </div>
          <AxisLabels days={days} />
        </ChartCard>
      </div>

      {/* Low stock + top products */}
      <div className="mt-4 grid md:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-black/5 bg-white p-5 shadow-sm">
          <h2 className="font-display text-lg font-bold mb-3">কম স্টকের পণ্য</h2>
          {stats.lowStock.length === 0 ? (
            <p className="text-sm text-gray-400">সব পণ্যের স্টক ঠিক আছে।</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {stats.lowStock.map((p: any) => (
                <li key={p.id} className="flex justify-between items-center">
                  <span className="truncate pr-2">{p.name_bn || p.name_en}</span>
                  <span className={"rounded-full px-2 py-0.5 text-xs font-medium " + (p.stock === 0 ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700")}>
                    {p.stock} টি
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-2xl border border-black/5 bg-white p-5 shadow-sm">
          <h2 className="font-display text-lg font-bold mb-3">টপ পণ্য (বিক্রি)</h2>
          {stats.topProducts.length === 0 ? (
            <p className="text-sm text-gray-400">এখনও কোনো বিক্রি নেই।</p>
          ) : (
            <ul className="space-y-2.5 text-sm">
              {stats.topProducts.map(([name, qty], i) => {
                const max = stats.topProducts[0][1] || 1;
                return (
                  <li key={name}>
                    <div className="flex justify-between mb-1">
                      <span className="truncate pr-2">{i + 1}. {name}</span>
                      <span className="text-gray-500 shrink-0">{qty} টি</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
                      <div className="h-full rounded-full bg-gradient-to-r from-brand to-accent" style={{ width: `${Math.round((qty / max) * 100)}%` }} />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      {/* Recent orders */}
      <div className="mt-8 flex items-center justify-between mb-3">
        <h2 className="font-display text-lg font-bold">সাম্প্রতিক অর্ডার</h2>
        <a href="/admin/orders" className="text-sm text-brand-dark hover:underline">সব অর্ডার →</a>
      </div>
      <div className="overflow-x-auto rounded-2xl border border-black/5 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-gray-500">
            <tr>
              <th className="px-4 py-3 font-medium">অর্ডার নম্বর</th>
              <th className="px-4 py-3 font-medium">গ্রাহক</th>
              <th className="px-4 py-3 font-medium">অবস্থা</th>
              <th className="px-4 py-3 font-medium text-right">মোট</th>
            </tr>
          </thead>
          <tbody>
            {stats.recent.map((o) => (
              <tr key={o.id} className="border-t border-black/5 hover:bg-brand-soft/40 transition-colors">
                <td className="px-4 py-3">
                  <a href={`/admin/orders/${o.id}`} className="font-medium text-brand-dark hover:underline">{o.order_number}</a>
                </td>
                <td className="px-4 py-3">{o.customer_name}</td>
                <td className="px-4 py-3">
                  <span className={"rounded-full px-2 py-0.5 text-xs font-medium " + (STATUS_STYLE[o.status] ?? "bg-gray-100 text-gray-600")}>
                    {STATUS_LABELS[o.status] ?? o.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-right font-medium">{taka(Number(o.total))}</td>
              </tr>
            ))}
            {stats.recent.length === 0 && (
              <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-400">এখনও কোনো অর্ডার নেই।</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
