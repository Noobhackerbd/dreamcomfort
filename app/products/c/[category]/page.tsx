// app/products/c/[category]/page.tsx — one category (served from the edge cache).
// Shoppers still see /products?category=slug — middleware.ts rewrites it here.
import type { Metadata } from "next";
import { getServerSupabase } from "@/lib/supabase/server";
import { ProductsView, getProductsData } from "../../ProductsView";

export const revalidate = 60;
export const dynamicParams = true;

export async function generateStaticParams() {
  try {
    const supabase = getServerSupabase();
    const { data } = await supabase.from("categories").select("slug");
    return ((data as { slug: string }[] | null) ?? []).filter((c) => c.slug).map((c) => ({ category: c.slug }));
  } catch {
    return [];
  }
}

export async function generateMetadata({ params }: { params: { category: string } }): Promise<Metadata> {
  try {
    const supabase = getServerSupabase();
    const { data } = await supabase.from("categories").select("name_bn, name_en").eq("slug", decodeURIComponent(params.category)).maybeSingle();
    const name = (data as any)?.name_bn || (data as any)?.name_en;
    return { title: name || "সব পণ্য" };
  } catch {
    return { title: "সব পণ্য" };
  }
}

export default async function CategoryPage({ params }: { params: { category: string } }) {
  const category = decodeURIComponent(params.category);
  const data = await getProductsData({ category });
  return <ProductsView {...data} activeCat={category} />;
}
