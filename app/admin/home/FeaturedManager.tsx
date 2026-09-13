"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { saveFeatured } from "./actions";
import { taka } from "@/lib/format";

type P = { id: string; name: string; image?: string; price: number };

export function FeaturedManager({
  initial,
  products,
}: {
  initial: { productIds: string[] };
  products: P[];
}) {
  const router = useRouter();
  const byId = useMemo(() => Object.fromEntries(products.map((p) => [p.id, p])), [products]);
  const [ids, setIds] = useState<string[]>((initial.productIds || []).filter((id) => byId[id]));
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const selected = ids.map((id) => byId[id]).filter(Boolean) as P[];
  const available = products.filter(
    (p) => !ids.includes(p.id) && p.name.toLowerCase().includes(q.trim().toLowerCase())
  );

  function add(id: string) { setIds((v) => [...v, id]); setSaved(false); }
  function remove(id: string) { setIds((v) => v.filter((x) => x !== id)); setSaved(false); }
  function move(id: string, dir: number) {
    setIds((v) => {
      const i = v.indexOf(id); const j = i + dir;
      if (i < 0 || j < 0 || j >= v.length) return v;
      const n = [...v]; [n[i], n[j]] = [n[j], n[i]]; return n;
    });
    setSaved(false);
  }

  async function save() {
    setErr(null); setBusy(true);
    const res = await saveFeatured({ productIds: ids });
    setBusy(false);
    if (!res.ok) { setErr(res.error ?? "Save failed."); return; }
    setSaved(true); router.refresh();
  }

  const Thumb = ({ src }: { src?: string }) => (
    <span className="h-11 w-11 rounded-lg bg-[#f3f3f3] ring-1 ring-black/5 overflow-hidden shrink-0 grid place-items-center">
      {src ? <img src={src} alt="" className="h-full w-full object-cover" /> : <span className="text-[10px] text-gray-400">—</span>}
    </span>
  );

  return (
    <section className="dc-card p-5 mt-5">
      <div className="flex items-center gap-2.5 mb-1">
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg shrink-0" style={{ background: "#fef3c7", color: "#d97706" }}>★</span>
        <h2 className="font-bold text-[15.5px]">ফিচার্ড পণ্য</h2>
      </div>
      <p className="text-xs dc-muted mb-4 leading-relaxed">হোমপেজের “ফিচার্ড পণ্য” সেকশন। এখানে হাতে বাছাই করা পণ্যগুলো আগে দেখানো হবে, বাকি জায়গা <b>বেস্ট-সেলার</b> (গত ৬০ দিনের সবচেয়ে বেশি বিক্রি) দিয়ে অটো-পূরণ হবে। স্টকে না থাকা পণ্য বাদ যাবে। কিছু না বাছলে পুরোটাই অটো (বেস্ট-সেলার + নতুন) চলবে।</p>

      {/* Selected products (ordered) */}
      <p className="text-[13px] font-semibold mb-2">হাতে বাছাই করা ({selected.length})</p>
      {selected.length === 0 ? (
        <p className="text-xs dc-muted mb-4">কিছু বাছাই করা হয়নি — সম্পূর্ণ অটো (বেস্ট-সেলার) চলছে।</p>
      ) : (
        <div className="space-y-2 mb-4">
          {selected.map((p, i) => (
            <div key={p.id} className="flex items-center gap-3 rounded-xl ring-1 ring-black/5 bg-white px-3 py-2">
              <Thumb src={p.image} />
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-medium truncate">{p.name}</p>
                <p className="text-xs" style={{ color: "#F0530E" }}>{taka(p.price)}</p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button type="button" onClick={() => move(p.id, -1)} disabled={i === 0} className="h-7 w-7 grid place-items-center rounded-lg ring-1 ring-black/10 disabled:opacity-30" aria-label="উপরে">↑</button>
                <button type="button" onClick={() => move(p.id, 1)} disabled={i === selected.length - 1} className="h-7 w-7 grid place-items-center rounded-lg ring-1 ring-black/10 disabled:opacity-30" aria-label="নিচে">↓</button>
                <button type="button" onClick={() => remove(p.id)} className="h-7 px-2 grid place-items-center rounded-lg text-white text-xs font-semibold" style={{ background: "#dc2626" }}>সরান</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Product picker */}
      <p className="text-[13px] font-semibold mb-2">পণ্য যোগ করুন</p>
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="পণ্য খুঁজুন..." className="dc-input mb-2" />
      <div className="max-h-72 overflow-y-auto rounded-xl ring-1 ring-black/5 divide-y divide-black/5">
        {available.length === 0 ? (
          <p className="text-xs dc-muted px-3 py-4">কোনো পণ্য নেই।</p>
        ) : (
          available.map((p) => (
            <div key={p.id} className="flex items-center gap-3 px-3 py-2 bg-white">
              <Thumb src={p.image} />
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-medium truncate">{p.name}</p>
                <p className="text-xs dc-muted">{taka(p.price)}</p>
              </div>
              <button type="button" onClick={() => add(p.id)} className="h-8 px-3 grid place-items-center rounded-lg text-white text-xs font-semibold shrink-0" style={{ background: "var(--a-violet)" }}>+ যোগ</button>
            </div>
          ))
        )}
      </div>

      <div className="mt-4 flex items-center">
        <button onClick={save} disabled={busy} className="dc-btn dc-btn-solid disabled:opacity-60" style={{ background: "var(--a-violet)", borderColor: "var(--a-violet)" }}>
          {busy ? "Saving…" : "Save"}
        </button>
        {saved && <span className="text-sm ml-3" style={{ color: "var(--a-ok)" }}>Saved ✓</span>}
        {err && <span className="text-sm ml-3" style={{ color: "#dc2626" }}>{err}</span>}
      </div>
    </section>
  );
}
