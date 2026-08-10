"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase/ssr-browser";
import { saveLanding } from "./actions";
import type { LandingConfig } from "@/lib/landing";

interface ProductOpt { slug: string; name: string }

const cls = "w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-brand";

async function uploadImage(file: File): Promise<string | null> {
  const supabase = getSupabaseBrowserClient();
  const ext = file.name.split(".").pop();
  const path = `landing/${Date.now()}-${Math.floor(Math.random() * 1e6)}.${ext}`;
  const { error } = await supabase.storage.from("product-images").upload(path, file, { cacheControl: "3600" });
  if (error) return null;
  return supabase.storage.from("product-images").getPublicUrl(path).data.publicUrl;
}

export function LandingEditor({
  initial,
  products,
}: {
  initial: LandingConfig;
  products: ProductOpt[];
}) {
  const router = useRouter();
  const [c, setC] = useState<LandingConfig>(initial);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function set<K extends keyof LandingConfig>(key: K, value: LandingConfig[K]) {
    setC((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  }

  async function save() {
    setSaving(true);
    setSaveError(null);
    setSaved(false);
    try {
      const res = await saveLanding(c);
      if (!res?.ok) {
        setSaveError(res?.error || "সেভ ব্যর্থ হয়েছে।");
        return;
      }
      setSaved(true);
      router.refresh();
    } catch (e: any) {
      setSaveError(e?.message || "সেভ ব্যর্থ হয়েছে।");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Hero product + logo */}
      <section className="rounded-xl border bg-white p-5 space-y-3">
        <h2 className="font-semibold">প্রধান পণ্য ও লোগো</h2>
        <div>
          <label className="block text-sm mb-1">ল্যান্ডিং পেজে যে পণ্যগুলো দেখাবে</label>
          <p className="text-xs text-gray-400 mb-2">একাধিক পণ্য বেছে নিন — ক্রেতা ল্যান্ডিং পেজে যেকোনো একটি বেছে অর্ডার করতে পারবে। কিছু না বাছলে সব সক্রিয় পণ্য দেখাবে।</p>
          <div className="max-h-56 overflow-y-auto rounded-lg border divide-y">
            {products.length === 0 && <p className="p-3 text-sm text-gray-400">কোনো পণ্য নেই — আগে পণ্য যোগ করুন।</p>}
            {products.map((p) => {
              const checked = (c.productSlugs ?? []).includes(p.slug);
              return (
                <label key={p.slug} className="flex items-center gap-2 px-3 py-2 text-sm cursor-pointer hover:bg-gray-50">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(e) => {
                      const cur = c.productSlugs ?? [];
                      const next = e.target.checked ? [...cur, p.slug] : cur.filter((s) => s !== p.slug);
                      setC((prev) => ({ ...prev, productSlugs: next, productSlug: next[0] ?? "" }));
                      setSaved(false);
                    }}
                  />
                  {p.name}
                </label>
              );
            })}
          </div>
          {(c.productSlugs ?? []).length > 0 && (
            <p className="text-xs text-gray-500 mt-1">{c.productSlugs.length}টি পণ্য নির্বাচিত।</p>
          )}
        </div>
        <div>
          <label className="block text-sm mb-1">লোগো</label>
          <div className="flex items-center gap-3">
            {c.logoUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={c.logoUrl} alt="logo" className="h-10 w-auto object-contain border rounded p-1" />
            )}
            <label className="text-sm text-brand cursor-pointer">
              {c.logoUrl ? "পরিবর্তন" : "আপলোড"} {busy && "..."}
              <input type="file" accept="image/*" className="hidden" onChange={async (e) => {
                const f = e.target.files?.[0]; if (!f) return; setBusy(true);
                const url = await uploadImage(f); setBusy(false); if (url) set("logoUrl", url);
              }} />
            </label>
            {c.logoUrl && <button onClick={() => set("logoUrl", "")} className="text-red-500 text-sm">সরান</button>}
          </div>
        </div>
      </section>

      {/* Headline / copy */}
      <section className="rounded-xl border bg-white p-5 space-y-3">
        <h2 className="font-semibold">হেডলাইন ও টেক্সট</h2>
        <div>
          <label className="block text-sm mb-1">হেডলাইন</label>
          <input value={c.headline} onChange={(e) => set("headline", e.target.value)} className={cls} />
        </div>
        <div>
          <label className="block text-sm mb-1">সাব-হেডলাইন</label>
          <textarea value={c.subheadline} onChange={(e) => set("subheadline", e.target.value)} rows={2} className={cls} />
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-sm mb-1">আর্জেন্সি টেক্সট</label>
            <input value={c.urgencyText} onChange={(e) => set("urgencyText", e.target.value)} className={cls} />
          </div>
          <div>
            <label className="block text-sm mb-1">স্ট্যাট (যেমন: ৫০০০+ সন্তুষ্ট মা)</label>
            <input value={c.statText} onChange={(e) => set("statText", e.target.value)} className={cls} />
          </div>
          <div>
            <label className="block text-sm mb-1">বাটন টেক্সট (CTA)</label>
            <input value={c.ctaText} onChange={(e) => set("ctaText", e.target.value)} className={cls} />
          </div>
        </div>
      </section>

      {/* Hero images note (multi-product: hero = the selected product's own images) */}
      <section className="rounded-xl border bg-white p-5">
        <h2 className="font-semibold mb-1">হিরো ছবি (স্লাইডার)</h2>
        <p className="text-sm text-gray-600">
          এই ল্যান্ডিং পেজে হিরো স্লাইডার প্রতিটি <b>পণ্যের নিজের ছবি</b> থেকে তৈরি হয়। একাধিক ছবির স্লাইডশো
          চাইলে <a href="/admin/products" className="text-brand underline">পণ্য সম্পাদনা</a> করে সেই পণ্যে
          একাধিক ছবি আপলোড করুন — ক্রেতা সেই পণ্য বেছে নিলে সব ছবি স্লাইডশো হিসেবে দেখাবে।
        </p>
      </section>

      {/* Badges */}
      <section className="rounded-xl border bg-white p-5">
        <h2 className="font-semibold mb-2">ব্যাজ / প্রতিশ্রুতি</h2>
        {c.badges.map((b, idx) => (
          <div key={idx} className="flex gap-2 mb-2">
            <input value={b} onChange={(e) => set("badges", c.badges.map((x, i) => i === idx ? e.target.value : x))} className={cls} />
            <button onClick={() => set("badges", c.badges.filter((_, i) => i !== idx))} className="text-red-500 text-sm px-2">✕</button>
          </div>
        ))}
        <button onClick={() => set("badges", [...c.badges, ""])} className="text-sm text-brand">+ ব্যাজ যোগ</button>
      </section>

      {/* Benefits */}
      <section className="rounded-xl border bg-white p-5">
        <h2 className="font-semibold mb-2">সুবিধা (Benefits)</h2>
        {c.benefits.map((b, idx) => (
          <div key={idx} className="grid grid-cols-[60px_1fr_1fr_auto] gap-2 mb-2 items-center">
            <input value={b.icon} onChange={(e) => set("benefits", c.benefits.map((x, i) => i === idx ? { ...x, icon: e.target.value } : x))} placeholder="🛌" className={cls} />
            <input value={b.title} onChange={(e) => set("benefits", c.benefits.map((x, i) => i === idx ? { ...x, title: e.target.value } : x))} placeholder="শিরোনাম" className={cls} />
            <input value={b.text} onChange={(e) => set("benefits", c.benefits.map((x, i) => i === idx ? { ...x, text: e.target.value } : x))} placeholder="বিবরণ" className={cls} />
            <button onClick={() => set("benefits", c.benefits.filter((_, i) => i !== idx))} className="text-red-500 text-sm">✕</button>
          </div>
        ))}
        <button onClick={() => set("benefits", [...c.benefits, { icon: "✅", title: "", text: "" }])} className="text-sm text-brand">+ সুবিধা যোগ</button>
      </section>

      {/* Guarantee */}
      <section className="rounded-xl border bg-white p-5 space-y-3">
        <h2 className="font-semibold">গ্যারান্টি</h2>
        <input value={c.guaranteeTitle} onChange={(e) => set("guaranteeTitle", e.target.value)} placeholder="গ্যারান্টি শিরোনাম" className={cls} />
        <textarea value={c.guaranteeText} onChange={(e) => set("guaranteeText", e.target.value)} rows={2} placeholder="গ্যারান্টি বিবরণ" className={cls} />
      </section>

      {/* Reviews */}
      <section className="rounded-xl border bg-white p-5">
        <h2 className="font-semibold mb-2">রিভিউ</h2>
        {c.reviews.map((r, idx) => (
          <div key={idx} className="rounded-lg border p-3 mb-2 space-y-2">
            <div className="grid grid-cols-[1fr_80px_auto] gap-2 items-center">
              <input value={r.name} onChange={(e) => set("reviews", c.reviews.map((x, i) => i === idx ? { ...x, name: e.target.value } : x))} placeholder="নাম" className={cls} />
              <select value={r.stars} onChange={(e) => set("reviews", c.reviews.map((x, i) => i === idx ? { ...x, stars: Number(e.target.value) } : x))} className={cls}>
                {[5, 4, 3, 2, 1].map((s) => <option key={s} value={s}>{s} ★</option>)}
              </select>
              <button onClick={() => set("reviews", c.reviews.filter((_, i) => i !== idx))} className="text-red-500 text-sm px-2">✕</button>
            </div>
            <textarea value={r.text} onChange={(e) => set("reviews", c.reviews.map((x, i) => i === idx ? { ...x, text: e.target.value } : x))} rows={2} placeholder="রিভিউ টেক্সট" className={cls} />
            <div className="flex items-center gap-2">
              {r.image && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={r.image} alt="" className="h-8 w-8 rounded-full object-cover" />
              )}
              <label className="text-xs text-brand cursor-pointer">
                {r.image ? "ছবি পরিবর্তন" : "ছবি যোগ (ঐচ্ছিক)"}
                <input type="file" accept="image/*" className="hidden" onChange={async (e) => {
                  const f = e.target.files?.[0]; if (!f) return; setBusy(true);
                  const u = await uploadImage(f); setBusy(false);
                  if (u) set("reviews", c.reviews.map((x, i) => i === idx ? { ...x, image: u } : x));
                }} />
              </label>
            </div>
          </div>
        ))}
        <button onClick={() => set("reviews", [...c.reviews, { name: "", text: "", stars: 5 }])} className="text-sm text-brand">+ রিভিউ যোগ</button>
      </section>

      {/* Save bar */}
      <div className="sticky bottom-3 rounded-xl border bg-white p-3 shadow-lg">
        <div className="flex items-center gap-3">
          <button onClick={save} disabled={saving} className="rounded-lg bg-brand text-white px-6 py-2.5 font-medium disabled:opacity-60">
            {saving ? "সেভ হচ্ছে..." : "ল্যান্ডিং পেজ সেভ করুন"}
          </button>
          {saved && <span className="text-green-600 text-sm">সেভ হয়েছে ✓</span>}
          <a href="/" target="_blank" className="text-sm text-brand hover:underline ml-auto">ল্যান্ডিং পেজ দেখুন →</a>
        </div>
        {saveError && (
          <p className="mt-2 rounded-lg bg-red-50 border border-red-200 text-red-700 px-3 py-2 text-sm">
            ⚠️ {saveError} — সম্ভবত <code>settings</code> টেবিলটি এখনো তৈরি হয়নি। Supabase SQL এডিটরে <b>supabase-migration-2.sql</b> রান করুন।
          </p>
        )}
      </div>
    </div>
  );
}
