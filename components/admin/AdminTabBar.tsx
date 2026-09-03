"use client";

// Mobile-only bottom tab bar (Dashboard / Orders / Products / More).
// "More" opens a drawer with the full navigation. Hidden on md+.

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AdminNav, type NavItem } from "./AdminNav";
import { Icon } from "./icons";
import { SignOutButton } from "@/app/admin/SignOutButton";

const PRIMARY = [
  { href: "/admin", label: "Dashboard", icon: "dashboard" },
  { href: "/admin/orders", label: "Orders", icon: "orders" },
  { href: "/admin/products", label: "Products", icon: "products" },
];

export function AdminTabBar({ items }: { items: NavItem[] }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  useEffect(() => { setOpen(false); }, [pathname]);
  useEffect(() => { document.body.style.overflow = open ? "hidden" : ""; return () => { document.body.style.overflow = ""; }; }, [open]);

  const isActive = (href: string) => (href === "/admin" ? pathname === "/admin" : pathname.startsWith(href));
  const moreActive = !PRIMARY.some((p) => isActive(p.href));

  return (
    <div className="md:hidden">
      <nav className="fixed bottom-0 inset-x-0 z-[70] flex justify-around px-2 pt-2 pb-[max(10px,env(safe-area-inset-bottom))]" style={{ background: "var(--a-surface)", borderTop: "1px solid var(--a-border)" }}>
        {PRIMARY.map((p) => {
          const on = isActive(p.href);
          return (
            <Link key={p.href} href={p.href} className="flex flex-col items-center gap-0.5 text-[10px] font-semibold" style={{ color: on ? "var(--a-violet)" : "var(--a-muted)" }}>
              <Icon name={p.icon} className="h-[22px] w-[22px]" />
              {p.label}
            </Link>
          );
        })}
        <button onClick={() => setOpen(true)} className="flex flex-col items-center gap-0.5 text-[10px] font-semibold" style={{ color: moreActive ? "var(--a-violet)" : "var(--a-muted)" }}>
          <span className="inline-flex h-[22px] w-[22px] items-center justify-center"><Icon name="menu" className="h-[22px] w-[22px]" /></span>
          More
        </button>
      </nav>

      {open && (
        <div className="fixed inset-0 z-[80]" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px]" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-0 h-full w-[84%] max-w-xs flex flex-col" style={{ animation: "dcDrawer .22s cubic-bezier(.22,1,.36,1)", background: "var(--a-surface)" }}>
            <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: "var(--a-border)" }}>
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="h-9 w-9 rounded-xl dc-mark shrink-0"><img src="/admin-mark.png" alt="" /></span>
                <p className="font-display font-semibold truncate">Menu</p>
              </div>
              <button onClick={() => setOpen(false)} aria-label="Close" className="h-9 w-9 rounded-lg dc-iconbtn flex items-center justify-center active:scale-95"><Icon name="close" className="h-5 w-5" /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-3"><AdminNav items={items} vertical /></div>
            <div className="p-4 border-t flex items-center justify-end" style={{ borderColor: "var(--a-border)" }}><SignOutButton /></div>
          </div>
          <style>{`@keyframes dcDrawer{from{transform:translateX(100%)}to{transform:none}}`}</style>
        </div>
      )}
    </div>
  );
}
