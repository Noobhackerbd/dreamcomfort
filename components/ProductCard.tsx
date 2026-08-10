import { taka } from "@/lib/format";
import type { Product } from "@/lib/types";

export function ProductCard({ p }: { p: Product }) {
  const name = p.name_bn || p.name_en;
  const img = p.images?.[0];
  const hasDiscount = p.compare_at_price && p.compare_at_price > p.price;
  return (
    <a
      href={`/product/${p.slug}`}
      className="group rounded-xl border bg-white overflow-hidden hover:shadow-md transition-shadow"
    >
      <div className="aspect-square bg-gray-100 flex items-center justify-center overflow-hidden relative">
        {hasDiscount && (
          <span className="absolute top-2 left-2 z-10 rounded bg-red-500 text-white text-[10px] px-1.5 py-0.5">
            {Math.round((1 - p.price / (p.compare_at_price as number)) * 100)}% ছাড়
          </span>
        )}
        {img ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={img}
            alt={name}
            className="h-full w-full object-cover group-hover:scale-105 transition-transform"
          />
        ) : (
          <span className="text-gray-400 text-sm px-2 text-center">{name}</span>
        )}
      </div>
      <div className="p-3">
        <p className="font-medium truncate">{name}</p>
        <div className="mt-1 flex items-center gap-2">
          <span className="font-bold text-brand">{taka(p.price)}</span>
          {hasDiscount && (
            <span className="text-xs text-gray-400 line-through">
              {taka(p.compare_at_price as number)}
            </span>
          )}
        </div>
      </div>
    </a>
  );
}
