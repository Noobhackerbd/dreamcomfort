"use client";

import { useEffect, useState } from "react";
import { getProductsByIds } from "@/app/account/recent-actions";
import { ProductCard } from "@/components/ProductCard";

export function RecentGrid() {
  const [products, setProducts] = useState<any[] | null>(null);

  useEffect(() => {
    let ids: string[] = [];
    try { ids = JSON.parse(localStorage.getItem("dc-recent") || "[]"); } catch {}
    if (!ids.length) { setProducts([]); return; }
    getProductsByIds(ids).then((r) => setProducts(r.products)).catch(() => setProducts([]));
  }, []);

  if (products === null) {
    return <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">{[0, 1, 2].map((i) => <div key={i} className="h-64 rounded-2xl bg-gray-100 animate-pulse" />)}</div>;
  }
  if (products.length === 0) {
    return (
      <div className="rounded-3xl bg-white ring-1 ring-black/5 shadow-sm px-5 py-14 text-center">
        <p className="text-gray-500">সম্প্রতি দেখা কোনো পণ্য নেই।</p>
        <a href="/products" className="mt-3 inline-block rounded-xl bg-brand text-white px-5 py-2.5 text-sm font-semibold hover:bg-brand-dark">পণ্য ব্রাউজ করুন</a>
      </div>
    );
  }
  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
      {products.map((p) => <ProductCard key={p.id} p={p} />)}
    </div>
  );
}
