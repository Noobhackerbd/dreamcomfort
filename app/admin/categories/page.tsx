import { getServerSupabase } from "@/lib/supabase/server";
import { Category } from "@/lib/types";
import { CategoryManager, type CategoryRow } from "./CategoryManager";

export const dynamic = "force-dynamic";

export default async function AdminCategories() {
  const supabase = getServerSupabase();
  const [{ data: cats }, { data: prods }] = await Promise.all([
    supabase.from("categories").select("*").order("sort_order", { ascending: true }),
    supabase.from("products").select("category_id, is_active"),
  ]);

  // Count products per category (total + active).
  const counts = new Map<string, { total: number; active: number }>();
  for (const p of (prods ?? []) as any[]) {
    const id = p.category_id;
    if (!id) continue;
    const cur = counts.get(id) || { total: 0, active: 0 };
    cur.total += 1;
    if (p.is_active) cur.active += 1;
    counts.set(id, cur);
  }

  const rows: CategoryRow[] = ((cats as Category[]) ?? []).map((c) => ({
    id: c.id,
    slug: c.slug,
    name_bn: c.name_bn ?? "",
    name_en: c.name_en ?? "",
    sort_order: c.sort_order ?? 0,
    products: counts.get(c.id)?.total ?? 0,
    activeProducts: counts.get(c.id)?.active ?? 0,
  }));

  return (
    <div>
      <h1 className="text-2xl font-bold mb-1">Categories</h1>
      <p className="text-sm dc-muted mb-5">Group your products. Drag order with the arrows; the store shows them in this order.</p>
      <CategoryManager categories={rows} />
    </div>
  );
}
