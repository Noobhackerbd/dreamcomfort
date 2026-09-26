import { redirect } from "next/navigation";
import { getCustomerSession } from "@/lib/customer-auth";
import { getMyOrders } from "./actions";
import { DashboardShell } from "@/components/account/DashboardShell";
import { taka } from "@/lib/format";
import { OrderStatusBadge } from "@/components/account/OrderStatusBadge";
import { getL } from "@/lib/i18n-server";

export const dynamic = "force-dynamic";
export const metadata = { title: "Dashboard" };

const CONFIRMED = new Set(["confirmed", "processing", "shipped", "delivered"]);

export default async function AccountOverview() {
  const { L } = getL();
  const session = await getCustomerSession();
  if (!session) redirect("/account/login");
  const { orders } = await getMyOrders();

  const total = orders.length;
  const delivered = orders.filter((o) => o.status === "delivered").length;
  const active = orders.filter((o) => o.status !== "delivered" && o.status !== "cancelled" && o.status !== "returned").length;
  const spent = orders.filter((o) => CONFIRMED.has(o.status)).reduce((s, o) => s + Number(o.total || 0), 0);
  const name = session.profile?.name || "";
  const recent = orders.slice(0, 5);

  const stats = [
    { label: L("Total Orders", "মোট অর্ডার"), value: String(total), c: "#2F90CC", icon: "M6 2h9l5 5v15H6zM14 2v6h6M9 13h6M9 17h6" },
    { label: L("Active", "চলমান"), value: String(active), c: "#f59e0b", icon: "M1 3h15v13H1zM16 8h4l3 3v5h-7M5.5 18.5a2.5 2.5 0 105 0M18.5 18.5a2.5 2.5 0 105 0" },
    { label: L("Delivered", "ডেলিভারড"), value: String(delivered), c: "#16a34a", icon: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10zM9 12l2 2 4-4" },
    { label: L("Total Spent", "মোট কেনাকাটা"), value: taka(spent), c: "#DE6699", icon: "M3 7h18v10H3zM3 11h18M7 15h3" },
  ];

  return (
    <DashboardShell active="overview" name={name} email={session.email || ""}>
      <div className="mb-4">
        <h1 className="font-display text-2xl font-bold text-gray-900">{L("Welcome", "স্বাগতম")}{name ? `, ${name.split(" ")[0]}` : ""} 👋</h1>
        <p className="mt-1 text-sm text-gray-500">{L("A summary of your orders and account.", "আপনার অর্ডার ও অ্যাকাউন্টের সারসংক্ষেপ।")}</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
        {stats.map((s) => (
          <div key={s.label} className="rounded-xl bg-white border border-black/[0.06] shadow-[0_1px_2px_rgba(0,0,0,0.04)] p-3">
            <span className="inline-grid place-items-center h-8 w-8 rounded-lg mb-2" style={{ background: `${s.c}14`, color: s.c }}>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d={s.icon} /></svg>
            </span>
            <p className="text-[20px] font-extrabold tracking-tight text-gray-900 tabular-nums leading-none">{s.value}</p>
            <p className="mt-1 text-[11.5px] text-gray-500">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Recent orders */}
      <div className="mt-5 rounded-2xl bg-white border border-black/[0.06] shadow-[0_1px_2px_rgba(0,0,0,0.04)] overflow-hidden">
        <div className="flex items-center justify-between px-4 sm:px-5 py-4 border-b border-black/5">
          <h2 className="font-semibold text-gray-900">{L("Recent Orders", "সাম্প্রতিক অর্ডার")}</h2>
          <a href="/account/orders" className="text-sm font-semibold text-brand-dark hover:underline">{L("See all", "সব দেখুন")}</a>
        </div>
        {recent.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <p className="text-gray-500">{L("No orders yet.", "এখনো কোনো অর্ডার নেই।")}</p>
            <a href="/products" className="mt-3 inline-block rounded-lg bg-brand text-white px-5 py-2.5 text-sm font-semibold hover:bg-brand-dark transition-colors">{L("Start shopping", "শপিং শুরু করুন")}</a>
          </div>
        ) : (
          <ul className="divide-y divide-black/5">
            {recent.map((o) => (
              <li key={o.id}>
                <a href={`/account/orders/${o.order_number}`} className="flex items-center gap-3 px-4 sm:px-5 py-3.5 hover:bg-brand-soft/40 transition-colors">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-sm text-gray-900 truncate">#{o.order_number}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{new Date(new Date(o.created_at).getTime() + 6 * 3600000).toISOString().slice(0, 10)}</p>
                  </div>
                  <OrderStatusBadge status={o.status} />
                  <p className="font-bold text-sm text-gray-900 whitespace-nowrap tabular-nums">{taka(Number(o.total))}</p>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4 text-gray-300 shrink-0"><path d="M9 6l6 6-6 6" /></svg>
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>
    </DashboardShell>
  );
}
