"use client";

// ShoppingEngine — beat 04. Marketplace-grade browsing without leaving the page:
// real categories become instant client-side filters over a refined grid.

import { useMemo, useState } from "react";
import type { Product, Category } from "@/lib/types";
import { SoftProductCard } from "@/components/store/home/SoftProductCard";

const ALL = "__all__";
const BEST = "__best__";

export function ShoppingEngine({ products, categories }: { products: Product[]; categories: Category[] }) {
  const [tab, setTab] = useState<string>(ALL);

  const shown = useMemo(() => {
    if (tab === ALL) return products.slice(0, 8);
    if (tab === BEST) {
      return [...products].sort((a, b) => (b.review_count ?? 0) - (a.review_count ?? 0) || (b.rating ?? 0) - (a.rating ?? 0)).slice(0, 8);
    }
    return products.filter((p) => p.category_id === tab).slice(0, 8);
  }, [tab, products]);

  const tabs = [
    { id: ALL, label: "সব পণ্য" },
    ...categories.map((c) => ({ id: c.id, label: c.name_bn || c.name_en })),
    { id: BEST, label: "বেস্ট সেলার" },
  ];

  const activeCat = categories.find((c) => c.id === tab);
  const seeHref = activeCat ? `/products?category=${activeCat.slug}` : "/products";

  return (
    <section className="bg-ivory-warm">
      <div className="mx-auto max-w-6xl px-5 sm:px-6 py-16 sm:py-20">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <p className="sc-eyebrow text-blush-deep">০৪ — শপিং</p>
            <h2 className="mt-3 font-sans font-bold text-ink text-[26px] sm:text-[32px] leading-tight">মা ও শিশুর জন্য বেছে নিন</h2>
          </div>
          <a href={seeHref} className="hidden sm:inline-flex items-center gap-1.5 text-[14px] font-semibold text-ink hover:text-blush-deep transition">
            সব দেখুন
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
          </a>
        </div>

        <div className="mt-7 -mx-5 px-5 sm:mx-0 sm:px-0 flex gap-2.5 overflow-x-auto sc-noscroll pb-1">
          {tabs.map((t) => {
            const on = t.id === tab;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`shrink-0 rounded-full px-5 py-2.5 text-[13.5px] font-semibold transition ring-1 ${
                  on ? "bg-ink text-white ring-ink" : "bg-white text-ink-soft ring-ink/[0.08] hover:ring-blush"
                }`}
              >
                {t.label}
              </button>
            );
          })}
        </div>

        {shown.length > 0 ? (
          <div className="mt-8 grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
            {shown.map((p) => <SoftProductCard key={p.id} p={p} />)}
          </div>
        ) : (
          <p className="mt-10 text-center text-ink-muted text-sm">এই ক্যাটাগরিতে এখনো পণ্য যোগ হয়নি।</p>
        )}

        <div className="mt-8 text-center sm:hidden">
          <a href={seeHref} className="sc-btn-ghost inline-flex rounded-full px-7 py-3 text-[14px] font-semibold">সব দেখুন</a>
        </div>
      </div>
    </section>
  );
}
