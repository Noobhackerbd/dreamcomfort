import { getServerSupabase } from "@/lib/supabase/server";
import { Icon } from "@/components/admin/icons";
import { ProductsList, type ProductRow } from "./ProductsList";

export const dynamic = "force-dynamic";

export default async function AdminProducts() {
  const supabase = getServerSupabase();
  const { data: products } = await supabase
    .from("products")
    .select("id, slug, name_bn, name_en, price, stock, is_active, images")
    .order("created_at", { ascending: false });

  const rows: ProductRow[] = (products ?? []).map((p: any) => ({
    id: p.id,
    slug: p.slug ?? "",
    name: p.name_bn || p.name_en || "Untitled",
    price: Number(p.price),
    stock: Number(p.stock ?? 0),
    is_active: !!p.is_active,
    image: p.images?.[0] ?? null,
  }));

  return (
    <div>
      <div className="flex items-center justify-between gap-3 mb-4">
        <h1 className="text-2xl font-bold">Products</h1>
        <a href="/admin/products/new" className="dc-btn dc-btn-solid" style={{ background: "var(--a-violet)", borderColor: "var(--a-violet)" }}>
          <Icon name="plus" className="h-4 w-4" /> New product
        </a>
      </div>

      <ProductsList products={rows} />
    </div>
  );
}
