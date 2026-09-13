import Image from "next/image";
import { taka } from "@/lib/format";
import type { Product } from "@/lib/types";

function Stars({ rating }: { rating: number }) {
  return (
    <span className="inline-flex items-center gap-[1px]">
      {[0, 1, 2, 3, 4].map((i) => {
        const fill = Math.max(0, Math.min(1, rating - i));
        return (
          <svg key={i} width="12" height="12" viewBox="0 0 24 24" aria-hidden>
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
  const hasDiscount = p.compare_at_price && p.compare_at_price > p.price;
  const off = hasDiscount ? Math.round((1 - p.price / (p.compare_at_price as number)) * 100) : 0;
  const rating = typeof p.rating === "number" && p.rating > 0 ? p.rating : 0;
  const reviews = typeof p.review_count === "number" ? p.review_count : 0;
  // Show stars whenever a rating is set (admin or reviews). Count shown only if > 0.
  const showRating = rating > 0;

  return (
    <a href={`/product/${p.slug}`}
      className="group flex flex-col rounded-lg border border-black/[0.07] bg-white overflow-hidden hover:shadow-[0_10px_24px_-14px_rgba(0,0,0,.35)] hover:border-black/10 transition">
      <div className="relative aspect-square bg-[#f6f6f6] overflow-hidden">
        {img ? (
          <Image src={img} alt={name} fill sizes="(max-width:768px) 50vw, 260px" className="object-cover group-hover:scale-[1.03] transition-transform duration-300" />
        ) : (
          <span className="absolute inset-0 grid place-items-center text-gray-400 text-sm px-2 text-center">{name}</span>
        )}
      </div>

      <div className="p-2.5 sm:p-3 flex flex-col flex-1">
        <p className="text-[13px] text-gray-700 leading-snug line-clamp-2 min-h-[2.5em]">{name}</p>

        <div className="mt-1.5 flex items-baseline gap-1.5">
          <span className="font-bold text-[16px]" style={{ color: "#F0530E" }}>{taka(p.price)}</span>
          {hasDiscount && <span className="text-[12px] text-gray-400">-{off}%</span>}
        </div>

        {showRating && (
          <div className="mt-1 flex items-center gap-1">
            <Stars rating={rating} />
            {reviews > 0 && <span className="text-[11.5px] text-gray-400">({reviews})</span>}
          </div>
        )}
      </div>
    </a>
  );
}
