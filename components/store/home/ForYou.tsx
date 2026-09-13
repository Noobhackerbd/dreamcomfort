"use client";

// ForYou — beat 08. Return to commerce with personalized-feeling rails. All
// derived deterministically from the real catalogue (stable order → no hydration
// mismatch). Horizontal carousels for a fast, native shopping feel.

import { useMemo, useState } from "react";
import type { Product } from "@/lib/types";
import { SoftProductCard } from "@/components/store/home/SoftProductCard";

type Tab = "popular" | "foryou" | "new" | "rated";
const TABS: { key: Tab; label: string }[] = [
  { key: "popular", label: "জনপ্রিয়" },
  { key: "foryou", label: "আপনার জন্য" },
  { key: "new", label: "নতুন" },
  { key: "rated", label: "সেরা রেটিং" },
];

export function ForYou({ products }: { products: Product[] }) {
  const [tab, setTab] = useState<Tab>("popular");

  const list = useMemo(() => {
    const score = (p: Product) => (p.rating ?? 0) * Math.log10((p.review_count ?? 0) + 10);
    switch (tab) {
      case "popular": return [...products].sort((a, b) => (b.review_count ?? 0) - (a.review_count ?? 0));
      case "rated": return [...products].sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0) || (b.review_count ?? 0) - (a.review_count ?? 0));
      case "foryou": return [...products].sort((a, b) => score(b) - score(a));
      case "new":
      default: return products; // server already orders by created_at desc
    }
  }, [tab, products]).slice(0, 10);

  return (
    <section className="bg-ivory-warm">
      <div className="mx-auto max-w-6xl px-5 sm:px-6 py-16 sm:py-20">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <p className="sc-eyebrow text-blush-deep">০৮ — আবিষ্কার</p>
            <h2 className="mt-3 font-sans font-bold text-ink text-[26px] sm:text-[32px] leading-tight">এই সময় আপনার জন্য</h2>
          </div>
          <div className="flex gap-2 overflow-x-auto sc-noscroll">
            {TABS.map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`shrink-0 rounded-full px-4 py-2 text-[13px] font-semibold transition ring-1 ${
                  t.key === tab ? "bg-ink text-white ring-ink" : "bg-white text-ink-soft ring-ink/[0.08] hover:ring-blush"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-8 -mx-5 px-5 sm:mx-0 sm:px-0 flex gap-3.5 sm:gap-4 overflow-x-auto sc-noscroll snap-x snap-mandatory pb-2">
          {list.map((p) => (
            <div key={p.id} className="snap-start shrink-0 w-[60%] sm:w-[240px]">
              <SoftProductCard p={p} />
            </div>
          ))}
          {list.length === 0 && <p className="text-ink-muted text-sm py-8">শীঘ্রই নতুন পণ্য আসছে।</p>}
        </div>
      </div>
    </section>
  );
}
