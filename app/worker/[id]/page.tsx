import { notFound } from "next/navigation";
import { getServerSupabase } from "@/lib/supabase/server";
import { isMissingTable, summarize, type Worker, type ProductionRow, type AdjustmentRow } from "@/lib/workers";
import { taka } from "@/lib/format";

export const dynamic = "force-dynamic";
export const metadata = { title: "কর্মী হিসাব", robots: { index: false, follow: false } };

const ADJ_LABEL: Record<string, string> = { damage: "ক্ষতি (−)", bonus: "বোনাস (+)", payment: "পরিশোধ" };

// Each worker opens their OWN unguessable link (/worker/<uuid>) — that link IS the
// access control, so no shared PIN is needed. They only ever see their own numbers.
export default async function WorkerSelfPage({ params }: { params: { id: string } }) {
  const supabase = getServerSupabase();
  const [wRes, prodRes, adjRes] = await Promise.all([
    supabase.from("workers").select("*").eq("id", params.id).single(),
    supabase.from("worker_production").select("*").eq("worker_id", params.id).order("created_at", { ascending: false }),
    supabase.from("worker_adjustments").select("*").eq("worker_id", params.id).order("created_at", { ascending: false }),
  ]);
  if (isMissingTable(wRes.error)) return <div className="max-w-md mx-auto mt-10 rounded-2xl bg-amber-50 ring-1 ring-amber-200 text-amber-700 px-5 py-4 text-sm">কর্মী মডিউল সেটআপ হয়নি।</div>;
  if (!wRes.data) notFound();

  const worker = wRes.data as Worker;
  const prod = (prodRes.data as ProductionRow[]) ?? [];
  const adj = (adjRes.data as AdjustmentRow[]) ?? [];
  const sum = summarize(prod, adj);

  const stats = [
    { label: "মোট আয়", value: taka(sum.earned), color: "#111827" },
    { label: "পরিশোধ", value: taka(sum.paid), color: "#16a34a" },
    { label: "বাকি", value: taka(sum.due), color: "#E77BA6" },
    { label: "সেট / পিস", value: `${sum.sets} / ${sum.pieces}`, color: "#3E9BD1" },
  ];

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-5">
        <a href="/worker" className="h-9 w-9 grid place-items-center rounded-xl bg-white ring-1 ring-black/5 hover:bg-gray-50">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4"><path d="M15 18l-6-6 6-6" /></svg>
        </a>
        <span className="h-11 w-11 rounded-full overflow-hidden bg-brand-soft text-brand-dark grid place-items-center font-bold shrink-0">
          {worker.photo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={worker.photo} alt="" className="h-full w-full object-cover" />
          ) : (worker.name || "?").charAt(0)}
        </span>
        <div>
          <h1 className="font-display text-xl font-bold text-gray-900">{worker.name}</h1>
          {worker.phone && <p className="text-xs text-gray-400">{worker.phone}</p>}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {stats.map((s) => (
          <div key={s.label} className="rounded-2xl bg-white ring-1 ring-black/5 shadow-sm p-4">
            <p className="text-lg font-extrabold tabular-nums" style={{ color: s.color }}>{s.value}</p>
            <p className="text-[11px] text-gray-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      <h2 className="font-semibold text-gray-900 mb-2">উৎপাদন</h2>
      {prod.length === 0 ? (
        <p className="text-sm text-gray-400 mb-6">এখনো কোনো এন্ট্রি নেই।</p>
      ) : (
        <div className="rounded-2xl bg-white ring-1 ring-black/5 shadow-sm overflow-hidden divide-y divide-black/5 mb-6">
          {prod.map((p) => (
            <div key={p.id} className="flex items-center gap-3 px-4 py-2.5 text-sm">
              <div className="min-w-0 flex-1">
                <p className="font-medium text-gray-900 truncate">{p.item_name || (p.kind === "set" ? "সেট" : "পিস")} × {p.quantity}</p>
                <p className="text-[11px] text-gray-400">{String(p.entry_date || "").slice(0, 10)}</p>
              </div>
              <span className="font-semibold text-gray-900 whitespace-nowrap">{taka(Number(p.amount))}</span>
            </div>
          ))}
        </div>
      )}

      {adj.length > 0 && (
        <>
          <h2 className="font-semibold text-gray-900 mb-2">সমন্বয় (বোনাস / ক্ষতি / পরিশোধ)</h2>
          <div className="rounded-2xl bg-white ring-1 ring-black/5 shadow-sm overflow-hidden divide-y divide-black/5">
            {adj.map((a) => (
              <div key={a.id} className="flex items-center gap-3 px-4 py-2.5 text-sm">
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-gray-900">{ADJ_LABEL[a.kind] || a.kind}</p>
                  {a.note && <p className="text-[11px] text-gray-400 truncate">{a.note}</p>}
                </div>
                <span className={"font-semibold whitespace-nowrap " + (a.kind === "bonus" ? "text-green-600" : a.kind === "damage" ? "text-red-500" : "text-gray-900")}>{taka(Number(a.amount))}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
