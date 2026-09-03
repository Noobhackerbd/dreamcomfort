"use client";

// components/admin/AdminNav.tsx — admin sidebar navigation with active highlight + icons.
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "./icons";

export interface NavItem {
  href: string;
  label: string;
  icon?: string;
  badge?: number;
}

export function AdminNav({ items, vertical }: { items: NavItem[]; vertical?: boolean }) {
  const pathname = usePathname();
  const isActive = (href: string) =>
    href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);

  return (
    <nav
      className={
        vertical
          ? "flex flex-col gap-0.5"
          : "flex md:flex-col gap-0.5 overflow-x-auto md:overflow-visible -mx-1 px-1 md:mx-0 md:px-0"
      }
    >
      {items.map((n) => {
        const active = isActive(n.href);
        return (
          <Link
            key={n.href}
            href={n.href}
            prefetch
            className={"dc-navlink" + (active ? " dc-navlink-active" : "")}
          >
            <span className="flex items-center gap-2.5 min-w-0">
              <Icon name={n.icon ?? "dashboard"} className="h-[18px] w-[18px] shrink-0 opacity-90" />
              <span className="whitespace-nowrap truncate">{n.label}</span>
            </span>
            {n.badge != null && n.badge > 0 && (
              <span className={"dc-navbadge" + (active ? " dc-navbadge-active" : "")}>{n.badge}</span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
