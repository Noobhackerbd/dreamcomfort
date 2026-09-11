import { redirect } from "next/navigation";
import { getCustomerSession } from "@/lib/customer-auth";
import { getMyOrders } from "./actions";
import { DashboardShell } from "@/components/account/DashboardShell";
import { taka } from "@/lib/format";
import { OrderStatusBadge } from "@/components/account/OrderStatusBadge";

export const dynamic = "force-dynamic";
export const metadata = { title: "ড্যাশবোর্ড" };

const CONFIRMED = new Set(["confirmed", "processing", "shipped", "delivered"]);

export default async function AccountOverview() {
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
    { label: "মোট অর্ডার", value: String(total) },
    { label: "চলমান", value: String(active) },
    { label: "ডেলিভারড", value: String(delivered) },
    { label: "মোট কেনাকাটা", value: taka(spent) },
  ];

  return (
    <DashboardShell active="overview" name={name} email={session.email || ""}>
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold text-gray-900">স্বাগতম{name ? `, ${name.split(" ")[0]}` : ""} 👋</h1>
        <p className="mt-1 text-sm text-gray-500">আপনার অর্ডার ও অ্যাকাউন্টের সারসংক্ষেপ।</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {stats.map((s) => (
          <div key={s.label} className="rounded-2xl bg-white ring-1 ring-black/5 shadow-sm p-4">
            <p className="text-[22px] font-extrabold tracking-tight text-gray-900 tabular-nums">{s.value}</p>
            <p className="mt-1 text-[12px] text-gray-500">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 rounded-3xl bg-white ring-1 ring-black/5 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-black/5">
          <h2 className="font-semibold text-gray-900">সাম্প্রতিক অর্ডার</h2>
          <a href="/account/orders" className="text-sm font-medium text-brand hover:underline">সব দেখুন</a>
        </div>
        {recent.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <p className="text-gray-500">এখনো কোনো অর্ডার নেই।</p>
            <a href="/products" className="mt-3 inline-block rounded-xl bg-brand text-white px-5 py-2.5 text-sm font-semibold hover:bg-brand-dark">শপিং শুরু করুন</a>
          </div>
        ) : (
          <ul className="divide-y divide-black/5">
            {recent.map((o) => (
              <li key={o.id}>
                <a href={`/account/orders/${o.order_number}`} className="flex items-center gap-3 px-5 py-3.5 hover:bg-gray-50 transition">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-sm text-gray-900">#{o.order_number}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{new Date(new Date(o.created_at).getTime() + 6 * 3600000).toISOString().slice(0, 10)}</p>
                  </div>
                  <OrderStatusBadge status={o.status} />
                  <p className="font-bold text-sm text-gray-900 whitespace-nowrap">{taka(Number(o.total))}</p>
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>
    </DashboardShell>
  );
}
