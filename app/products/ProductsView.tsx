// app/products/ProductsView.tsx — shared product listing (server component).
// Used by three routes so the common ones can be served from the edge cache:
//   /products                → app/products/page.tsx            (cached)
//   /products?category=slug  → app/products/c/[category]/page    (cached; middleware rewrite)
//   /products?q=… / ?sort=…  → app/products/search/page          (live search)
// The visible URL never changes — middleware.ts rewrites the query form internally.
import Image from "next/image";
import { getServerSupabase } from "@/lib/supabase/server";
import { getCategoryImages } from "@/lib/settings";
import type { Product, Category } from "@/lib/types";
import { ProductCard } from "@/components/ProductCard";
import { T } from "@/components/i18n/T";

export interface ProductsFilter {
  category?: string;
  q?: string;
  sort?: string;
}

export async function getProductsData(f: ProductsFilter) {
  const supabase = getServerSupabase();
  // Categories and category images don't depend on the product query → fetch in parallel.
  const [{ data: categories }, catImages] = await Promise.all([
    supabase.from("categories").select("*").order("sort_order", { ascending: true }),
    getCategoryImages(),
  ]);

  let categoryId: string | null = null;
  if (f.category) {
    const match = (categories as Category[] | null)?.find((c) => c.slug === f.category);
    categoryId = match?.id ?? null;
  }

  let query = supabase.from("products").select("*").eq("is_active", true);
  if (categoryId) query = query.eq("category_id", categoryId);
  if (f.q) {
    const q = f.q.replace(/[%,()]/g, " ").trim();
    if (q) query = query.or(`name_bn.ilike.%${q}%,name_en.ilike.%${q}%`);
  }
  if (f.sort === "price_asc") query = query.order("price", { ascending: true });
  else if (f.sort === "price_desc") query = query.order("price", { ascending: false });
  else query = query.order("created_at", { ascending: false });

  const { data: products } = await query.limit(100);
  return {
    categories: (categories as Category[]) ?? [],
    products: (products as Product[]) ?? [],
    catImages,
  };
}

export function ProductsView({
  categories, products, catImages, activeCat = "", q = "",
}: {
  categories: Category[];
  products: Product[];
  catImages: Record<string, string>;
  activeCat?: string;
  q?: string;
}) {
  const activeCategory = activeCat ? categories.find((c) => c.slug === activeCat) : null;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">
        {activeCategory ? (
          <T en={activeCategory.name_en || activeCategory.name_bn} bn={activeCategory.name_bn || activeCategory.name_en} />
        ) : q ? (
          <>
            <T en="Search results" bn="সার্চ ফলাফল" />: &ldquo;{q}&rdquo;
          </>
        ) : (
          <T en="All Products" bn="সব পণ্য" />
        )}
      </h1>

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
          <T en="All" bn="সব" />
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
            <T en={c.name_en || c.name_bn} bn={c.name_bn || c.name_en} />
          </a>
        ))}
      </div>

      {products.length === 0 ? (
        <div className="text-center py-20 text-gray-400"><T en="No products found." bn="কোনো পণ্য পাওয়া যায়নি।" /></div>
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
