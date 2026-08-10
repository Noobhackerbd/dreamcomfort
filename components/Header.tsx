"use client";

import { useEffect, useState } from "react";
import { useCart } from "@/lib/cart/store";
import { STORE_NAME } from "@/lib/config";

export function Header({ logoUrl }: { logoUrl?: string }) {
  const count = useCart((s) => s.count());
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <header className="site-header bg-cream/80 backdrop-blur border-b border-black/5">
      <div className="mx-auto max-w-6xl px-4 h-16 flex items-center justify-between">
        <a href="/" className="flex items-center gap-2">
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoUrl} alt={STORE_NAME} className="h-10 w-auto object-contain" />
          ) : (
            <span className="font-display text-xl font-bold">
              <span className="text-brand">DREAM</span> <span className="text-accent">COMFORT</span>
            </span>
          )}
        </a>
        <nav className="flex items-center gap-5 text-sm">
          <a href="/" className="hover:text-brand">হোম</a>
          <a href="/track-order" className="hover:text-brand">অর্ডার ট্র্যাক</a>
          <a
            href="/cart"
            className="relative rounded-full bg-brand text-white px-4 py-1.5"
          >
            কার্ট
            {mounted && count > 0 && (
              <span className="absolute -top-2 -right-2 bg-accent text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                {count}
              </span>
            )}
          </a>
        </nav>
      </div>
    </header>
  );
}
