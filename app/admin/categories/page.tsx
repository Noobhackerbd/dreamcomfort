import { getServerSupabase } from "@/lib/supabase/server";
import { Category } from "@/lib/types";
import { CategoryManager } from "./CategoryManager";

export const dynamic = "force-dynamic";

export default async function AdminCategories() {
  const supabase = getServerSupabase();
  const { data } = await supabase
    .from("categories")
    .select("*")
    .order("sort_order", { ascending: true });

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">ক্যাটাগরি</h1>
      <CategoryManager categories={(data as Category[]) ?? []} />
    </div>
  );
}
