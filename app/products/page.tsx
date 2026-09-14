// app/products/page.tsx — all products with category filter + search.
import type { Metadata } from "next";
import Image from "next/image";
import { getServerSupabase } from "@/lib/supabase/server";
import { getCategoryImages } from "@/lib/settings";
import { Product, Category } from "@/lib/types";
import { ProductCard } from "@/components/ProductCard";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "সব পণ্য",
  description: "প্রিমিয়াম বিছানাপত্র, বালিশ ও আরামদায়ক পণ্যের সম্পূর্ণ তালিকা।",
};

interface SearchParams {
  category?: string;
  q?: string;
  sort?: string;
}

async function getData(sp: SearchParams) {
  const supabase = getServerSupabase();
  const { data: categories } = await supabase
    .from("categories")
    .select("*")
    .order("sort_order", { ascending: true });

  let categoryId: string | null = null;
  if (sp.category) {
    const match = (categories as Category[] | null)?.find((c) => c.slug === sp.category);
    categoryId = match?.id ?? null;
  }

  let query = supabase.from("products").select("*").eq("is_active", true);
  if (categoryId) query = query.eq("category_id", categoryId);
  if (sp.q) query = query.or(`name_bn.ilike.%${sp.q}%,name_en.ilike.%${sp.q}%`);

  if (sp.sort === "price_asc") query = query.order("price", { ascending: true });
  else if (sp.sort === "price_desc") query = query.order("price", { ascending: false });
  else query = query.order("created_at", { ascending: false });

  const { data: products } = await query.limit(100);
  const catImages = await getCategoryImages();
  return {
    categories: (categories as Category[]) ?? [],
    products: (products as Product[]) ?? [],
    catImages,
  };
}

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { categories, products, catImages } = await getData(searchParams);
  const activeCat = searchParams.category ?? "";

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">সব পণ্য</h1>

      {/* Category chips (with images) */}
      <div className="flex flex-wrap gap-2 mb-6">
        <a
          href="/products"
          className={
            "inline-flex items-center gap-2 rounded-full border pl-2 pr-4 py-1.5 text-sm font-medium transition " +
            (!activeCat ? "border-brand text-brand bg-brand/5" : "border-black/10 text-gray-700 hover:border-black/20")
          }
        >
          <span className="grid place-items-center h-7 w-7 rounded-full bg-brand/10 text-brand">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z" /></svg>
          </span>
          সব
        </a>
        {categories.map((c) => (
          <a
            key={c.id}
            href={`/products?category=${c.slug}`}
            className={
              "inline-flex items-center gap-2 rounded-full border pl-2 pr-4 py-1.5 text-sm font-medium transition " +
              (activeCat === c.slug ? "border-brand text-brand bg-brand/5" : "border-black/10 text-gray-700 hover:border-black/20")
            }
          >
            <span className="relative h-7 w-7 rounded-full overflow-hidden bg-[#f3f3f3] ring-1 ring-black/5 shrink-0">
              {catImages[c.id] ? (
                <Image src={catImages[c.id]} alt="" fill sizes="28px" className="object-cover" />
              ) : (
                <span className="absolute inset-0 grid place-items-center text-gray-400">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M20.6 6.6l-8-4a2 2 0 00-1.9 0l-8 4M3 6.6v10.8a2 2 0 001.1 1.8l7 3.4a2 2 0 001.8 0l7-3.4a2 2 0 001.1-1.8V6.6M3 6.6l9 4.4 9-4.4" /></svg>
                </span>
              )}
            </span>
            {c.name_bn || c.name_en}
          </a>
        ))}
      </div>

      {products.length === 0 ? (
        <div className="text-center py-20 text-gray-400">কোনো পণ্য পাওয়া যায়নি।</div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {products.map((p) => (
            <ProductCard key={p.id} p={p} />
          ))}
        </div>
      )}
    </div>
  );
}
