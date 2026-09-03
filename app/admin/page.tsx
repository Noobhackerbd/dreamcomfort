// app/admin/page.tsx — admin dashboard (modern, English).
import { getServerSupabase } from "@/lib/supabase/server";
import { getSupabaseServerClient } from "@/lib/supabase/ssr-server";
import { taka } from "@/lib/format";
import { Icon } from "@/components/admin/icons";
import { ResetDailyButton } from "@/components/admin/ResetDailyButton";
import { AutoRefresh } from "@/components/admin/AutoRefresh";
import { RangeTabs } from "@/components/admin/RangeTabs";
import { OrdersStatusChart, RevenueChart, VisitorsChart, VisitorsByHourChart } from "@/components/admin/DashboardCharts";

export const dynamic = "force-dynamic";

const DHAKA_OFFSET_MS = 6 * 60 * 60 * 1000;
function dhakaDayKey(iso: string): string { return new Date(new Date(iso).getTime() + DHAKA_OFFSET_MS).toISOString().slice(0, 10); }
function todayKey(): string { return new Date(Date.now() + DHAKA_OFFSET_MS).toISOString().slice(0, 10); }
function hour12(x: number): string { const ap = x < 12 ? "AM" : "PM"; let h = x % 12; if (h === 0) h = 12; return `${h} ${ap}`; }
const isoRe = /^\d{4}-\d{2}-\d{2}$/;

const CONFIRMED_SET = new Set(["confirmed", "processing", "shipped", "delivered"]);
const isConfirmed = (s: string) => CONFIRMED_SET.has(s);
const isCancelled = (s: string) => s === "cancelled" || s === "returned";
const isDelivered = (s: string) => s === "delivered";

async function getStats(rangeDays: number, cFrom?: string, cTo?: string) {
  const supabase = getServerSupabase();
  const now = Date.now();

  const todayStartMs = new Date(`${todayKey()}T00:00:00+06:00`).getTime();
  let winStartMs: number, winEndMs: number, prevStartMs: number, prevEndMs: number;
  const custom = !!(cFrom && cTo && isoRe.test(cFrom) && isoRe.test(cTo));
  if (custom) {
    winStartMs = new Date(`${cFrom}T00:00:00+06:00`).getTime();
    winEndMs = Math.min(now, new Date(`${cTo}T23:59:59.999+06:00`).getTime());
    rangeDays = Math.max(1, Math.round((winEndMs - winStartMs) / 86400000) + 1);
    const span = Math.max(86400000, winEndMs - winStartMs);
    prevStartMs = winStartMs - span; prevEndMs = winStartMs;
  } else if (rangeDays === 1) {
    // "Today" = the calendar day (since Bangladesh midnight). Compare with the same
    // slice of yesterday (yesterday up to this same time) for a fair "vs yesterday".
    winStartMs = todayStartMs; winEndMs = now;
    const elapsed = Math.max(60000, now - todayStartMs);
    prevStartMs = todayStartMs - 86400000; prevEndMs = prevStartMs + elapsed;
  } else {
    winEndMs = now; winStartMs = now - rangeDays * 86400000;
    prevStartMs = winStartMs - (winEndMs - winStartMs); prevEndMs = winStartMs;
  }
  const winStart = new Date(winStartMs).toISOString();
  const winEnd = new Date(winEndMs).toISOString();
  const prevStart = new Date(prevStartMs).toISOString();
  const prevEnd = new Date(prevEndMs).toISOString();
  const todayStartUtc = new Date(todayStartMs).toISOString();

  // Fetch visit rows in the window (capped so a very busy site can't stall the page).
  async function fetchAllVisits(sinceIso: string): Promise<any[]> {
    const out: any[] = [];
    const pageSize = 1000;
    const MAX_PAGES = 40; // ~40k visits max scanned per load
    for (let p = 0; p < MAX_PAGES; p++) {
      const from = p * pageSize;
      const { data, error } = await supabase.from("page_visits").select("visitor_id, created_at").gte("created_at", sinceIso).order("created_at", { ascending: false }).range(from, from + pageSize - 1);
      if (error || !data || data.length === 0) break;
      out.push(...data);
      if (data.length < pageSize) break;
    }
    return out;
  }

  const delProbe = await supabase.from("orders").select("deleted_at").limit(1);
  const hasTrash = !(delProbe.error && (delProbe.error as any).code === "42703");
  const ordersLive = (sel: string, opts?: any) => { let q: any = supabase.from("orders").select(sel, opts); if (hasTrash) q = q.is("deleted_at", null); return q; };
  const topItemsQuery = hasTrash
    ? supabase.from("order_items").select("product_name, quantity, orders!inner(deleted_at)").is("orders.deleted_at", null)
    : supabase.from("order_items").select("product_name, quantity");
  let todayItemsQuery: any = supabase.from("order_items").select("order_id, product_id, product_name, quantity, unit_price, products(images), orders!inner(created_at)").gte("orders.created_at", todayStartUtc);
  if (hasTrash) todayItemsQuery = todayItemsQuery.is("orders.deleted_at", null);

  const [productsRes, ordersRes, pendingRes, twoWinRes, recentRes, lowStockRes, itemsRes, abandonedRes, bookedRes, visitsRes, prevVisitsRes, todayItemsRes, resetRes] =
    await Promise.all([
      supabase.from("products").select("id", { count: "exact", head: true }),
      ordersLive("id", { count: "exact", head: true }),
      ordersLive("id", { count: "exact", head: true }).eq("status", "pending"),
      ordersLive("total, created_at, status, area, city, district").gte("created_at", prevStart),
      ordersLive("id, order_number, customer_name, total, status, created_at").order("created_at", { ascending: false }).limit(8),
      supabase.from("products").select("id, name_bn, name_en, stock").lte("stock", 5).order("stock", { ascending: true }).limit(8),
      topItemsQuery,
      supabase.from("abandoned_carts").select("id", { count: "exact", head: true }).eq("status", "abandoned"),
      ordersLive("id, order_number, customer_name, customer_phone, booked_date, total, status").eq("is_booked", true).not("booked_date", "is", null).not("status", "in", "(delivered,cancelled,returned)").order("booked_date", { ascending: true }).limit(60),
      fetchAllVisits(winStart),
      supabase.from("page_visits").select("visitor_id", { count: "exact", head: true }).gte("created_at", prevStart).lt("created_at", prevEnd),
      todayItemsQuery,
      supabase.from("settings").select("value").eq("key", "dashboard_daily_reset").maybeSingle(),
    ]);

  const resetAt = (resetRes as any)?.data?.value?.at as string | undefined;
  const resetActive = !!resetAt;
  const effectiveTodayStart = resetAt ? resetAt : todayStartUtc;
  const resetTimeLabel = resetAt
    ? (() => { const iso = new Date(new Date(resetAt).getTime() + DHAKA_OFFSET_MS).toISOString(); const hm = iso.slice(11, 16); return iso.slice(0, 10) === todayKey() ? `today ${hm}` : `${iso.slice(8, 10)}/${iso.slice(5, 7)} ${hm}`; })()
    : null;

  const two = (twoWinRes.data ?? []) as any[];
  const cur = two.filter((o) => o.created_at >= winStart && o.created_at <= winEnd);
  const prev = two.filter((o) => o.created_at >= prevStart && o.created_at < prevEnd);

  const sum = (arr: any[]) => arr.reduce((s, o) => s + Number(o.total || 0), 0);
  const revenueCur = sum(cur);
  const revenuePrev = sum(prev);
  const revenueDelta = revenuePrev > 0 ? Math.round(((revenueCur - revenuePrev) / revenuePrev) * 100) : revenueCur > 0 ? 100 : 0;
  const ordersDelta = prev.length > 0 ? Math.round(((cur.length - prev.length) / prev.length) * 100) : cur.length > 0 ? 100 : 0;

  const today = todayKey();
  const todayOrders = cur.filter((o) => o.created_at >= effectiveTodayStart);
  const todayRevenue = sum(todayOrders);

  type Day = { day: string; total: number; count: number; confirmed: number; cancelled: number; pending: number; delivered: number };
  const buckets = new Map<string, Day>();
  for (let t = winStartMs; t <= winEndMs + 1000; t += 86400000) {
    const key = new Date(t + DHAKA_OFFSET_MS).toISOString().slice(0, 10);
    if (!buckets.has(key)) buckets.set(key, { day: key, total: 0, count: 0, confirmed: 0, cancelled: 0, pending: 0, delivered: 0 });
  }
  for (const o of cur) {
    const b = buckets.get(dhakaDayKey(o.created_at));
    if (!b) continue;
    b.total += Number(o.total || 0); b.count += 1;
    if (isDelivered(o.status)) b.delivered += 1;
    else if (isConfirmed(o.status)) b.confirmed += 1;
    else if (isCancelled(o.status)) b.cancelled += 1;
    else b.pending += 1;
  }
  const chart = Array.from(buckets.values());

  const total = cur.length;
  const confirmed = cur.filter((o) => isConfirmed(o.status)).length;
  const delivered = cur.filter((o) => isDelivered(o.status)).length;
  const cancelled = cur.filter((o) => isCancelled(o.status)).length;
  const salesConfirmed = cur.filter((o) => isConfirmed(o.status)).reduce((s, o) => s + Number(o.total || 0), 0);
  const confirmRate = total ? Math.round((confirmed / total) * 100) : 0;
  const cancelRate = total ? Math.round((cancelled / total) * 100) : 0;
  const deliveryRate = confirmed ? Math.round((delivered / confirmed) * 100) : 0;
  const aov = confirmed ? Math.round(salesConfirmed / confirmed) : 0;

  const visitDays = new Map<string, Set<string>>();
  const allVisitors = new Set<string>();
  for (const v of (visitsRes ?? []) as any[]) {
    if (v.created_at > winEnd) continue;
    const id = v.visitor_id || v.created_at;
    allVisitors.add(id);
    const key = dhakaDayKey(v.created_at);
    if (!buckets.has(key)) continue;
    if (!visitDays.has(key)) visitDays.set(key, new Set());
    visitDays.get(key)!.add(id);
  }
  const visitorsChart = chart.map((c) => ({ day: c.day, visitors: visitDays.get(c.day)?.size ?? 0 }));
  const todayVisitors = visitDays.get(today)?.size ?? 0;
  const visitorsCur = allVisitors.size;
  const visitorsPrev = prevVisitsRes.count ?? 0;
  const visitorsDelta = visitorsPrev > 0 ? Math.round(((visitorsCur - visitorsPrev) / visitorsPrev) * 100) : visitorsCur > 0 ? 100 : 0;
  const conversion = visitorsCur ? Math.round((total / visitorsCur) * 1000) / 10 : 0;

  const hourCounts = new Array(24).fill(0);
  for (const v of (visitsRes ?? []) as any[]) {
    if (v.created_at > winEnd) continue;
    hourCounts[new Date(new Date(v.created_at).getTime() + DHAKA_OFFSET_MS).getUTCHours()] += 1;
  }
  const hourly = hourCounts.map((visits, hour) => ({ hour, visits }));
  let peakHour = 0, peakVisits = 0;
  hourCounts.forEach((c: number, h: number) => { if (c > peakVisits) { peakVisits = c; peakHour = h; } });
  const peakLabel = peakVisits > 0 ? `${hour12(peakHour)} – ${hour12((peakHour + 1) % 24)}` : "—";

  const areaCount = new Map<string, { orders: number; revenue: number }>();
  for (const o of cur) {
    const label = (o.area || o.city || o.district || "Unknown").toString().trim() || "Unknown";
    const cell = areaCount.get(label) || { orders: 0, revenue: 0 };
    cell.orders += 1; cell.revenue += Number(o.total || 0);
    areaCount.set(label, cell);
  }
  const topAreas = Array.from(areaCount.entries()).map(([name, v]) => ({ name, ...v })).sort((a, b) => b.orders - a.orders).slice(0, 6);

  const cutoff = new Date(now + DHAKA_OFFSET_MS + 3 * 86400000).toISOString().slice(0, 10);
  const bookedSoon = ((bookedRes.data ?? []) as any[])
    .filter((b: any) => b.booked_date && b.booked_date <= cutoff)
    .map((b: any) => ({ id: b.id as string, order_number: b.order_number as string, name: b.customer_name as string, phone: b.customer_phone as string, date: b.booked_date as string, total: Number(b.total || 0), overdue: b.booked_date < today }));

  const qtyByName = new Map<string, number>();
  for (const it of (itemsRes.data ?? []) as any[]) qtyByName.set(it.product_name, (qtyByName.get(it.product_name) || 0) + Number(it.quantity || 0));
  const topProducts = Array.from(qtyByName.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5);

  const todayProdMap = new Map<string, { name: string; image: string | null; orders: Set<string>; qty: number; value: number }>();
  for (const it of (todayItemsRes.data ?? []) as any[]) {
    const created = it.orders?.created_at as string | undefined;
    if (created && created < effectiveTodayStart) continue;
    const key = it.product_id || it.product_name;
    const img = it.products?.images?.[0] ?? null;
    const cell = todayProdMap.get(key) || { name: it.product_name, image: img, orders: new Set<string>(), qty: 0, value: 0 };
    if (it.order_id) cell.orders.add(it.order_id);
    cell.qty += Number(it.quantity || 0);
    cell.value += Number(it.unit_price || 0) * Number(it.quantity || 0);
    if (!cell.image && img) cell.image = img;
    todayProdMap.set(key, cell);
  }
  const todayTotalOrders = todayOrders.length;
  const todayProducts = Array.from(todayProdMap.values())
    .map((p) => ({ name: p.name, image: p.image, orders: p.orders.size, qty: p.qty, value: p.value, pct: todayTotalOrders ? Math.min(100, Math.round((p.orders.size / todayTotalOrders) * 100)) : 0 }))
    .sort((a, b) => b.orders - a.orders || b.qty - a.qty);

  return {
    rangeDays, custom, resetTimeLabel, resetActive, todayProducts,
    products: productsRes.count ?? 0, orders: ordersRes.count ?? 0, pending: pendingRes.count ?? 0, abandoned: abandonedRes.count ?? 0,
    revenueCur, revenueDelta, ordersDelta, total, confirmed, delivered, cancelled, confirmRate, cancelRate, deliveryRate, salesConfirmed, aov,
    todayOrders: todayOrders.length, todayRevenue, todayVisitors, visitorsCur, visitorsDelta, conversion,
    hourly, peakHour, peakLabel, peakVisits, bookedSoon, visitorsChart, chart, topProducts, topAreas,
    recent: (recentRes.data ?? []) as any[], lowStock: (lowStockRes.data ?? []) as any[],
  };
}

const STATUS_META: Record<string, { label: string; bg: string; fg: string }> = {
  pending: { label: "Pending", bg: "#fef3e2", fg: "#b45309" }, confirmed: { label: "Confirmed", bg: "#e8eefc", fg: "#2563eb" },
  processing: { label: "Processing", bg: "#f0e9fc", fg: "#7c3aed" }, shipped: { label: "Shipped", bg: "#e2f3f7", fg: "#0e7490" },
  delivered: { label: "Delivered", bg: "#e7f6ec", fg: "#16a34a" }, cancelled: { label: "Cancelled", bg: "#fdeaea", fg: "#dc2626" },
  returned: { label: "Returned", bg: "#fdeede", fg: "#ea580c" },
};

function Delta({ pct, suffix }: { pct: number; suffix: string }) {
  const up = pct >= 0;
  return (
    <p className="text-[11px] font-bold mt-1.5" style={{ color: up ? "#16a34a" : "#dc2626" }}>
      {up ? "▲" : "▼"} {Math.abs(pct)}% <span className="font-medium" style={{ color: "var(--a-faint)" }}>{suffix}</span>
    </p>
  );
}

function StatCard({ icon, iconBg, iconFg, num, label, delta, deltaSuffix, badge, badgeColor, tint, href }: {
  icon: string; iconBg: string; iconFg: string; num: string | number; label: string;
  delta?: number; deltaSuffix?: string; badge?: string; badgeColor?: string; tint?: string; href?: string;
}) {
  const inner = (
    <>
      <div className="flex items-center justify-between gap-2">
        <span className="h-9 w-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: iconBg, color: iconFg }}><Icon name={icon} className="h-[18px] w-[18px]" /></span>
        <p className="text-[21px] font-extrabold tracking-tight tabular-nums leading-none">{num}</p>
      </div>
      <p className="text-[12px] dc-muted mt-2">{label}</p>
      {delta !== undefined ? <Delta pct={delta} suffix={deltaSuffix || ""} /> : badge ? <p className="text-[11px] font-bold mt-1" style={{ color: badgeColor }}>{badge}</p> : null}
    </>
  );
  const cls = "rounded-2xl border p-3 block";
  const style = { borderColor: tint ? "#d9f0e0" : "var(--a-border)", background: tint || "var(--a-surface)", boxShadow: "0 1px 2px rgba(20,20,40,.03)" };
  return href ? <a href={href} className={cls} style={style}>{inner}</a> : <div className={cls} style={style}>{inner}</div>;
}

function Meter({ label, pct, icon, fg, bg, track }: { label: string; pct: number; icon: string; fg: string; bg: string; track: string }) {
  return (
    <div className="dc-card p-4">
      <div className="flex items-center justify-between gap-2">
        <span className="h-9 w-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: bg, color: fg }}><Icon name={icon} className="h-[18px] w-[18px]" /></span>
        <p className="text-2xl font-extrabold font-display tabular-nums" style={{ color: fg }}>{pct}%</p>
      </div>
      <p className="text-[12px] dc-muted mt-2 mb-2">{label}</p>
      <div className="h-2 rounded-full overflow-hidden" style={{ background: track }}><div className="h-full rounded-full" style={{ width: `${Math.min(100, pct)}%`, background: fg }} /></div>
    </div>
  );
}

function ChartCard({ title, right, children, note }: { title: string; right?: React.ReactNode; children: React.ReactNode; note?: string }) {
  return (
    <div className="dc-card p-5">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4"><h2 className="font-display text-base font-bold">{title}</h2>{right}</div>
      {children}
      {note && <p className="text-xs dc-muted mt-2">{note}</p>}
    </div>
  );
}

function greeting(): string {
  const h = new Date(Date.now() + DHAKA_OFFSET_MS).getUTCHours();
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}

export default async function AdminDashboard({ searchParams }: { searchParams?: { range?: string; from?: string; to?: string } }) {
  const custom = !!(searchParams?.from && searchParams?.to);
  const rangeDays = custom ? 30 : [1, 7, 30].includes(Number(searchParams?.range)) ? Number(searchParams?.range) : 1;
  const stats = await getStats(rangeDays, searchParams?.from, searchParams?.to);
  const activeTab = (custom ? "custom" : String(rangeDays)) as "1" | "7" | "30" | "custom";

  // Owner name from the signed-in email local part (if it looks like a name).
  let name = "";
  try {
    const sb = getSupabaseServerClient();
    const { data: { user } } = await sb.auth.getUser();
    const lp = (user?.email || "").split("@")[0];
    if (lp && /^[a-zA-Z][a-zA-Z._-]{1,20}$/.test(lp) && !/\d/.test(lp)) name = lp.split(/[._-]/)[0].replace(/^\w/, (c) => c.toUpperCase());
  } catch {}

  const rangeSuffix = custom ? "vs prev period" : rangeDays === 1 ? "vs yesterday" : `vs prev ${rangeDays}d`;
  const maxArea = Math.max(1, ...stats.topAreas.map((a) => a.orders));

  return (
    <div>
      <AutoRefresh seconds={30} />

      {/* Desktop-only greeting (mobile uses the sticky top bar) */}
      <div className="hidden md:block mb-4">
        <h1 className="font-display text-2xl font-bold tracking-tight">{greeting()}{name ? `, ${name}` : ""} 👋</h1>
        <p className="text-[13px] dc-muted mt-0.5">Here&apos;s what&apos;s happening today</p>
      </div>

      <RangeTabs active={activeTab} from={searchParams?.from} to={searchParams?.to} />

      {/* KPI grid */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-2.5 sm:gap-3">
        <StatCard icon="eye" iconBg="#e9eefe" iconFg="#3f6fe0" num={stats.visitorsCur} label="Visitors" delta={stats.visitorsDelta} deltaSuffix={rangeSuffix} />
        <StatCard icon="orders" iconBg="#e6f4fb" iconFg="#2f80b4" num={stats.total} label="Orders" delta={stats.ordersDelta} deltaSuffix={rangeSuffix} />
        <StatCard icon="money" iconBg="#dff3e6" iconFg="#16a34a" num={taka(stats.revenueCur)} label="Revenue" delta={stats.revenueDelta} deltaSuffix={rangeSuffix} tint="#effaf2" />
        <StatCard icon="clock" iconBg="#fdeede" iconFg="#e08a2b" num={stats.pending} label="Pending Orders" badge={stats.pending > 0 ? "⚠ Needs attention" : "✓ All clear"} badgeColor={stats.pending > 0 ? "#e08a2b" : "#16a34a"} href="/admin/orders?status=pending" />
        <StatCard icon="abandoned" iconBg="#fdeef4" iconFg="#d6558a" num={stats.abandoned} label="Abandoned Leads" badge={stats.abandoned > 0 ? "Follow up" : "None"} badgeColor={stats.abandoned > 0 ? "#d6558a" : "#16a34a"} href="/admin/abandoned" />
        <StatCard icon="box" iconBg="#efeafc" iconFg="#6d5ae6" num={stats.products} label="Total Products" badge="● Active" badgeColor="#16a34a" href="/admin/products" />
      </div>

      {/* Orders (since reset) — product cards with progress */}
      <div className="mt-5 dc-card p-4">
        <div className="flex items-center justify-between gap-2 mb-3">
          <h2 className="font-display text-base font-bold">Orders <span className="text-xs dc-muted font-medium">{stats.resetActive ? `(since ${stats.resetTimeLabel})` : "(today)"}</span></h2>
          <div className="flex items-center gap-2">
            <a href="/admin/orders" className="text-[13px] font-semibold" style={{ color: "var(--a-violet)" }}>View all</a>
            <ResetDailyButton />
          </div>
        </div>
        {stats.todayProducts.length === 0 ? (
          <p className="text-sm dc-muted">No orders yet today.</p>
        ) : (
          <div className="flex gap-3 overflow-x-auto pb-1 dc-scroll-x">
            {stats.todayProducts.map((p) => (
              <div key={p.name} className="flex-none w-32 rounded-2xl border overflow-hidden" style={{ borderColor: "var(--a-border)" }}>
                <div className="relative h-24" style={{ background: "var(--a-surface-2)" }}>
                  {p.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.image} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <span className="absolute inset-0 flex items-center justify-center text-[10px] dc-muted">No image</span>
                  )}
                  <span className="absolute top-1.5 right-1.5 h-6 min-w-6 px-1.5 rounded-full text-white text-xs font-extrabold flex items-center justify-center tabular-nums" style={{ background: "var(--a-violet)" }}>{p.orders}</span>
                </div>
                <div className="p-2.5">
                  <p className="text-xs font-bold truncate">{p.name}</p>
                  <p className="text-xs dc-muted mb-1.5">{taka(p.value)}</p>
                  <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "var(--a-surface-2)" }}>
                    <div className="h-full rounded-full" style={{ width: `${p.pct}%`, background: "linear-gradient(90deg, var(--a-violet), #9b8ff0)" }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Rates */}
      <div className="mt-4 grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
        <Meter label="Confirm rate" pct={stats.confirmRate} icon="check" fg="#16a34a" bg="#e7f6ec" track="#e7f6ec" />
        <Meter label="Delivery rate" pct={stats.deliveryRate} icon="truck" fg="#2f80b4" bg="#e6f4fb" track="#e6f4fb" />
        <Meter label="Cancel rate" pct={stats.cancelRate} icon="close" fg="#dc2626" bg="#fdeaea" track="#fdeaea" />
        <StatCard icon="tag" iconBg="#f0e9fc" iconFg="#7c3aed" num={taka(stats.aov)} label="Avg order (AOV)" />
      </div>

      {/* Charts */}
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <ChartCard title="Daily orders (by status)" note="Orders per day by status. Hover a bar for details."><OrdersStatusChart data={stats.chart} /></ChartCard>
        <ChartCard title="Daily sales (৳)" right={<span className="text-sm dc-muted"><b>{taka(stats.revenueCur)}</b></span>} note="Hover the line for that day's sales."><RevenueChart data={stats.chart} /></ChartCard>
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <ChartCard title="Daily visitors" right={<span className="text-sm dc-muted"><b>{stats.visitorsCur}</b></span>} note="Unique visitors per day."><VisitorsChart data={stats.visitorsChart} /></ChartCard>
        <ChartCard title="Top areas (orders)" note="Areas with the most orders in this range.">
          {stats.topAreas.length === 0 ? <p className="text-sm dc-muted">No data yet.</p> : (
            <ul className="space-y-2.5 text-sm">
              {stats.topAreas.map((a) => (
                <li key={a.name}>
                  <div className="flex justify-between mb-1"><span className="truncate pr-2">{a.name}</span><span className="dc-muted shrink-0">{a.orders} orders · {taka(a.revenue)}</span></div>
                  <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "var(--a-surface-2)" }}><div className="h-full rounded-full" style={{ width: `${Math.round((a.orders / maxArea) * 100)}%`, background: "var(--a-brand)" }} /></div>
                </li>
              ))}
            </ul>
          )}
        </ChartCard>
      </div>
      <div className="mt-4">
        <ChartCard title="Visitors by time of day" right={<span className="text-sm"><span className="dc-muted">Peak: </span><b className="text-green-600">{stats.peakLabel}</b>{stats.peakVisits > 0 && <span className="dc-muted"> ({stats.peakVisits})</span>}</span>} note="When most visitors arrive (green = peak hour). Hover a bar for details.">
          <VisitorsByHourChart data={stats.hourly} peakHour={stats.peakHour} />
        </ChartCard>
      </div>

      {/* Low stock + top products */}
      <div className="mt-4 grid md:grid-cols-2 gap-4">
        <div className="dc-card p-5">
          <h2 className="font-display text-base font-bold mb-3">Low stock products</h2>
          {stats.lowStock.length === 0 ? <p className="text-sm dc-muted">All products are well stocked.</p> : (
            <ul className="space-y-2 text-sm">
              {stats.lowStock.map((p: any) => (
                <li key={p.id} className="flex justify-between items-center"><span className="truncate pr-2">{p.name_bn || p.name_en}</span><span className={"rounded-full px-2 py-0.5 text-xs font-medium " + (p.stock === 0 ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700")}>{p.stock} left</span></li>
              ))}
            </ul>
          )}
        </div>
        <div className="dc-card p-5">
          <h2 className="font-display text-base font-bold mb-3">Top products (sold)</h2>
          {stats.topProducts.length === 0 ? <p className="text-sm dc-muted">No sales yet.</p> : (
            <ul className="space-y-2.5 text-sm">
              {stats.topProducts.map(([nm, qty], i) => {
                const max = stats.topProducts[0][1] || 1;
                return (
                  <li key={nm}>
                    <div className="flex justify-between mb-1"><span className="truncate pr-2">{i + 1}. {nm}</span><span className="dc-muted shrink-0">{qty} pcs</span></div>
                    <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "var(--a-surface-2)" }}><div className="h-full rounded-full" style={{ width: `${Math.round((qty / max) * 100)}%`, background: "var(--a-brand)" }} /></div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      {/* Recent orders */}
      <div className="mt-6 flex items-center justify-between mb-3">
        <h2 className="font-display text-base font-bold">Recent orders</h2>
        <a href="/admin/orders" className="text-sm font-medium hover:underline" style={{ color: "var(--a-brand)" }}>All orders →</a>
      </div>
      <div className="overflow-x-auto dc-card">
        <table className="w-full text-sm">
          <thead className="text-left dc-muted" style={{ background: "var(--a-surface-2)" }}>
            <tr><th className="px-4 py-3 font-medium">Order no</th><th className="px-4 py-3 font-medium">Customer</th><th className="px-4 py-3 font-medium">Status</th><th className="px-4 py-3 font-medium text-right">Total</th></tr>
          </thead>
          <tbody>
            {stats.recent.map((o) => {
              const m = STATUS_META[o.status] ?? { label: o.status, bg: "var(--a-surface-2)", fg: "var(--a-muted)" };
              return (
                <tr key={o.id} className="border-t" style={{ borderColor: "var(--a-border)" }}>
                  <td className="px-4 py-3"><a href={`/admin/orders/${o.id}`} className="font-medium hover:underline" style={{ color: "var(--a-brand)" }}>{o.order_number}</a></td>
                  <td className="px-4 py-3">{o.customer_name}</td>
                  <td className="px-4 py-3"><span className="rounded-full px-2 py-0.5 text-xs font-semibold" style={{ background: m.bg, color: m.fg }}>{m.label}</span></td>
                  <td className="px-4 py-3 text-right font-medium tabular-nums">{taka(Number(o.total))}</td>
                </tr>
              );
            })}
            {stats.recent.length === 0 && (<tr><td colSpan={4} className="px-4 py-8 text-center dc-muted">No orders yet.</td></tr>)}
          </tbody>
        </table>
      </div>
    </div>
  );
}
