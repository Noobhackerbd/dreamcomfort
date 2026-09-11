import { redirect } from "next/navigation";
import { getCustomerSession } from "@/lib/customer-auth";
import { getMyOrders } from "../actions";
import { DashboardShell } from "@/components/account/DashboardShell";
import { OrderStatusBadge } from "@/components/account/OrderStatusBadge";
import { taka } from "@/lib/format";

export const dynamic = "force-dynamic";
export const metadata = { title: "আমার অর্ডার" };

export default async function MyOrdersPage() {
  const session = await getCustomerSession();
  if (!session) redirect("/account/login");
  const { orders } = await getMyOrders();
  const name = session.profile?.name || "";

  return (
    <DashboardShell active="orders" name={name} email={session.email || ""}>
      <div className="mb-5">
        <h1 className="font-display text-2xl font-bold text-gray-900">আমার অর্ডার</h1>
        <p className="mt-1 text-sm text-gray-500">{orders.length} টি অর্ডার</p>
      </div>

      {orders.length === 0 ? (
        <div className="rounded-3xl bg-white ring-1 ring-black/5 shadow-sm px-5 py-14 text-center">
          <p className="text-gray-500">এখনো কোনো অর্ডার নেই।</p>
          <a href="/products" className="mt-3 inline-block rounded-xl bg-brand text-white px-5 py-2.5 text-sm font-semibold hover:bg-brand-dark">শপিং শুরু করুন</a>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((o) => (
            <a key={o.id} href={`/account/orders/${o.order_number}`}
              className="flex items-center gap-4 rounded-2xl bg-white ring-1 ring-black/5 shadow-sm px-4 py-3.5 hover:ring-brand/30 hover:shadow transition">
              <div className="h-11 w-11 rounded-xl bg-brand-soft text-brand-dark grid place-items-center shrink-0">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="h-5 w-5"><path d="M6 2h9l5 5v15H6z" /><path d="M14 2v6h6" /></svg>
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-sm text-gray-900">#{o.order_number}</p>
                <p className="text-xs text-gray-400 mt-0.5">{new Date(new Date(o.created_at).getTime() + 6 * 3600000).toISOString().slice(0, 16).replace("T", " ")}</p>
              </div>
              <OrderStatusBadge status={o.status} />
              <p className="font-bold text-sm text-gray-900 whitespace-nowrap">{taka(Number(o.total))}</p>
            </a>
          ))}
        </div>
      )}
    </DashboardShell>
  );
}
