"use client";

import { useEffect, useState } from "react";
import { getProductsByIds } from "@/app/account/recent-actions";
import { ProductCard } from "@/components/ProductCard";

export function RecentViewedStrip({ excludeId }: { excludeId?: string }) {
  const [products, setProducts] = useState<any[]>([]);
  useEffect(() => {
    let ids: string[] = [];
    try { ids = JSON.parse(localStorage.getItem("dc-recent") || "[]"); } catch {}
    ids = ids.filter((id) => id !== excludeId).slice(0, 8);
    if (!ids.length) return;
    getProductsByIds(ids).then((r) => setProducts(r.products)).catch(() => {});
  }, [excludeId]);

  if (products.length === 0) return null;
  return (
    <section className="mt-14">
      <h2 className="text-xl font-bold font-display mb-4">সম্প্রতি দেখা</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {products.map((p) => <ProductCard key={p.id} p={p} />)}
      </div>
    </section>
  );
}
