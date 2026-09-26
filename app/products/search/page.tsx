// app/products/search/page.tsx — text search / custom sort (live, per query).
// Shoppers see /products?q=… — middleware.ts rewrites it here.
import type { Metadata } from "next";
import { ProductsView, getProductsData } from "../ProductsView";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "সার্চ", robots: { index: false } };

export default async function SearchPage({ searchParams }: { searchParams: { q?: string; sort?: string; category?: string } }) {
  const q = (searchParams.q || "").trim();
  const data = await getProductsData({ q, sort: searchParams.sort, category: searchParams.category });
  return <ProductsView {...data} activeCat={searchParams.category || ""} q={q} />;
}
