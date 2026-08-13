"use client";

// components/admin/AdminNav.tsx — admin sidebar navigation with active highlight.
import Link from "next/link";
import { usePathname } from "next/navigation";

export interface NavItem {
  href: string;
  label: string;
  badge?: number;
}

export function AdminNav({ items }: { items: NavItem[] }) {
  const pathname = usePathname();
  const isActive = (href: string) =>
    href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);

  return (
    <nav className="flex md:flex-col gap-1.5 overflow-x-auto md:overflow-visible -mx-1 px-1 md:mx-0 md:px-0">
      {items.map((n) => {
        const active = isActive(n.href);
        return (
          <Link
            key={n.href}
            href={n.href}
            prefetch
            className={
              "shrink-0 md:shrink rounded-xl px-3 py-2 text-sm flex items-center justify-between gap-2 transition " +
              (active
                ? "bg-gradient-to-r from-brand to-brand-dark text-white shadow-sm font-medium"
                : "text-gray-600 hover:bg-brand-soft hover:text-brand-dark")
            }
          >
            <span className="whitespace-nowrap">{n.label}</span>
            {n.badge != null && n.badge > 0 && (
              <span
                className={
                  "inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-[11px] font-bold " +
                  (active ? "bg-white/25 text-white" : "bg-amber-500 text-white")
                }
              >
                {n.badge}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
