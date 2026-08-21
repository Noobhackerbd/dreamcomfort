import { getServerSupabase } from "@/lib/supabase/server";
import { Category } from "@/lib/types";
import { getLandingVariants } from "@/lib/landing";
import { ProductForm } from "../ProductForm";

export const dynamic = "force-dynamic";

export default async function NewProduct() {
  const supabase = getServerSupabase();
  const [{ data }, variants] = await Promise.all([
    supabase.from("categories").select("*").order("sort_order", { ascending: true }),
    getLandingVariants(),
  ]);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">নতুন পণ্য</h1>
      <ProductForm
        categories={(data as Category[]) ?? []}
        landings={variants.map((v) => ({ key: v.key, name: v.name }))}
      />
    </div>
  );
}
