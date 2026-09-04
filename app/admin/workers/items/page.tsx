import Link from "next/link";
import { getWorkerItems } from "@/lib/workers";
import { ItemsEditor } from "./ItemsEditor";

export const dynamic = "force-dynamic";

export default async function WorkerItemsPage() {
  const { items, missing } = await getWorkerItems();

  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <Link href="/admin/workers" className="text-sm" style={{ color: "var(--a-brand)" }}>← Workers</Link>
      </div>
      <h1 className="text-2xl font-bold mb-1">Cost settings</h1>
      <p className="text-sm dc-muted mb-5">Set the making cost of each piece. 1 set = the sum of every &ldquo;in set&rdquo; piece.</p>

      {missing ? (
        <div className="dc-card p-5 text-sm" style={{ borderColor: "var(--a-warn-soft)", background: "var(--a-warn-soft)", color: "var(--a-warn)" }}>
          Run <code className="bg-white/60 px-1 rounded">supabase-migration-workers.sql</code> first.
        </div>
      ) : (
        <ItemsEditor initial={items} />
      )}
    </div>
  );
}
