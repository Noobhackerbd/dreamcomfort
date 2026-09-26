"use client";

import Image from "next/image";
import Link from "next/link";
import { taka } from "@/lib/format";
import type { Product } from "@/lib/types";
import { useL } from "@/components/i18n/I18nProvider";

function Stars({ rating }: { rating: number }) {
  return (
    <span className="inline-flex items-center gap-[1px]">
      {[0, 1, 2, 3, 4].map((i) => {
        const fill = Math.max(0, Math.min(1, rating - i));
        return (
          <svg key={i} width="13" height="13" viewBox="0 0 24 24" aria-hidden>
            <defs>
              <linearGradient id={`s${i}-${Math.round(fill * 100)}`}>
                <stop offset={`${fill * 100}%`} stopColor="#f9a825" />
                <stop offset={`${fill * 100}%`} stopColor="#e0dcd3" />
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
  const { L, lang } = useL();
  const name = lang === "bn" ? (p.name_bn || p.name_en) : (p.name_en || p.name_bn);
  const img = p.images?.[0];
  const hasDiscount = !!(p.compare_at_price && p.compare_at_price > p.price);
  const off = hasDiscount ? Math.round((1 - p.price / (p.compare_at_price as number)) * 100) : 0;
  const rating = typeof p.rating === "number" && p.rating > 0 ? p.rating : 0;
  const reviews = typeof p.review_count === "number" ? p.review_count : 0;
  const showRating = rating > 0;
  const soldOut = typeof p.stock === "number" && p.stock <= 0;

  return (
    <Link
      href={`/product/${p.slug}`}
      prefetch
      className="dc-fade-up group flex flex-col bg-white rounded-md border border-black/[0.07] overflow-hidden transition-shadow duration-200 hover:shadow-[0_6px_18px_-8px_rgba(0,0,0,0.22)]"
    >
      {/* Image — clean white, square (Daraz style) */}
      <div className="relative aspect-square overflow-hidden bg-[#fafafa]">
        {img ? (
          <Image
            src={img}
            alt={name}
            fill
            sizes="(max-width:768px) 50vw, 260px"
            className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          />
        ) : (
          <span className="absolute inset-0 grid place-items-center text-gray-400 text-sm px-2 text-center">{name}</span>
        )}
        {soldOut && (
          <span className="absolute inset-0 grid place-items-center bg-white/55">
            <span className="rounded-full bg-black/75 text-white text-[11px] font-semibold px-3 py-1">{L("Out of stock", "স্টকে নেই")}</span>
          </span>
        )}
      </div>

      {/* Body */}
      <div className="p-2 sm:p-2.5 flex flex-col flex-1">
        <p className="text-[13px] text-gray-800 leading-snug line-clamp-2 min-h-[2.5em]">{name}</p>

        {/* Price — orange, plain gray discount % */}
        <div className="mt-1 flex items-center gap-1.5">
          <span className="font-bold text-[15px]" style={{ color: "#F0530E" }}>{taka(p.price)}</span>
          {hasDiscount && <span className="text-[12px] text-gray-400">-{off}%</span>}
        </div>

        {/* Rating — gold stars + count. Row space always reserved for equal-height cards. */}
        <div className="mt-1 h-[15px] flex items-center gap-1">
          {showRating && (
            <>
              <Stars rating={rating} />
              {reviews > 0 && <span className="text-[11.5px] text-gray-400">({reviews})</span>}
            </>
          )}
        </div>
      </div>
    </Link>
  );
}
