import { getServerSupabase } from "@/lib/supabase/server";
import { taka } from "@/lib/format";
import { Icon } from "@/components/admin/icons";
import { RegisteredList, type RegisteredRow } from "./RegisteredList";

export const dynamic = "force-dynamic";

/** 10-digit subscriber core, so 01…/88…/+88… all group together. */
function coreOf(p: string): string {
  let d = (p || "").replace(/\D/g, "");
  if (d.startsWith("88")) d = d.slice(2);
  if (d.startsWith("0")) d = d.slice(1);
  return d;
}

interface OwnStats { orders: number; delivered: number; cancelled: number; spent: number; lastAt: string | null }

export default async function RegisteredCustomers() {
  const svc = getServerSupabase();

  // 1) Registered accounts (profiles). select * so admin_notes/admin_tags flow through when migrated.
  const { data: profiles } = await svc
    .from("customer_profiles")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(2000);

  // 2) Order outcomes grouped by phone core (delivered / cancelled / spent / last date).
  const byCore = new Map<string, OwnStats>();
  let ordersRes = await svc.from("orders").select("customer_phone, status, total, created_at").is("deleted_at", null).limit(20000);
  if (ordersRes.error && ((ordersRes.error as any).code === "42703" || /deleted_at/i.test(ordersRes.error.message || ""))) {
    ordersRes = await svc.from("orders").select("customer_phone, status, total, created_at").limit(20000);
  }
  const CONFIRMED = new Set(["confirmed", "processing", "shipped", "delivered"]);
  for (const o of (ordersRes.data ?? []) as any[]) {
    const key = coreOf(o.customer_phone || "");
    if (key.length < 9) continue;
    const cur = byCore.get(key) || { orders: 0, delivered: 0, cancelled: 0, spent: 0, lastAt: null };
    cur.orders += 1;
    if (o.status === "delivered") cur.delivered += 1;
    else if (o.status === "cancelled" || o.status === "returned") cur.cancelled += 1;
    if (CONFIRMED.has(o.status)) cur.spent += Number(o.total || 0);
    if (!cur.lastAt || String(o.created_at) > cur.lastAt) cur.lastAt = o.created_at;
    byCore.set(key, cur);
  }

  // 3) Wishlist + address counts by account id.
  const wishCount = new Map<string, number>();
  const { data: wl } = await svc.from("customer_wishlist").select("user_id").limit(20000);
  for (const w of (wl ?? []) as any[]) wishCount.set(w.user_id, (wishCount.get(w.user_id) || 0) + 1);
  const addrCount = new Map<string, number>();
  const { data: ad } = await svc.from("customer_addresses").select("user_id").limit(20000);
  for (const a of (ad ?? []) as any[]) addrCount.set(a.user_id, (addrCount.get(a.user_id) || 0) + 1);

  // 4) Signup method + last login from Supabase Auth (best-effort, paginated).
  const authInfo = new Map<string, { method: string; lastSignInAt: string | null }>();
  try {
    for (let page = 1; page <= 5; page++) {
      const { data, error } = await (svc as any).auth.admin.listUsers({ page, perPage: 1000 });
      if (error) break;
      const users = data?.users ?? [];
      for (const u of users) {
        const prov = u.app_metadata?.provider || u.identities?.[0]?.provider || (u.phone ? "phone" : "email");
        authInfo.set(u.id, { method: String(prov), lastSignInAt: u.last_sign_in_at ?? null });
      }
      if (users.length < 1000) break;
    }
  } catch { /* admin API unavailable — signup method just shows as unknown */ }

  const rows: RegisteredRow[] = ((profiles ?? []) as any[]).map((c) => {
    const st = byCore.get(coreOf(c.phone || ""));
    return {
      id: c.id,
      name: c.name || "",
      phone: c.phone || "",
      email: c.email || "",
      createdAt: c.created_at ?? null,
      signupMethod: authInfo.get(c.id)?.method || "email",
      lastSignInAt: authInfo.get(c.id)?.lastSignInAt ?? null,
      orders: st?.orders ?? 0,
      delivered: st?.delivered ?? 0,
      cancelled: st?.cancelled ?? 0,
      spent: st?.spent ?? 0,
      lastOrderAt: st?.lastAt ?? null,
      wishlist: wishCount.get(c.id) ?? 0,
      addresses: addrCount.get(c.id) ?? 0,
      adminNotes: c.admin_notes ?? "",
      adminTags: Array.isArray(c.admin_tags) ? c.admin_tags : [],
    };
  });

  const totalReg = rows.length;
  const withOrders = rows.filter((r) => r.orders > 0).length;
  const repeat = rows.filter((r) => r.orders >= 2).length;
  const revenue = rows.reduce((n, r) => n + r.spent, 0);

  const cards = [
    { icon: "customers", label: "Registered accounts", value: totalReg.toLocaleString(), bg: "var(--a-violet-soft)", fg: "var(--a-violet)" },
    { icon: "check", label: "Have ordered", value: `${withOrders} / ${totalReg}`, bg: "#e7f6ec", fg: "#16a34a" },
    { icon: "refresh", label: "Repeat (2+)", value: repeat.toLocaleString(), bg: "#e8f0fe", fg: "#2563eb" },
    { icon: "money", label: "Revenue from members", value: taka(revenue), bg: "#fdeede", fg: "#c2792b" },
  ];

  return (
    <div>
      <div className="flex items-center justify-between gap-3 mb-1">
        <h1 className="text-2xl font-bold">Registered Customers</h1>
      </div>
      <p className="text-xs dc-muted mb-4">People who created an account (email, Google, Facebook or phone) — your highest-value, remarketable segment.</p>

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

      <RegisteredList customers={rows} />
    </div>
  );
}
