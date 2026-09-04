"use client";

import { useMemo, useState } from "react";
import { taka } from "@/lib/format";
import { Icon } from "@/components/admin/icons";
import { DeleteProductButton } from "./DeleteProductButton";

export interface ProductRow {
  id: string; slug: string; name: string; price: number; stock: number; is_active: boolean; image: string | null;
}

const LOW = 5;

export function ProductsList({ products }: { products: ProductRow[] }) {
  const [q, setQ] = useState("");
  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return products;
    return products.filter((p) => p.name.toLowerCase().includes(s) || p.slug.toLowerCase().includes(s));
  }, [q, products]);

  return (
    <div>
      <div className="relative mb-3">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 dc-muted"><Icon name="search" className="h-4 w-4" /></span>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search products…" className="dc-input !pl-9" />
      </div>
      <p className="text-xs dc-muted mb-2.5 px-1">{filtered.length} {filtered.length === 1 ? "product" : "products"}</p>

      {filtered.length === 0 ? (
        <p className="text-center dc-muted py-12">No products found.</p>
      ) : (
        <div className="dc-card overflow-hidden">
          {filtered.map((p) => {
            const low = p.stock <= LOW;
            return (
              <div key={p.id} className="flex items-center gap-3 px-3 py-2.5 border-t first:border-t-0" style={{ borderColor: "var(--a-border)" }}>
                <div className="h-12 w-12 rounded-xl overflow-hidden shrink-0" style={{ background: "var(--a-surface-2)", boxShadow: "inset 0 0 0 1px var(--a-border)" }}>
                  {p.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.image} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <span className="flex h-full w-full items-center justify-center" style={{ color: "var(--a-faint)" }}><Icon name="image" className="h-5 w-5" /></span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <a href={`/admin/products/${p.id}`} className="text-sm font-bold truncate block hover:underline">{p.name}</a>
                  <p className="text-[12.5px] mt-0.5">
                    <span className="font-extrabold">{taka(Number(p.price))}</span>
                    <span className="dc-muted"> · </span>
                    {low ? (
                      <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold" style={{ background: "#fdeaea", color: "#dc2626" }}>{p.stock === 0 ? "Out of stock" : `Low · ${p.stock} left`}</span>
                    ) : (
                      <span className="dc-muted">Stock {p.stock}</span>
                    )}
                  </p>
                </div>
                <span className="text-[11px] font-bold rounded-full px-2 py-0.5 shrink-0" style={p.is_active ? { background: "#e7f6ec", color: "#16a34a" } : { background: "var(--a-surface-2)", color: "var(--a-muted)" }}>
                  {p.is_active ? "● Active" : "Inactive"}
                </span>
                <div className="flex items-center gap-0.5 shrink-0">
                  <a href={`/admin/products/${p.id}`} className="dc-act dc-act-sm" title="Edit"><Icon name="edit" className="h-4 w-4" /></a>
                  <DeleteProductButton id={p.id} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
