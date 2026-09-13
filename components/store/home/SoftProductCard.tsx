"use client";

// SoftProductCard — the "Soft Commerce" storefront product card.
// Visually refined (ivory/blush, editorial), but wired IDENTICALLY to the
// existing ProductCard: same cart store, same wishlist localStorage + account
// sync, same Meta/TikTok AddToCart event. Safe drop-in for home + shop grids.

import Image from "next/image";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { taka } from "@/lib/format";
import { useCart } from "@/lib/cart/store";
import { fireEvent } from "@/components/track";
import type { Product } from "@/lib/types";

function Stars({ rating }: { rating: number }) {
  return (
    <span className="inline-flex items-center gap-[1px]" aria-label={`রেটিং ${rating.toFixed(1)}`}>
      {[0, 1, 2, 3, 4].map((i) => {
        const fill = Math.max(0, Math.min(1, rating - i));
        const key = Math.round(fill * 100);
        return (
          <svg key={i} width="12" height="12" viewBox="0 0 24 24" aria-hidden>
            <defs>
              <linearGradient id={`sc-s${i}-${key}`}>
                <stop offset={`${fill * 100}%`} stopColor="#F4ABBD" />
                <stop offset={`${fill * 100}%`} stopColor="#EADFD2" />
              </linearGradient>
            </defs>
            <path d="M12 2l3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1z" fill={`url(#sc-s${i}-${key})`} />
          </svg>
        );
      })}
    </span>
  );
}

export function SoftProductCard({ p, priority = false }: { p: Product; priority?: boolean }) {
  const router = useRouter();
  const add = useCart((s) => s.add);
  const name = p.name_bn || p.name_en;
  const img = p.images?.[0];
  const hasDiscount = !!p.compare_at_price && p.compare_at_price > p.price;
  const rating = typeof p.rating === "number" && p.rating > 0 ? p.rating : 4.9;
  const reviews = typeof p.review_count === "number" ? p.review_count : 0;

  const [wish, setWish] = useState(false);
  const [pop, setPop] = useState(false);
  const [added, setAdded] = useState(false);

  useEffect(() => {
    try { setWish(JSON.parse(localStorage.getItem("dc-wish") || "[]").includes(p.id)); } catch {}
  }, [p.id]);

  function toggleWish(e: React.MouseEvent) {
    e.preventDefault(); e.stopPropagation();
    setWish((w) => {
      const nw = !w;
      if (nw) { setPop(true); setTimeout(() => setPop(false), 420); }
      try {
        const arr: string[] = JSON.parse(localStorage.getItem("dc-wish") || "[]");
        const next = nw ? Array.from(new Set([...arr, p.id])) : arr.filter((x) => x !== p.id);
        localStorage.setItem("dc-wish", JSON.stringify(next));
      } catch {}
      import("@/app/account/wishlist-actions").then((m) => m.toggleWishlist(p.id, nw)).catch(() => {});
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
    <a
      href={`/product/${p.slug}`}
      className="group relative flex flex-col rounded-[26px] bg-white ring-1 ring-ink/[0.06] overflow-hidden transition-[box-shadow,transform] duration-500 ease-soft-spring hover:-translate-y-1 hover:shadow-card"
    >
      <div className="relative aspect-[4/5] bg-gradient-to-br from-ivory-deep via-blush-mist to-blush-soft overflow-hidden">
        {hasDiscount && (
          <span className="absolute top-3 left-3 z-10 rounded-full bg-white/95 text-blush-deep text-[10.5px] font-bold px-2.5 py-1 shadow-sm">
            −{Math.round((1 - p.price / (p.compare_at_price as number)) * 100)}%
          </span>
        )}
        <button
          onClick={toggleWish}
          aria-label="উইশলিস্ট"
          className={`absolute top-3 right-3 z-10 h-9 w-9 rounded-full bg-white/90 backdrop-blur flex items-center justify-center shadow-sm transition ${pop ? "sc-heart-pop" : ""}`}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill={wish ? "#F4ABBD" : "none"} stroke={wish ? "#F4ABBD" : "#B7ADB4"} strokeWidth="1.8">
            <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z" />
          </svg>
        </button>
        {img ? (
          <Image
            src={img}
            alt={name}
            fill
            sizes="(max-width:768px) 50vw, 300px"
            priority={priority}
            className="object-cover transition-transform duration-[900ms] ease-soft-spring group-hover:scale-[1.06]"
          />
        ) : (
          <span className="absolute inset-0 grid place-items-center text-ink-muted text-sm px-3 text-center">{name}</span>
        )}
        {/* Quick add — appears on hover (desktop), always tappable on touch. */}
        <button
          onClick={addToCart}
          className="absolute bottom-3 left-3 right-3 z-10 rounded-full bg-white/95 backdrop-blur text-ink text-[12.5px] font-semibold py-2.5 shadow-card opacity-100 md:opacity-0 md:translate-y-2 md:group-hover:opacity-100 md:group-hover:translate-y-0 transition duration-500 ease-soft-spring"
        >
          {added ? "✓ কার্টে যোগ হয়েছে" : "কার্টে যোগ করুন"}
        </button>
      </div>

      <div className="p-4 flex flex-col flex-1">
        <div className="flex items-center gap-1.5">
          <Stars rating={rating} />
          <span className="text-[11px] text-ink-muted">{rating.toFixed(1)}{reviews > 0 ? ` · ${reviews}` : ""}</span>
        </div>
        <p className="mt-1.5 font-medium text-[14px] leading-snug text-ink line-clamp-2 min-h-[2.6em]">{name}</p>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="font-bold text-ink text-[18px]">{taka(p.price)}</span>
          {hasDiscount && <span className="text-[12px] text-ink-faint line-through">{taka(p.compare_at_price as number)}</span>}
        </div>
        <div className="mt-1 flex items-center gap-1 text-[11px] text-ink-muted">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10zM9 12l2 2 4-4" /></svg>
          ক্যাশ অন ডেলিভারি
        </div>

        <button
          onClick={orderNow}
          className="sc-btn mt-3 rounded-full text-[13.5px] font-bold py-2.5 w-full"
        >
          অর্ডার করুন
        </button>
      </div>
    </a>
  );
}
