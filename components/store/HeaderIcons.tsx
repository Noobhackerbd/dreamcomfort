"use client";

import { useEffect, useState } from "react";
import { useCart } from "@/lib/cart/store";

export function HeaderIcons() {
  const count = useCart((s) => s.count());
  const openDrawer = useCart((s) => s.openDrawer);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <button onClick={openDrawer} aria-label="Cart" title="Cart"
      className="relative shrink-0 h-9 w-9 grid place-items-center rounded-full text-gray-700 hover:bg-black/5 transition">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="h-[21px] w-[21px]"><path d="M6 6h15l-1.5 9h-12z" /><path d="M6 6L5 3H2" /><circle cx="9" cy="20" r="1.4" /><circle cx="18" cy="20" r="1.4" /></svg>
      {mounted && count > 0 && (
        <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 grid place-items-center rounded-full bg-accent-dark text-white text-[10px] font-bold tabular-nums">{count > 99 ? "99+" : count}</span>
      )}
    </button>
  );
}
