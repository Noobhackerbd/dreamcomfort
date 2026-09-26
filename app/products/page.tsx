// app/products/page.tsx — all products (served from the edge cache).
// ?category=… and ?q=… are rewritten by middleware.ts to cached/search routes, so
// this page never reads searchParams and can stay fully static.
import type { Metadata } from "next";
import { ProductsView, getProductsData } from "./ProductsView";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "সব পণ্য",
  description: "প্রিমিয়াম বিছানাপত্র, বালিশ ও আরামদায়ক পণ্যের সম্পূর্ণ তালিকা।",
};

export default async function ProductsPage() {
  const data = await getProductsData({});
  return <ProductsView {...data} />;
}
