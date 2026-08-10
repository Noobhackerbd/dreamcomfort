"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { useCart } from "@/lib/cart/store";
import { STORE_NAME } from "@/lib/config";

export function Header({ logoUrl }: { logoUrl?: string }) {
  const count = useCart((s) => s.count());
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <header className="site-header bg-cream/80 backdrop-blur border-b border-black/5">
      <div className="mx-auto max-w-6xl px-3 sm:px-4 h-16 flex items-center justify-between gap-2">
        <a href="/" className="flex items-center gap-2 min-w-0">
          {logoUrl ? (
            <Image src={logoUrl} alt={STORE_NAME} width={160} height={40} priority sizes="160px" className="h-9 sm:h-10 w-auto object-contain" />
          ) : (
            <span className="font-display text-lg sm:text-xl font-bold whitespace-nowrap">
              <span className="text-brand">DREAM</span> <span className="text-accent">COMFORT</span>
            </span>
          )}
        </a>
        <nav className="flex items-center gap-3 sm:gap-5 text-sm shrink-0">
          <a href="/" className="hidden sm:inline hover:text-brand">হোম</a>
          <a href="/track-order" className="hover:text-brand whitespace-nowrap">অর্ডার ট্র্যাক</a>
          <a
            href="/cart"
            className="relative rounded-full bg-brand text-white px-3.5 sm:px-4 py-1.5 whitespace-nowrap"
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
