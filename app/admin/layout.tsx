import Link from "next/link";
import { getSupabaseServerClient } from "@/lib/supabase/ssr-server";
import { getServerSupabase } from "@/lib/supabase/server";
import { SignOutButton } from "./SignOutButton";
import { STORE_NAME } from "@/lib/config";

export const dynamic = "force-dynamic";

const NAV = [
  { href: "/admin", label: "ড্যাশবোর্ড" },
  { href: "/admin/landing", label: "ল্যান্ডিং পেজ" },
  { href: "/admin/products", label: "পণ্য" },
  { href: "/admin/categories", label: "ক্যাটাগরি" },
  { href: "/admin/orders", label: "অর্ডার", badgeKey: "bookedDue" },
  { href: "/admin/abandoned", label: "অসম্পূর্ণ অর্ডার", badgeKey: "abandoned" },
  { href: "/admin/customers", label: "গ্রাহক" },
  { href: "/admin/sms", label: "এসএমএস" },
  { href: "/admin/tracking", label: "ট্র্যাকিং হেলথ" },
  { href: "/admin/settings", label: "সেটিংস" },
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

  return (
    <div className="grid md:grid-cols-[220px_1fr] gap-6">
      <aside className="md:sticky md:top-20 h-fit rounded-xl border bg-white p-4">
        <p className="font-bold text-brand mb-1">{STORE_NAME}</p>
        <p className="text-xs text-gray-400 mb-4 truncate">{user.email}</p>
        <nav className="flex md:flex-col gap-2 flex-wrap">
          {NAV.map((n) => {
            const badge = (n as any).badgeKey ? badges[(n as any).badgeKey] : 0;
            return (
              <Link
                key={n.href}
                href={n.href}
                prefetch
                className="rounded-lg px-3 py-2 text-sm hover:bg-gray-100 flex items-center justify-between gap-2"
              >
                <span>{n.label}</span>
                {badge > 0 && (
                  <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-amber-500 text-white text-[11px] font-bold">
                    {badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
        <div className="mt-4 pt-4 border-t">
          <SignOutButton />
        </div>
      </aside>

      <section className="min-w-0">{children}</section>
    </div>
  );
}
