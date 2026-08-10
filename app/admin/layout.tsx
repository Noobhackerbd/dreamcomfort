import { getSupabaseServerClient } from "@/lib/supabase/ssr-server";
import { SignOutButton } from "./SignOutButton";
import { STORE_NAME } from "@/lib/config";

export const dynamic = "force-dynamic";

const NAV = [
  { href: "/admin", label: "ড্যাশবোর্ড" },
  { href: "/admin/landing", label: "ল্যান্ডিং পেজ" },
  { href: "/admin/products", label: "পণ্য" },
  { href: "/admin/categories", label: "ক্যাটাগরি" },
  { href: "/admin/orders", label: "অর্ডার" },
  { href: "/admin/customers", label: "গ্রাহক" },
  { href: "/admin/sms", label: "এসএমএস" },
  { href: "/admin/tracking", label: "ট্র্যাকিং হেলথ" },
  { href: "/admin/settings", label: "সেটিংস" },
];

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

  return (
    <div className="grid md:grid-cols-[220px_1fr] gap-6">
      <aside className="md:sticky md:top-20 h-fit rounded-xl border bg-white p-4">
        <p className="font-bold text-brand mb-1">{STORE_NAME}</p>
        <p className="text-xs text-gray-400 mb-4 truncate">{user.email}</p>
        <nav className="flex md:flex-col gap-2 flex-wrap">
          {NAV.map((n) => (
            <a
              key={n.href}
              href={n.href}
              className="rounded-lg px-3 py-2 text-sm hover:bg-gray-100"
            >
              {n.label}
            </a>
          ))}
        </nav>
        <div className="mt-4 pt-4 border-t">
          <SignOutButton />
        </div>
      </aside>

      <section className="min-w-0">{children}</section>
    </div>
  );
}
