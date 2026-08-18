"use client";

// app/admin/landing/LandingVariants.tsx — manage extra landing pages (variants).
// Same design as the homepage; each variant only changes which products are shown.
import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { saveLandingVariants } from "./actions";

interface ProductOpt { slug: string; name: string; price?: number; image?: string | null }
interface Variant { key: string; name: string; productSlugs: string[] }

const slugifyKey = (s: string) =>
  s.toLowerCase().trim().replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40);

export function LandingVariants({ initial, products }: { initial: Variant[]; products: ProductOpt[] }) {
  const router = useRouter();
  const [list, setList] = useState<Variant[]>(initial ?? []);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const origin = typeof window !== "undefined" ? window.location.origin : "https://dreamcomfortbd.com";

  function nextKey(): string {
    const keys = new Set(list.map((v) => v.key));
    let n = list.length + 2; // homepage is "1"
    while (keys.has(`landing${n}`)) n++;
    return `landing${n}`;
  }

  function addVariant() {
    const key = nextKey();
    setList((l) => [...l, { key, name: `ল্যান্ডিং ${key.replace("landing", "")}`, productSlugs: [] }]);
  }
  function update(i: number, patch: Partial<Variant>) {
    setList((l) => l.map((v, idx) => (idx === i ? { ...v, ...patch } : v)));
  }
  function remove(i: number) {
    setList((l) => l.filter((_, idx) => idx !== i));
  }
  function toggleProduct(i: number, slug: string) {
    setList((l) =>
      l.map((v, idx) =>
        idx === i
          ? { ...v, productSlugs: v.productSlugs.includes(slug) ? v.productSlugs.filter((s) => s !== slug) : [...v.productSlugs, slug] }
          : v
      )
    );
  }

  async function save() {
    setBusy(true);
    setMsg(null);
    const res = await saveLandingVariants(list);
    setBusy(false);
    if (!res.ok) { setMsg(res.error ?? "সেভ ব্যর্থ হয়েছে।"); return; }
    setMsg("✅ সেভ হয়েছে।");
    router.refresh();
  }

  return (
    <div className="mt-8 max-w-3xl">
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-lg font-bold">🧩 অতিরিক্ত ল্যান্ডিং পেজ</h2>
        <button onClick={addVariant} className="rounded-lg bg-brand text-white px-4 py-2 text-sm">+ নতুন ল্যান্ডিং</button>
      </div>
      <p className="text-sm text-gray-500 mb-4">
        একই ডিজাইন — শুধু পণ্য আলাদা। প্রতিটি পেজ আলাদা URL-এ খুলবে (যেমন <code className="bg-gray-100 px-1 rounded">/landing2</code>)। বিজ্ঞাপনে ঐ URL ব্যবহার করুন।
      </p>

      {list.length === 0 && (
        <p className="rounded-xl border border-dashed p-4 text-sm text-gray-400">এখনও কোনো অতিরিক্ত ল্যান্ডিং নেই — “+ নতুন ল্যান্ডিং” চাপুন।</p>
      )}

      <div className="space-y-4">
        {list.map((v, i) => (
          <div key={i} className="rounded-2xl border border-black/5 bg-white p-4 shadow-sm">
            <div className="flex flex-wrap items-end gap-3 mb-3">
              <div className="flex-1 min-w-[140px]">
                <label className="block text-xs font-medium mb-1 text-gray-500">নাম (নিজের জন্য)</label>
                <input value={v.name} onChange={(e) => update(i, { name: e.target.value })} className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-brand" placeholder="যেমন: বেবি প্রোডাক্ট ল্যান্ডিং" />
              </div>
              <div className="min-w-[140px]">
                <label className="block text-xs font-medium mb-1 text-gray-500">URL কী</label>
                <input value={v.key} onChange={(e) => update(i, { key: slugifyKey(e.target.value) })} className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-brand font-mono" placeholder="landing2" />
              </div>
              <button onClick={() => remove(i)} className="rounded-lg border border-red-200 text-red-600 px-3 py-2 text-sm hover:bg-red-50">সরান</button>
            </div>

            <div className="mb-3 text-xs">
              <span className="text-gray-500">লিংক: </span>
              <a href={`/${v.key}`} target="_blank" rel="noopener" className="text-brand-dark font-medium break-all hover:underline">{origin}/{v.key}</a>
            </div>

            <label className="block text-xs font-medium mb-2 text-gray-500">পণ্য নির্বাচন করুন ({v.productSlugs.length}টি)</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {products.map((p) => {
                const on = v.productSlugs.includes(p.slug);
                return (
                  <button
                    key={p.slug}
                    type="button"
                    onClick={() => toggleProduct(i, p.slug)}
                    className={"flex items-center gap-2 rounded-xl border p-2 text-left transition " + (on ? "border-brand ring-2 ring-brand/20 bg-brand-soft" : "border-black/10 hover:border-brand/40")}
                  >
                    <span className="h-9 w-9 rounded-lg overflow-hidden bg-gray-100 shrink-0 flex items-center justify-center">
                      {p.image ? (
                        <Image src={p.image} alt="" width={36} height={36} className="h-full w-full object-cover" />
                      ) : (
                        <span className="text-[9px] text-gray-400">—</span>
                      )}
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className="block text-xs font-medium leading-tight line-clamp-2">{p.name}</span>
                    </span>
                    <span className={"shrink-0 h-4 w-4 rounded-full border flex items-center justify-center text-[10px] " + (on ? "bg-brand text-white border-brand" : "border-gray-300")}>{on ? "✓" : ""}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {list.length > 0 && (
        <div className="mt-4 flex items-center gap-3">
          <button onClick={save} disabled={busy} className="rounded-xl bg-brand text-white px-6 py-2.5 text-sm font-medium hover:bg-brand-dark disabled:opacity-60">
            {busy ? "সেভ হচ্ছে..." : "সেভ করুন"}
          </button>
          {msg && <span className="text-sm text-gray-600">{msg}</span>}
        </div>
      )}
    </div>
  );
}
