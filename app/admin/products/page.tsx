import { getServerSupabase } from "@/lib/supabase/server";
import { taka } from "@/lib/format";
import { DeleteProductButton } from "./DeleteProductButton";

export const dynamic = "force-dynamic";

export default async function AdminProducts() {
  const supabase = getServerSupabase();
  const { data: products } = await supabase
    .from("products")
    .select("id, slug, name_bn, name_en, price, stock, is_active, images")
    .order("created_at", { ascending: false });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">পণ্য</h1>
        <a href="/admin/products/new" className="rounded-lg bg-brand text-white px-5 py-2.5 text-sm">
          + নতুন পণ্য
        </a>
      </div>

      <div className="overflow-x-auto rounded-xl border bg-white">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-gray-500">
            <tr>
              <th className="px-4 py-3">পণ্য</th>
              <th className="px-4 py-3">দাম</th>
              <th className="px-4 py-3">স্টক</th>
              <th className="px-4 py-3">অবস্থা</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {(products ?? []).map((p: any) => (
              <tr key={p.id} className="border-t">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded bg-gray-100 overflow-hidden shrink-0">
                      {p.images?.[0] && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={p.images[0]} alt="" className="h-full w-full object-cover" />
                      )}
                    </div>
                    <span className="font-medium">{p.name_bn || p.name_en}</span>
                  </div>
                </td>
                <td className="px-4 py-3">{taka(Number(p.price))}</td>
                <td className="px-4 py-3">{p.stock}</td>
                <td className="px-4 py-3">
                  <span
                    className={
                      "rounded-full px-2 py-0.5 text-xs " +
                      (p.is_active
                        ? "bg-green-100 text-green-700"
                        : "bg-gray-100 text-gray-500")
                    }
                  >
                    {p.is_active ? "সক্রিয়" : "নিষ্ক্রিয়"}
                  </span>
                </td>
                <td className="px-4 py-3 text-right whitespace-nowrap">
                  <a href={`/admin/products/${p.id}`} className="text-brand hover:underline mr-3">
                    এডিট
                  </a>
                  <DeleteProductButton id={p.id} />
                </td>
              </tr>
            ))}
            {(!products || products.length === 0) && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-gray-400">
                  এখনও কোনো পণ্য নেই।
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
