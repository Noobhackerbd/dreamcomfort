"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { taka } from "@/lib/format";
import { useCart } from "@/lib/cart/store";
import { fireEvent } from "@/components/track";
import type { Product } from "@/lib/types";

function Stars({ rating }: { rating: number }) {
  return (
    <span className="inline-flex items-center gap-[1px]">
      {[0, 1, 2, 3, 4].map((i) => {
        const fill = Math.max(0, Math.min(1, rating - i));
        return (
          <svg key={i} width="13" height="13" viewBox="0 0 24 24" aria-hidden>
            <defs>
              <linearGradient id={`s${i}-${Math.round(fill * 100)}`}>
                <stop offset={`${fill * 100}%`} stopColor="#f5b301" />
                <stop offset={`${fill * 100}%`} stopColor="#e5e1d8" />
              </linearGradient>
            </defs>
            <path d="M12 2l3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1z"
              fill={`url(#s${i}-${Math.round(fill * 100)})`} />
          </svg>
        );
      })}
    </span>
  );
}

export function ProductCard({ p }: { p: Product }) {
  const router = useRouter();
  const add = useCart((s) => s.add);
  const name = p.name_bn || p.name_en;
  const img = p.images?.[0];
  const hasDiscount = p.compare_at_price && p.compare_at_price > p.price;
  const rating = typeof p.rating === "number" && p.rating > 0 ? p.rating : 4.9;
  const reviews = typeof p.review_count === "number" ? p.review_count : 0;

  const [wish, setWish] = useState(false);
  const [added, setAdded] = useState(false);
  useEffect(() => {
    try { setWish(JSON.parse(localStorage.getItem("dc-wish") || "[]").includes(p.id)); } catch {}
  }, [p.id]);
  function toggleWish(e: React.MouseEvent) {
    e.preventDefault(); e.stopPropagation();
    setWish((w) => {
      const nw = !w;
      try {
        const arr: string[] = JSON.parse(localStorage.getItem("dc-wish") || "[]");
        const next = nw ? Array.from(new Set([...arr, p.id])) : arr.filter((x) => x !== p.id);
        localStorage.setItem("dc-wish", JSON.stringify(next));
      } catch {}
      return nw;
    });
  }

  const cartItem = { id: p.id, slug: p.slug, name, price: p.price, image: img };
  function track() {
    fireEvent("AddToCart", {
      currency: "BDT", value: p.price, content_ids: [p.id], content_type: "product",
      contents: [{ id: p.id, quantity: 1, item_price: p.price }], num_items: 1,
    });
  }
  function addToCart(e: React.MouseEvent) {
    e.preventDefault(); e.stopPropagation();
    add(cartItem, 1); track();
    setAdded(true); setTimeout(() => setAdded(false), 1400);
  }
  function orderNow(e: React.MouseEvent) {
    e.preventDefault(); e.stopPropagation();
    add(cartItem, 1); track();
    router.push("/checkout");
  }

  return (
    <a href={`/product/${p.slug}`} className="group flex flex-col rounded-2xl border border-black/5 bg-white overflow-hidden shadow-sm hover:shadow-[0_16px_34px_-18px_rgba(95,180,228,.6)] transition-shadow">
      <div className="relative aspect-square bg-gradient-to-br from-brand-soft to-accent-soft flex items-center justify-center overflow-hidden">
        {hasDiscount && (
          <span className="absolute top-2.5 left-2.5 z-10 rounded-lg bg-accent text-white text-[11px] font-bold px-2 py-0.5">
            {Math.round((1 - p.price / (p.compare_at_price as number)) * 100)}% ছাড়
          </span>
        )}
        <button onClick={toggleWish} aria-label="wishlist" className="absolute top-2.5 right-2.5 z-10 h-8 w-8 rounded-full bg-white/90 flex items-center justify-center shadow-sm">
          <svg width="16" height="16" viewBox="0 0 24 24" fill={wish ? "#F0A0C0" : "none"} stroke={wish ? "#F0A0C0" : "#c9b6bf"} strokeWidth="1.8">
            <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z" />
          </svg>
        </button>
        {img ? (
          <Image src={img} alt={name} fill sizes="(max-width:768px) 50vw, 300px" className="object-cover group-hover:scale-105 transition-transform" />
        ) : (
          <span className="text-gray-400 text-sm px-2 text-center">{name}</span>
        )}
      </div>

      <div className="p-3 flex flex-col flex-1">
        <p className="font-medium text-sm leading-snug line-clamp-2 min-h-[2.6em]">{name}</p>
        <div className="mt-1.5 flex items-center gap-1.5">
          <Stars rating={rating} />
          <span className="text-[11.5px] text-gray-400">{rating.toFixed(1)}{reviews > 0 ? ` (${reviews})` : ""}</span>
        </div>
        <div className="mt-1.5 flex items-center gap-2">
          <span className="font-extrabold text-accent-dark text-[17px]">{taka(p.price)}</span>
          {hasDiscount && <span className="text-xs text-gray-400 line-through">{taka(p.compare_at_price as number)}</span>}
        </div>

        <div className="mt-2.5 flex flex-col gap-1.5">
          <button onClick={addToCart} className="rounded-xl border border-brand-light bg-brand-soft text-brand-dark text-[13px] font-semibold py-2 flex items-center justify-center gap-1.5 hover:bg-brand-soft/70">
            {added ? (
              <>✓ যোগ হয়েছে</>
            ) : (
              <>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" /><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" /></svg>
                কার্টে যোগ করুন
              </>
            )}
          </button>
          <button onClick={orderNow} className="rounded-xl bg-brand text-white text-[13.5px] font-bold py-2.5 hover:bg-brand-dark">
            অর্ডার এখনই
          </button>
        </div>
      </div>
    </a>
  );
}
