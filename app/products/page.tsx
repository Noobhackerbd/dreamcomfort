// app/products/page.tsx — all products with category filter + search.
import type { Metadata } from "next";
import { getServerSupabase } from "@/lib/supabase/server";
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
  return {
    categories: (categories as Category[]) ?? [],
    products: (products as Product[]) ?? [],
  };
}

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { categories, products } = await getData(searchParams);
  const activeCat = searchParams.category ?? "";

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">সব পণ্য</h1>

      {/* Search */}
      <form method="get" className="mb-5 flex gap-2">
        {activeCat && <input type="hidden" name="category" value={activeCat} />}
        <input
          name="q"
          defaultValue={searchParams.q ?? ""}
          placeholder="পণ্য খুঁজুন..."
          className="flex-1 rounded-lg border px-4 py-2.5 outline-none focus:border-brand"
        />
        <button className="rounded-lg bg-brand text-white px-5 py-2.5 text-sm">খুঁজুন</button>
      </form>

      {/* Category chips */}
      <div className="flex flex-wrap gap-2 mb-6">
        <a
          href="/products"
          className={
            "rounded-full border px-4 py-1.5 text-sm " +
            (!activeCat ? "border-brand text-brand bg-brand/5" : "")
          }
        >
          সব
        </a>
        {categories.map((c) => (
          <a
            key={c.id}
            href={`/products?category=${c.slug}`}
            className={
              "rounded-full border px-4 py-1.5 text-sm " +
              (activeCat === c.slug ? "border-brand text-brand bg-brand/5" : "")
            }
          >
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
