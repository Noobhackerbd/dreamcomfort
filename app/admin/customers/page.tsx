import { getServerSupabase } from "@/lib/supabase/server";
import { taka } from "@/lib/format";
import { CustomersExport } from "./CustomersExport";

export const dynamic = "force-dynamic";

export default async function AdminCustomers({
  searchParams,
}: {
  searchParams: { q?: string };
}) {
  const supabase = getServerSupabase();
  let query = supabase
    .from("customers")
    .select("*")
    .order("total_spent", { ascending: false })
    .limit(200);
  if (searchParams.q) {
    const q = searchParams.q.trim();
    query = query.or(`phone.ilike.%${q}%,name.ilike.%${q}%`);
  }
  const { data: customers } = await query;

  return (
    <div>
      <div className="flex items-center justify-between gap-3 mb-6">
        <h1 className="text-2xl font-bold">গ্রাহক</h1>
        <CustomersExport />
      </div>

      <form method="get" className="flex gap-2 mb-4">
        <input
          name="q"
          defaultValue={searchParams.q ?? ""}
          placeholder="নাম বা ফোন"
          className="flex-1 rounded-lg border px-4 py-2.5 text-sm outline-none focus:border-brand"
        />
        <button className="rounded-lg bg-brand text-white px-5 py-2.5 text-sm">খুঁজুন</button>
      </form>

      <div className="overflow-x-auto rounded-xl border bg-white">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-gray-500">
            <tr>
              <th className="px-4 py-3">নাম</th>
              <th className="px-4 py-3">ফোন</th>
              <th className="px-4 py-3 text-center">অর্ডার</th>
              <th className="px-4 py-3 text-right">মোট খরচ</th>
            </tr>
          </thead>
          <tbody>
            {(customers ?? []).map((c: any) => (
              <tr key={c.id} className="border-t">
                <td className="px-4 py-3 font-medium">{c.name || "—"}</td>
                <td className="px-4 py-3">
                  <a href={`/admin/orders?q=${c.phone}`} className="text-brand hover:underline">
                    {c.phone}
                  </a>
                </td>
                <td className="px-4 py-3 text-center">{c.total_orders ?? 0}</td>
                <td className="px-4 py-3 text-right">{taka(Number(c.total_spent ?? 0))}</td>
              </tr>
            ))}
            {(!customers || customers.length === 0) && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-gray-400">
                  এখনও কোনো গ্রাহক নেই।
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
