"use client";

import { useEffect, useRef, useState } from "react";
import { ProductCard } from "@/components/ProductCard";
import { getForYou } from "@/app/for-you-actions";
import type { Product } from "@/lib/types";

/** Personalized "For You" grid. Re-ranks on mount using the viewer's recently
 *  viewed products (localStorage "dc-recent"), with a "load more" button. */
export function ForYou({ initial, initialHasMore, pageSize = 8 }: { initial: Product[]; initialHasMore: boolean; pageSize?: number }) {
  const [items, setItems] = useState<Product[]>(initial);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [busy, setBusy] = useState(false);
  const seenRef = useRef<string[]>([]);

  useEffect(() => {
    let ids: string[] = [];
    try { ids = JSON.parse(localStorage.getItem("dc-recent") || "[]"); } catch {}
    seenRef.current = ids;
    if (ids.length) {
      setBusy(true);
      getForYou({ seenIds: ids, offset: 0, limit: Math.max(pageSize, initial.length) })
        .then((r) => { setItems(r.products); setHasMore(r.hasMore); })
        .catch(() => {})
        .finally(() => setBusy(false));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadMore() {
    setBusy(true);
    try {
      const r = await getForYou({ seenIds: seenRef.current, offset: items.length, limit: pageSize });
      setItems((prev) => {
        const have = new Set(prev.map((p) => p.id));
        return [...prev, ...r.products.filter((p) => !have.has(p.id))];
      });
      setHasMore(r.hasMore);
    } catch {}
    setBusy(false);
  }

  if (items.length === 0) return null;

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {items.map((p) => <ProductCard key={p.id} p={p} />)}
      </div>
      {hasMore && (
        <div className="text-center mt-5">
          <button onClick={loadMore} disabled={busy}
            className="inline-flex items-center gap-2 rounded-xl border border-brand text-brand-dark font-bold text-sm px-7 py-3 hover:bg-brand-soft disabled:opacity-60 transition">
            {busy ? (
              <>
                <svg viewBox="0 0 24 24" className="h-4 w-4 animate-spin" fill="none" stroke="currentColor" strokeWidth="2.4"><path d="M21 12a9 9 0 1 1-6.2-8.6" strokeLinecap="round" /></svg>
                লোড হচ্ছে...
              </>
            ) : "আরও দেখুন"}
          </button>
        </div>
      )}
    </>
  );
}
