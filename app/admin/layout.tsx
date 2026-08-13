import { getSupabaseServerClient } from "@/lib/supabase/ssr-server";
import { getServerSupabase } from "@/lib/supabase/server";
import { SignOutButton } from "./SignOutButton";
import { AdminLive } from "@/components/admin/AdminLive";
import { AdminNav, type NavItem } from "@/components/admin/AdminNav";
import { STORE_NAME } from "@/lib/config";

export const dynamic = "force-dynamic";

const NAV = [
  { href: "/admin", label: "🏠 ড্যাশবোর্ড" },
  { href: "/admin/landing", label: "🎨 ল্যান্ডিং পেজ" },
  { href: "/admin/products", label: "📦 পণ্য" },
  { href: "/admin/categories", label: "🗂️ ক্যাটাগরি" },
  { href: "/admin/orders", label: "🧾 অর্ডার", badgeKey: "bookedDue" },
  { href: "/admin/print-station", label: "🖨️ প্রিন্ট স্টেশন" },
  { href: "/admin/abandoned", label: "🛒 অসম্পূর্ণ অর্ডার", badgeKey: "abandoned" },
  { href: "/admin/customers", label: "👥 গ্রাহক" },
  { href: "/admin/sms", label: "✉️ এসএমএস" },
  { href: "/admin/tracking", label: "📊 ট্র্যাকিং হেলথ" },
  { href: "/admin/settings", label: "⚙️ সেটিংস" },
];

/** Count of open abandoned leads for the nav badge (0 if table not yet created). */
async function getAbandonedCount(): Promise<number> {
  try {
    const supabase = getServerSupabase();
    const { count } = await supabase
      .from("abandoned_carts")
      .select("id", { count: "exact", head: true })
      .eq("status", "abandoned");
    return count ?? 0;
  } catch {
    return 0;
  }
}

/** Count of booked orders due within 3 days / overdue (0 if migration 5 not run). */
async function getBookedDueCount(): Promise<number> {
  try {
    const supabase = getServerSupabase();
    const cutoff = new Date(Date.now() + 6 * 3600 * 1000 + 3 * 86400000).toISOString().slice(0, 10);
    const { count } = await supabase
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("is_booked", true)
      .not("booked_date", "is", null)
      .lte("booked_date", cutoff)
      .not("status", "in", "(delivered,cancelled,returned)");
    return count ?? 0;
  } catch {
    return 0;
  }
}

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // The login page renders without the shell.
  if (!user) {
    // middleware normally redirects; this is a fallback for direct render.
    return <>{children}</>;
  }

  const [abandonedCount, bookedDueCount] = await Promise.all([getAbandonedCount(), getBookedDueCount()]);
  const badges: Record<string, number> = { abandoned: abandonedCount, bookedDue: bookedDueCount };
  const navItems: NavItem[] = NAV.map((n) => ({
    href: n.href,
    label: n.label,
    badge: (n as any).badgeKey ? badges[(n as any).badgeKey] : undefined,
  }));

  return (
    <div className="grid md:grid-cols-[230px_1fr] gap-5">
      <aside className="md:sticky md:top-6 h-fit rounded-2xl border border-black/5 bg-white p-4 shadow-sm">
        <div className="flex items-center gap-2 mb-4 pb-4 border-b border-black/5">
          <span className="h-9 w-9 rounded-xl bg-gradient-to-br from-brand to-accent text-white flex items-center justify-center font-bold shadow-sm">
            {STORE_NAME.charAt(0)}
          </span>
          <div className="min-w-0">
            <p className="font-display font-bold text-brand-dark leading-tight truncate">{STORE_NAME}</p>
            <p className="text-[11px] text-gray-400 truncate">{user.email}</p>
          </div>
        </div>

        <AdminNav items={navItems} />

        <div className="mt-4 pt-4 border-t border-black/5">
          <SignOutButton />
        </div>
      </aside>

      <section className="min-w-0">{children}</section>

      {/* Live updates + new-order sound/toast (client) */}
      <AdminLive />
    </div>
  );
}
