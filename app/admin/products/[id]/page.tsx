import { getServerSupabase } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { Category } from "@/lib/types";
import { getLandingVariants } from "@/lib/landing";
import { ProductForm } from "../ProductForm";

export const dynamic = "force-dynamic";

export default async function EditProduct({
  params,
}: {
  params: { id: string };
}) {
  const supabase = getServerSupabase();
  const [{ data: p }, { data: cats }, variants] = await Promise.all([
    supabase.from("products").select("*").eq("id", params.id).single(),
    supabase.from("categories").select("*").order("sort_order", { ascending: true }),
    getLandingVariants(),
  ]);
  if (!p) notFound();

  return (
    <div>
      <h1 className="text-2xl font-bold mb-5">Edit product</h1>
      <ProductForm
        categories={(cats as Category[]) ?? []}
        landings={variants.map((v) => ({ key: v.key, name: v.name }))}
        initial={{
          id: p.id,
          slug: p.slug ?? "",
          name_bn: p.name_bn ?? "",
          name_en: p.name_en ?? "",
          price: Number(p.price),
          compare_at_price: p.compare_at_price ? Number(p.compare_at_price) : null,
          stock: p.stock,
          sku: p.sku ?? "",
          category_id: p.category_id ?? "",
          description_bn: p.description_bn ?? "",
          description_en: p.description_en ?? "",
          meta_title: p.meta_title ?? "",
          meta_description: p.meta_description ?? "",
          is_active: p.is_active,
          images: p.images ?? [],
        }}
      />
    </div>
  );
}
