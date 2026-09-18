import Image from "next/image";
import { taka } from "@/lib/format";
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
  const name = p.name_bn || p.name_en;
  const img = p.images?.[0];
  const hasDiscount = !!(p.compare_at_price && p.compare_at_price > p.price);
  const off = hasDiscount ? Math.round((1 - p.price / (p.compare_at_price as number)) * 100) : 0;
  const rating = typeof p.rating === "number" && p.rating > 0 ? p.rating : 0;
  const reviews = typeof p.review_count === "number" ? p.review_count : 0;
  const showRating = rating > 0;
  const soldOut = typeof p.stock === "number" && p.stock <= 0;

  return (
    <a
      href={`/product/${p.slug}`}
      className="dc-fade-up group relative flex flex-col rounded-2xl bg-white ring-1 ring-black/[0.06] overflow-hidden transition duration-200 ease-out hover:-translate-y-0.5 hover:ring-black/10 hover:shadow-[0_14px_30px_-14px_rgba(0,0,0,0.30)]"
    >
      {/* Image */}
      <div className="relative aspect-square overflow-hidden bg-gradient-to-b from-[#f7f6f4] to-[#eeecea]">
        {img ? (
          <Image
            src={img}
            alt={name}
            fill
            sizes="(max-width:768px) 50vw, 260px"
            className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.06]"
          />
        ) : (
          <span className="absolute inset-0 grid place-items-center text-gray-400 text-sm px-2 text-center">{name}</span>
        )}

        {soldOut && (
          <span className="absolute inset-0 grid place-items-center bg-white/55 backdrop-blur-[1px]">
            <span className="rounded-full bg-black/75 text-white text-[11px] font-semibold px-3 py-1">স্টকে নেই</span>
          </span>
        )}
      </div>

      {/* Body */}
      <div className="p-2.5 sm:p-3 flex flex-col flex-1">
        <p className="text-[13px] text-gray-700 leading-snug line-clamp-2 min-h-[2.5em] transition-colors group-hover:text-gray-900">
          {name}
        </p>

        {/* Price */}
        <div className="mt-2 flex items-center gap-1.5 flex-wrap">
          <span className="font-extrabold text-[17px] tracking-tight" style={{ color: "#F0530E" }}>
            {taka(p.price)}
          </span>
          {hasDiscount && (
            <>
              <span className="text-[12px] text-gray-400 line-through">{taka(p.compare_at_price as number)}</span>
              <span className="text-[10.5px] font-bold text-[#F0530E] bg-[#F0530E]/10 rounded px-1 py-[1px]">-{off}%</span>
            </>
          )}
        </div>

        {/* Rating — the row's space is ALWAYS reserved (even with no rating) so every
            card is the exact same height, whether or not it has reviews. */}
        <div className="mt-1.5 h-[16px] flex items-center gap-1">
          {showRating && (
            <>
              <Stars rating={rating} />
              {reviews > 0 && <span className="text-[11.5px] text-gray-400">({reviews})</span>}
            </>
          )}
        </div>
      </div>
    </a>
  );
}
