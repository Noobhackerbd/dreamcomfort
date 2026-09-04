import { getServerSupabase } from "@/lib/supabase/server";
import { taka } from "@/lib/format";
import { bdcourierConfigured } from "@/lib/bdcourier";
import { Icon } from "@/components/admin/icons";
import { CustomersExport } from "./CustomersExport";
import { CustomersList, type CustomerRow } from "./CustomersList";

export const dynamic = "force-dynamic";

/** Aggregate a customer's own order outcomes with your store (delivered vs cancelled). */
interface OwnStats { store: number; delivered: number; cancelled: number; lastAt: string | null }

export default async function AdminCustomers() {
  const supabase = getServerSupabase();

  const [{ data: customers, count }, bdcReady] = await Promise.all([
    supabase
      .from("customers")
      .select("*", { count: "exact" })
      .order("total_spent", { ascending: false })
      .limit(1000),
    bdcourierConfigured(),
  ]);

  // Per-customer outcome from YOUR orders (delivered vs cancelled/returned + last order date).
  const byPhone = new Map<string, OwnStats>();
  let ordersRes = await supabase
    .from("orders")
    .select("customer_phone, status, created_at")
    .is("deleted_at", null)
    .limit(20000);
  if (ordersRes.error && ((ordersRes.error as any).code === "42703" || /deleted_at/i.test(ordersRes.error.message || ""))) {
    ordersRes = await supabase.from("orders").select("customer_phone, status, created_at").limit(20000);
  }
  for (const o of (ordersRes.data ?? []) as any[]) {
    const ph = (o.customer_phone || "").trim();
    if (!ph) continue;
    const cur = byPhone.get(ph) || { store: 0, delivered: 0, cancelled: 0, lastAt: null };
    cur.store += 1;
    if (o.status === "delivered") cur.delivered += 1;
    else if (o.status === "cancelled" || o.status === "returned") cur.cancelled += 1;
    if (!cur.lastAt || String(o.created_at) > cur.lastAt) cur.lastAt = o.created_at;
    byPhone.set(ph, cur);
  }

  const rows: CustomerRow[] = (customers ?? []).map((c: any) => {
    const st = byPhone.get((c.phone || "").trim());
    return {
      id: c.id,
      name: c.name || "",
      phone: c.phone || "",
      email: c.email || "",
      totalOrders: Number(c.total_orders ?? 0),
      totalSpent: Number(c.total_spent ?? 0),
      createdAt: c.created_at ?? null,
      storeOrders: st?.store ?? 0,
      delivered: st?.delivered ?? 0,
      cancelled: st?.cancelled ?? 0,
      lastOrderAt: st?.lastAt ?? null,
    };
  });

  // Summary (from the loaded set — the highest-value customers).
  const totalCustomers = count ?? rows.length;
  const repeat = rows.filter((r) => r.totalOrders >= 2).length;
  const revenue = rows.reduce((n, r) => n + r.totalSpent, 0);
  const totalOrders = rows.reduce((n, r) => n + r.totalOrders, 0);
  const avgOrder = totalOrders > 0 ? Math.round(revenue / totalOrders) : 0;

  const cards = [
    { icon: "customers", label: "Total customers", value: totalCustomers.toLocaleString(), bg: "var(--a-violet-soft)", fg: "var(--a-violet)" },
    { icon: "refresh", label: "Repeat (2+ orders)", value: repeat.toLocaleString(), bg: "#e7f6ec", fg: "#16a34a" },
    { icon: "money", label: "Customer revenue", value: taka(revenue), bg: "#e8f0fe", fg: "#2563eb" },
    { icon: "trend", label: "Avg order value", value: taka(avgOrder), bg: "#fdeede", fg: "#c2792b" },
  ];

  return (
    <div>
      <div className="flex items-center justify-between gap-3 mb-4">
        <h1 className="text-2xl font-bold">Customers</h1>
        <CustomersExport />
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 mb-4">
        {cards.map((c) => (
          <div key={c.label} className="dc-card p-3 flex items-center gap-3">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg shrink-0" style={{ background: c.bg, color: c.fg }}>
              <Icon name={c.icon} className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="text-[17px] font-extrabold leading-tight truncate">{c.value}</p>
              <p className="text-[11px] dc-muted truncate">{c.label}</p>
            </div>
          </div>
        ))}
      </div>

      <CustomersList customers={rows} bdcReady={bdcReady} />
    </div>
  );
}
