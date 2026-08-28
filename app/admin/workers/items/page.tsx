import Link from "next/link";
import { getWorkerItems } from "@/lib/workers";
import { ItemsEditor } from "./ItemsEditor";

export const dynamic = "force-dynamic";

export default async function WorkerItemsPage() {
  const { items, missing } = await getWorkerItems();

  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <Link href="/admin/workers" className="text-sm text-brand-dark">← কর্মী</Link>
      </div>
      <h1 className="text-2xl font-bold mb-1">কস্ট সেটিংস</h1>
      <p className="text-sm text-gray-500 mb-6">প্রতিটি পিসের মেকিং কস্ট দিন। ১ সেট = সব “সেটে আছে” পিসের যোগফল।</p>

      {missing ? (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-5 text-sm text-amber-800">
          আগে <code className="bg-white/60 px-1 rounded">supabase-migration-workers.sql</code> চালান।
        </div>
      ) : (
        <ItemsEditor initial={items} />
      )}
    </div>
  );
}
