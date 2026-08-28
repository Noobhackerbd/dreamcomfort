import Link from "next/link";
import Image from "next/image";
import { getServerSupabase } from "@/lib/supabase/server";
import { isMissingTable, summarize, setCost, WorkerItem, ProductionRow, AdjustmentRow, Worker } from "@/lib/workers";
import { taka } from "@/lib/format";
import { AddWorker } from "./AddWorker";

export const dynamic = "force-dynamic";

export default async function WorkersPage() {
  const supabase = getServerSupabase();
  const [wRes, itemsRes, prodRes, adjRes] = await Promise.all([
    supabase.from("workers").select("*").order("created_at", { ascending: false }),
    supabase.from("worker_items").select("*").order("sort_order", { ascending: true }),
    supabase.from("worker_production").select("id, worker_id, kind, quantity, amount"),
    supabase.from("worker_adjustments").select("id, worker_id, kind, amount"),
  ]);

  if (isMissingTable(wRes.error) || isMissingTable(itemsRes.error)) {
    return (
      <div>
        <h1 className="text-2xl font-bold mb-4">কর্মী</h1>
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-5 text-sm text-amber-800">
          কর্মী ফিচার চালু করতে ডাটাবেস টেবিল যোগ করতে হবে। Supabase → SQL Editor-এ{" "}
          <code className="bg-white/60 px-1 rounded">supabase-migration-workers.sql</code> ফাইলটি চালান, তারপর এই পেজ রিফ্রেশ করুন।
        </div>
      </div>
    );
  }

  const workers = (wRes.data as Worker[]) ?? [];
  const items = (itemsRes.data as WorkerItem[]) ?? [];
  const prod = (prodRes.data as any[]) ?? [];
  const adj = (adjRes.data as any[]) ?? [];
  const oneSet = setCost(items);

  const byWorker = (id: string) => ({
    prod: prod.filter((p) => p.worker_id === id) as ProductionRow[],
    adj: adj.filter((a) => a.worker_id === id) as AdjustmentRow[],
  });

  return (
    <div>
      <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
        <h1 className="text-2xl font-bold">কর্মী</h1>
        <div className="flex items-center gap-2">
          <Link href="/admin/workers/items" className="rounded-lg border px-4 py-2 text-sm hover:bg-brand-soft">⚙️ কস্ট সেটিংস</Link>
        </div>
      </div>

      <div className="mb-4 rounded-xl border bg-white p-3 text-sm text-gray-600 flex flex-wrap items-center gap-x-4 gap-y-1">
        <span>১ সেট = <b>{items.filter((i) => i.in_set && i.active).length}</b> পিস</span>
        <span>প্রতি সেট মেকিং কস্ট: <b className="text-brand-dark">{taka(oneSet)}</b></span>
        <Link href="/admin/workers/items" className="text-brand-dark underline">কস্ট বদলান</Link>
      </div>

      <AddWorker />

      {workers.length === 0 ? (
        <p className="text-center text-gray-400 py-10">এখনও কোনো কর্মী যোগ করা হয়নি।</p>
      ) : (
        <div className="mt-4 space-y-3">
          {workers.map((w) => {
            const { prod: p, adj: a } = byWorker(w.id);
            const sum = summarize(p, a);
            return (
              <Link key={w.id} href={`/admin/workers/${w.id}`} className="flex items-center gap-4 rounded-xl border bg-white p-4 hover:shadow-sm transition">
                <div className="h-14 w-14 rounded-full overflow-hidden bg-gray-100 ring-1 ring-black/5 shrink-0 flex items-center justify-center">
                  {w.photo ? (
                    <Image src={w.photo} alt={w.name} width={56} height={56} className="h-full w-full object-cover" />
                  ) : (
                    <span className="text-xl">🧑‍🏭</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-gray-900 truncate">{w.name}{!w.active && <span className="ml-2 text-xs text-gray-400">(নিষ্ক্রিয়)</span>}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{sum.sets} সেট · {sum.pieces} পিস · আয় {taka(sum.earned)}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs text-gray-400">বাকি পাওনা</p>
                  <p className={"font-bold text-lg " + (sum.due > 0 ? "text-green-600" : "text-gray-500")}>{taka(sum.due)}</p>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
