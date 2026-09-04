import { Plus_Jakarta_Sans, Hind_Siliguri } from "next/font/google";
import { getSupabaseServerClient } from "@/lib/supabase/ssr-server";
import { getServerSupabase } from "@/lib/supabase/server";
import { SignOutButton } from "./SignOutButton";
import { AdminLive } from "@/components/admin/AdminLive";
import { AdminNav, type NavItem } from "@/components/admin/AdminNav";
import { AdminMobileBar } from "@/components/admin/AdminMobileBar";
import { AdminTabBar } from "@/components/admin/AdminTabBar";
import { GlobalSearch } from "@/components/admin/GlobalSearch";
import { NotificationBell } from "./NotificationBell";
import type { BookedItem } from "./BookedReminders";
import { STORE_NAME } from "@/lib/config";

export const dynamic = "force-dynamic";

// Premium, refined typography — scoped to the admin only (storefront keeps its
// playful Fredoka). Jakarta for Latin/numbers, Hind Siliguri for Bangla.
const adminLatin = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-admin-latin",
  display: "swap",
});
const adminBangla = Hind_Siliguri({
  subsets: ["bengali"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-admin-bn",
  display: "swap",
});

// Design system — a single premium, minimal light theme. Tokens + shared component
// classes, scoped to .admin-shell so the storefront is untouched.
const ADMIN_CSS = `
  .admin-shell{
    --a-bg:#fbf3ea; --a-surface:#ffffff; --a-surface-2:#f6f2ec;
    --a-border:#ececeb; --a-border-2:#f1f1f0;
    --a-text:#1b1b1a; --a-muted:#8a8a86; --a-faint:#b7b7b2;
    --a-accent:#111827; --a-accent-fg:#ffffff; --a-accent-soft:#f2f4f7;
    --a-brand:#3E9BD1; --a-brand-soft:#eaf4fb;
    --a-coral:#ef6c3b; --a-coral-2:#e45c28; --a-coral-soft:#fdeadf; --a-peach:#fbe7db;
    --a-violet:#6d5ae6; --a-violet-soft:#efeafc;
    --a-warn:#b45309; --a-warn-soft:#fef3e6;
    --a-ok:#15803d; --a-ok-soft:#eaf6ee;
    --a-shadow:0 1px 2px rgba(17,24,39,.04);
    --a-shadow-lg:0 8px 30px -12px rgba(17,24,39,.14);
    background:var(--a-bg); color:var(--a-text); min-height:100vh;
    font-family:var(--font-admin-bn),var(--font-admin-latin),system-ui,sans-serif;
    -webkit-font-smoothing:antialiased; letter-spacing:-0.006em;
  }
  .admin-shell .font-display{font-family:var(--font-admin-latin),var(--font-admin-bn),system-ui,sans-serif;letter-spacing:-0.022em}
  .admin-shell h1{font-weight:600;letter-spacing:-0.022em}
  .admin-shell table{font-variant-numeric:tabular-nums}

  .admin-shell .dc-sidebar{background:var(--a-surface);border:1px solid var(--a-border);border-radius:16px;box-shadow:var(--a-shadow)}
  .admin-shell .dc-card{background:var(--a-surface);border:1px solid var(--a-border);border-radius:14px;box-shadow:var(--a-shadow)}
  .admin-shell .dc-muted{color:var(--a-muted)}
  .admin-shell .dc-mark{background:var(--a-surface-2);box-shadow:inset 0 0 0 1px var(--a-border);overflow:hidden}
  .admin-shell .dc-mark img{width:100%;height:100%;object-fit:cover}

  .admin-shell .dc-navlink{display:flex;align-items:center;justify-content:space-between;gap:.5rem;border-radius:10px;padding:.5rem .6rem;font-size:.875rem;color:var(--a-muted);text-decoration:none;transition:background .15s,color .15s}
  .admin-shell .dc-navlink:hover{background:var(--a-surface-2);color:var(--a-text)}
  .admin-shell .dc-navlink-active{background:var(--a-accent-soft);color:var(--a-text);font-weight:600}
  .admin-shell .dc-navbadge{display:inline-flex;align-items:center;justify-content:center;min-width:20px;height:20px;padding:0 6px;border-radius:999px;font-size:11px;font-weight:700;background:var(--a-warn-soft);color:var(--a-warn)}
  .admin-shell .dc-navbadge-active{background:var(--a-text);color:#fff}

  .admin-shell .dc-iconbtn{border:1px solid var(--a-border);background:var(--a-surface);color:var(--a-muted);transition:color .15s,border-color .15s}
  .admin-shell .dc-iconbtn:hover{color:var(--a-text);border-color:var(--a-faint)}

  /* Buttons */
  .admin-shell .dc-btn{display:inline-flex;align-items:center;gap:.4rem;border:1px solid var(--a-border);background:var(--a-surface);color:var(--a-text);border-radius:9px;padding:.4rem .7rem;font-size:.78rem;font-weight:500;transition:border-color .15s,background .15s}
  .admin-shell .dc-btn:hover{border-color:var(--a-faint);background:var(--a-surface-2)}
  .admin-shell .dc-btn-solid{background:var(--a-accent);border-color:var(--a-accent);color:var(--a-accent-fg)}
  .admin-shell .dc-btn-solid:hover{background:#000;border-color:#000}
  /* Square icon-only action button */
  .admin-shell .dc-ibtn{display:inline-flex;align-items:center;justify-content:center;height:32px;width:32px;border:1px solid var(--a-border);background:var(--a-surface);color:var(--a-muted);border-radius:9px;transition:color .15s,border-color .15s,background .15s;position:relative}
  .admin-shell .dc-ibtn:hover{color:var(--a-text);border-color:var(--a-faint);background:var(--a-surface-2)}
  .admin-shell .dc-ibtn:disabled{opacity:.5}
  /* Ghost icon action button (neutral; highlights on hover) — Option A */
  .admin-shell .dc-act{display:inline-flex;align-items:center;justify-content:center;height:32px;width:32px;border:none;background:transparent;color:var(--a-muted);border-radius:8px;position:relative;cursor:pointer;transition:background .15s,color .15s}
  .admin-shell .dc-act:hover{background:var(--a-surface-2);color:var(--a-text)}
  .admin-shell .dc-act:disabled{opacity:.5}
  .admin-shell .dc-act-sm{height:28px;width:28px;border-radius:7px}
  /* Soft tinted icon button (bg + color set inline per action) */
  .admin-shell .dc-softbtn{display:inline-flex;align-items:center;justify-content:center;height:34px;width:34px;border:none;border-radius:11px;transition:filter .15s,transform .05s;position:relative}
  .admin-shell .dc-softbtn:hover{filter:brightness(.96)}
  .admin-shell .dc-softbtn:active{transform:scale(.94)}
  .admin-shell .dc-softbtn:disabled{opacity:.55}
  /* Soft tinted pill (bg + color set inline) */
  .admin-shell .dc-softpill{display:inline-flex;align-items:center;gap:.3rem;border-radius:999px;padding:.28rem .6rem;font-size:12px;font-weight:600;line-height:1;transition:filter .15s}
  .admin-shell .dc-softpill:hover{filter:brightness(.97)}
  .admin-shell .dc-chip{display:inline-flex;align-items:center;gap:.3rem;border:1px solid var(--a-border);border-radius:999px;padding:.15rem .55rem;font-size:11px;font-weight:600;color:var(--a-muted);background:var(--a-surface)}
  .admin-shell .dc-pill{border-color:var(--a-border);color:var(--a-muted);background:var(--a-surface)}
  .admin-shell .dc-pill:hover{border-color:var(--a-faint);color:var(--a-text)}
  .admin-shell .dc-pill-active{border-color:var(--a-text)!important;background:var(--a-text);color:#fff}
  .admin-shell .dc-input{width:100%;background:var(--a-surface);border:1px solid var(--a-border);border-radius:10px;padding:.55rem .7rem;font-size:.875rem;color:var(--a-text);outline:none;transition:border-color .15s,box-shadow .15s}
  .admin-shell .dc-input:focus{border-color:var(--a-faint);box-shadow:0 0 0 3px var(--a-accent-soft)}

  .admin-shell .dc-coral{background:linear-gradient(135deg,#FB8B5E 0%,#F26A38 55%,#E45C28 100%);color:#fff}
  .admin-shell .dc-scroll-x{scrollbar-width:none;-ms-overflow-style:none}
  .admin-shell .dc-scroll-x::-webkit-scrollbar{display:none}
  .admin-shell .dc-skeleton{background:linear-gradient(90deg,var(--a-surface-2) 25%,var(--a-border-2) 37%,var(--a-surface-2) 63%);background-size:400% 100%;animation:dcShimmer 1.4s ease infinite;border-radius:8px}
  @keyframes dcShimmer{0%{background-position:100% 0}100%{background-position:-100% 0}}
`;

const NAV = [
  { href: "/admin", label: "Dashboard", icon: "dashboard" },
  { href: "/admin/landing", label: "Landing Page", icon: "landing" },
  { href: "/admin/products", label: "Products", icon: "products" },
  { href: "/admin/categories", label: "Categories", icon: "categories" },
  { href: "/admin/orders", label: "Orders", icon: "orders", badgeKey: "bookedDue" },
  { href: "/admin/print-station", label: "Print Station", icon: "print" },
  { href: "/admin/abandoned", label: "Abandoned Carts", icon: "abandoned", badgeKey: "abandoned" },
  { href: "/admin/customers", label: "Customers", icon: "customers" },
  { href: "/admin/workers", label: "Workers", icon: "workers" },
  { href: "/admin/sms", label: "SMS", icon: "sms" },
  { href: "/admin/tracking", label: "Tracking Health", icon: "tracking" },
  { href: "/admin/settings", label: "Settings", icon: "settings" },
];

interface Notif { booked: BookedItem[]; pending: number; abandoned: number; lowStock: number }

/** Shared admin notifications: booked reminders (due/overdue), pending orders,
 *  abandoned carts, low-stock products. Resilient to missing tables/columns. */
async function getNotifications(): Promise<Notif> {
  const supabase = getServerSupabase();
  const today = new Date(Date.now() + 6 * 3600 * 1000).toISOString().slice(0, 10);
  const cutoff = new Date(Date.now() + 6 * 3600 * 1000 + 3 * 86400000).toISOString().slice(0, 10);
  const empty: Notif = { booked: [], pending: 0, abandoned: 0, lowStock: 0 };
  try {
    const [bookedRes, pendingRes, abandonedRes, lowStockRes] = await Promise.all([
      supabase.from("orders").select("id, order_number, customer_name, customer_phone, booked_date, total")
        .eq("is_booked", true).not("booked_date", "is", null).lte("booked_date", cutoff)
        .not("status", "in", "(delivered,cancelled,returned)").order("booked_date", { ascending: true }).limit(60),
      supabase.from("orders").select("id", { count: "exact", head: true }).eq("status", "pending"),
      supabase.from("abandoned_carts").select("id", { count: "exact", head: true }).eq("status", "abandoned"),
      supabase.from("products").select("id", { count: "exact", head: true }).lte("stock", 5),
    ]);
    const booked: BookedItem[] = ((bookedRes.data ?? []) as any[]).map((b) => ({
      id: b.id, order_number: b.order_number, name: b.customer_name ?? "", phone: b.customer_phone ?? "",
      date: b.booked_date, total: Number(b.total || 0), overdue: b.booked_date < today,
    }));
    return { booked, pending: pendingRes.count ?? 0, abandoned: abandonedRes.count ?? 0, lowStock: lowStockRes.count ?? 0 };
  } catch {
    return empty;
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

  const notif = await getNotifications();
  const badges: Record<string, number> = { abandoned: notif.abandoned, bookedDue: notif.booked.length };
  const navItems: NavItem[] = NAV.map((n) => ({
    href: n.href,
    label: n.label,
    icon: (n as any).icon,
    badge: (n as any).badgeKey ? badges[(n as any).badgeKey] : undefined,
  }));

  return (
    <div className={`${adminLatin.variable} ${adminBangla.variable} admin-shell md:grid md:grid-cols-[236px_1fr] md:gap-5 p-3 md:p-5`}>
      <style dangerouslySetInnerHTML={{ __html: ADMIN_CSS }} />

      {/* Mobile top bar (sticky, hidden on desktop) with notification bell */}
      <AdminMobileBar storeName={STORE_NAME} items={navItems} notif={notif} />

      {/* Desktop sidebar (hidden on mobile) */}
      <aside className="hidden md:flex md:flex-col md:sticky md:top-5 h-[calc(100vh-2.5rem)] dc-sidebar p-3.5">
        <div className="flex items-center gap-2.5 mb-4 pb-4 border-b" style={{ borderColor: "var(--a-border)" }}>
          <span className="h-9 w-9 rounded-xl dc-mark shrink-0">
            <img src="/admin-mark.png" alt={STORE_NAME} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-display font-bold leading-tight truncate">{STORE_NAME}</p>
            <p className="text-[11px] dc-muted truncate">{user.email}</p>
          </div>
          <NotificationBell booked={notif.booked} pending={notif.pending} abandoned={notif.abandoned} lowStock={notif.lowStock} />
        </div>

        <div className="flex-1 overflow-y-auto -mx-1 px-1">
          <AdminNav items={navItems} vertical />
        </div>

        <div className="mt-3 pt-3 border-t flex items-center justify-end" style={{ borderColor: "var(--a-border)" }}>
          <SignOutButton />
        </div>
      </aside>

      <section className="min-w-0 pb-24 md:pb-0">{children}</section>

      {/* Mobile bottom tab bar */}
      <AdminTabBar items={navItems} />

      {/* Floating global search (orders / products / customers) */}
      <GlobalSearch />

      {/* Live updates + new-order sound/toast (client) */}
      <AdminLive />
    </div>
  );
}
