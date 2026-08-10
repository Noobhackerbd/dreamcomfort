"use client";

import { taka } from "@/lib/format";
import { playSelect } from "@/lib/sound";
import { Reveal } from "@/components/Reveal";
import type { Product } from "@/lib/types";

/**
 * "আমাদের পণ্যসমূহ" grid. Clicking a card selects that product in the funnel
 * (via a window event the ProductFunnel listens for) and scrolls to the order form.
 */
export function ProductShowcase({ products }: { products: Product[] }) {
  if (products.length < 2) return null;

  function pick(id: string) {
    playSelect();
    window.dispatchEvent(new CustomEvent("dc-pick-product", { detail: id }));
  }

  return (
    <section className="py-6">
      <Reveal>
        <h2 className="font-display text-2xl font-bold text-center mb-6">আমাদের পণ্যসমূহ</h2>
      </Reveal>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {products.map((p, i) => {
          const nm = p.name_bn || p.name_en;
          const img = p.images?.[0];
          const disc = p.compare_at_price && p.compare_at_price > p.price;
          return (
            <Reveal key={p.id} delay={i * 60}>
              <button
                type="button"
                onClick={() => pick(p.id)}
                className="group block w-full text-left rounded-[1.25rem] bg-white overflow-hidden shadow-sm ring-1 ring-brand/5 hover:shadow-soft hover:-translate-y-0.5 transition"
              >
                <div className="aspect-square bg-cream-deep/40 overflow-hidden">
                  {img ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={img} alt={nm} loading="lazy" decoding="async" className="h-full w-full object-cover group-hover:scale-105 transition" />
                  ) : (
                    <span className="flex h-full w-full items-center justify-center text-gray-400 text-xs px-2 text-center">{nm}</span>
                  )}
                </div>
                <div className="p-3">
                  <p className="font-medium truncate text-sm">{nm}</p>
                  <div className="mt-1 flex items-center gap-2">
                    <span className="font-bold text-accent-dark text-sm">{taka(Number(p.price))}</span>
                    {disc && <span className="text-xs text-gray-400 line-through">{taka(Number(p.compare_at_price))}</span>}
                  </div>
                  <span className="mt-2 inline-block rounded-full bg-brand-soft text-brand-dark text-[11px] px-2 py-0.5">অর্ডার করুন →</span>
                </div>
              </button>
            </Reveal>
          );
        })}
      </div>
    </section>
  );
}
