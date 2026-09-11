"use client";

import { useEffect, useState } from "react";
import { useCart } from "@/lib/cart/store";
import { PredictiveSearch } from "@/components/store/PredictiveSearch";

export function HeaderIcons() {
  const count = useCart((s) => s.count());
  const openDrawer = useCart((s) => s.openDrawer);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <div className="flex items-center gap-1">
      <PredictiveSearch />
      <a href="/account" aria-label="Account" title="Account"
        className="h-10 w-10 grid place-items-center rounded-full text-gray-700 hover:bg-black/5 transition">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="h-[21px] w-[21px]"><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 4-6 8-6s8 2 8 6" /></svg>
      </a>
      <button onClick={openDrawer} aria-label="Cart" title="Cart"
        className="relative h-10 w-10 grid place-items-center rounded-full text-gray-700 hover:bg-black/5 transition">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="h-[21px] w-[21px]"><path d="M6 6h15l-1.5 9h-12z" /><path d="M6 6L5 3H2" /><circle cx="9" cy="20" r="1.4" /><circle cx="18" cy="20" r="1.4" /></svg>
        {mounted && count > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 grid place-items-center rounded-full bg-accent-dark text-white text-[10px] font-bold tabular-nums">{count > 99 ? "99+" : count}</span>
        )}
      </button>
    </div>
  );
}
