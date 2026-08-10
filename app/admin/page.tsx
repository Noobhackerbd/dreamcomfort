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

  const [productsRes, ordersRes, pendingRes, allOrdersRes, recentRes, lowStockRes, itemsRes] =
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
    ]);

  const allOrders = allOrdersRes.data ?? [];
  const revenue30 = allOrders.reduce((s: number, o: any) => s + Number(o.total || 0), 0);

  const today = todayKey();
  const todayOrders = allOrders.filter((o: any) => dhakaDayKey(o.created_at) === today);
  const todayRevenue = todayOrders.reduce((s: number, o: any) => s + Number(o.total || 0), 0);

  // 30-day daily buckets for the chart.
  const buckets = new Map<string, number>();
  for (let i = 29; i >= 0; i--) {
    const key = new Date(Date.now() + DHAKA_OFFSET_MS - i * 86400000).toISOString().slice(0, 10);
    buckets.set(key, 0);
  }
  for (const o of allOrders as any[]) {
    const key = dhakaDayKey(o.created_at);
    if (buckets.has(key)) buckets.set(key, (buckets.get(key) || 0) + Number(o.total || 0));
  }
  const chart = Array.from(buckets.entries()).map(([day, total]) => ({ day, total }));

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

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border bg-white p-5">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="mt-1 text-2xl font-bold">{value}</p>
    </div>
  );
}

export default async function AdminDashboard() {
  const stats = await getStats();
  const maxBar = Math.max(1, ...stats.chart.map((c) => c.total));

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">ড্যাশবোর্ড</h1>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="আজকের অর্ডার" value={stats.todayOrders} />
        <StatCard label="আজকের আয়" value={taka(stats.todayRevenue)} />
        <StatCard label="পেন্ডিং অর্ডার" value={stats.pending} />
        <StatCard label="৩০ দিনের আয়" value={taka(stats.revenue30)} />
      </div>

      {/* 30-day sales chart */}
      <div className="mt-8 rounded-xl border bg-white p-5">
        <h2 className="text-lg font-bold mb-4">গত ৩০ দিনের বিক্রি</h2>
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
