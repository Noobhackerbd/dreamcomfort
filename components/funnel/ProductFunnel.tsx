"use client";

import Image from "next/image";
import { useDeferredValue, useEffect, useRef, useState } from "react";
import { HeroSlider } from "@/components/funnel/HeroSlider";
import { OrderForm } from "@/components/funnel/OrderForm";
import { fireEvent } from "@/components/track";
import { taka } from "@/lib/format";
import { playSelect } from "@/lib/sound";
import type { Product } from "@/lib/types";

interface FunnelProduct {
  id: string;
  slug: string;
  name: string;
  price: number;
  compare_at_price: number | null;
  images: string[];
}

function toFunnel(p: Product): FunnelProduct {
  return {
    id: p.id,
    slug: p.slug,
    name: p.name_bn || p.name_en,
    price: Number(p.price),
    compare_at_price: p.compare_at_price != null ? Number(p.compare_at_price) : null,
    images: p.images ?? [],
  };
}

export function ProductFunnel({
  products,
  shipping,
  headline,
  subheadline,
  urgencyText,
  statText,
  badges,
  ctaText,
  initialProductId,
}: {
  products: Product[];
  shipping: { inside: number; outside: number };
  headline: string;
  subheadline: string;
  urgencyText: string;
  statText: string;
  badges: string[];
  ctaText: string;
  /** Pre-selected product id (resolved server-side from the ?color= URL param). */
  initialProductId?: string;
}) {
  const list = products.map(toFunnel);
  // Seed the selection from the URL (?color=) when it matches a featured
  // product; otherwise fall back to the first product.
  const initialId =
    initialProductId && list.some((x) => x.id === initialProductId)
      ? initialProductId
      : list[0]?.id ?? "";
  const [selectedId, setSelectedId] = useState<string>(initialId);
  const viewed = useRef<Set<string>>(new Set());

  const p = list.find((x) => x.id === selectedId) ?? list[0];
  // Defer only the heavy hero image-swap so a product tap feels instant
  // (chip highlight, price, and the order form update immediately).
  const deferredId = useDeferredValue(selectedId);
  const heroP = list.find((x) => x.id === deferredId) ?? p;
  const switching = deferredId !== selectedId;

  // Fire ViewContent when a product becomes selected (once per product).
  useEffect(() => {
    if (!p || viewed.current.has(p.id)) return;
    viewed.current.add(p.id);
    fireEvent("ViewContent", {
      currency: "BDT",
      value: p.price,
      content_ids: [p.id],
      content_type: "product",
      content_name: p.name,
    });
  }, [p]);

  // "আমাদের পণ্যসমূহ" cards dispatch this event → select that product + go to form.
  useEffect(() => {
    function onPick(e: Event) {
      const id = (e as CustomEvent).detail as string;
      if (products.some((x) => x.id === id)) {
        setSelectedId(id);
        setTimeout(() => {
          document.getElementById("order-form")?.scrollIntoView({ behavior: "smooth", block: "center" });
        }, 60);
      }
    }
    window.addEventListener("dc-pick-product", onPick);
    return () => window.removeEventListener("dc-pick-product", onPick);
  }, [products]);

  if (!p) return null;

  const hasDiscount = p.compare_at_price && p.compare_at_price > p.price;
  const off = hasDiscount ? Math.round((1 - p.price / (p.compare_at_price as number)) * 100) : 0;

  return (
    <section className="grid lg:grid-cols-2 gap-8 py-8 lg:py-12 items-start max-w-full">
      <div className="lg:sticky lg:top-8 min-w-0">
        <div className={"w-full max-w-full " + (switching ? "opacity-80 transition-opacity duration-200" : "transition-opacity duration-200")}>
          <HeroSlider images={heroP.images} alt={heroP.name} />
        </div>

        {/* Product picker — directly below the hero photo (all screens) */}
        {list.length > 1 && (
          <div id="product-picker" className="mt-4 scroll-mt-24">
            <label className="block text-center text-lg font-bold text-brand-dark mb-3">একটি কালার বেছে নিন 👇</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {list.map((x) => (
                <ProductChip key={x.id} p={x} on={x.id === selectedId} onSelect={() => { setSelectedId(x.id); playSelect(); }} />
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="min-w-0">
        {urgencyText && (
          <span className="inline-block rounded-full bg-accent-soft text-accent-dark text-sm px-3 py-1 mb-3">
            {urgencyText}
          </span>
        )}
        <h1 className="font-display text-3xl md:text-4xl font-bold leading-tight">{headline}</h1>
        <p className="mt-3 text-gray-600 text-lg">{subheadline}</p>

        <div className="mt-4 flex items-end gap-3">
          <span className="font-display text-4xl font-bold text-accent-dark">{taka(p.price)}</span>
          {hasDiscount && (
            <>
              <span className="text-gray-400 line-through text-lg mb-1">{taka(p.compare_at_price as number)}</span>
              <span className="mb-1 rounded-full bg-accent text-white text-sm px-2 py-0.5 font-bold">{off}% ছাড়</span>
            </>
          )}
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {badges.map((b, i) => (
            <span key={i} className="rounded-full bg-white shadow-sm text-brand-dark text-xs px-3 py-1.5 ring-1 ring-brand/10">✓ {b}</span>
          ))}
        </div>

        <div className="mt-4 flex items-center gap-2 text-sm">
          <span className="text-amber-400 text-base tracking-tight">★★★★★</span>
          <span className="font-semibold text-gray-800">৪.৯</span>
          <span className="text-gray-300">·</span>
          <span className="text-gray-500">{statText}</span>
        </div>

        <div className="mt-6">
          <OrderForm
            productId={p.id}
            productName={p.name}
            basePrice={p.price}
            baseCompare={p.compare_at_price}
            baseImage={p.images[0]}
            images={p.images}
            variants={[]}
            hasOptions={list.length > 1}
            shipping={shipping}
            ctaText={ctaText}
          />
        </div>
      </div>
    </section>
  );
}

function ProductChip({ p, on, onSelect }: { p: FunnelProduct; on: boolean; onSelect: () => void }) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={
        "flex w-full min-w-0 items-center gap-2 overflow-hidden rounded-2xl border p-2 text-left transition " +
        (on ? "border-accent ring-4 ring-accent/15 bg-accent-soft" : "border-brand/15 hover:border-brand/40 bg-white")
      }
    >
      {p.images[0] ? (
        <Image src={p.images[0]} alt={p.name} width={44} height={44} sizes="44px" className="h-11 w-11 shrink-0 rounded-xl object-cover" />
      ) : (
        <span className="h-11 w-11 shrink-0 rounded-xl bg-gradient-to-br from-brand-light to-accent-light" />
      )}
      <span className="flex-1 min-w-0">
        <span className="block text-sm font-medium leading-tight line-clamp-2">{p.name}</span>
        <span className="block text-xs text-accent-dark font-bold">{taka(p.price)}</span>
      </span>
    </button>
  );
}
