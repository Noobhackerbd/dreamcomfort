"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase/ssr-browser";
import { saveProduct, ProductInput } from "./actions";
import type { Category } from "@/lib/types";
import { toSlug } from "@/lib/slug";

interface Props {
  initial?: Partial<ProductInput> & { id?: string };
  categories: Category[];
  /** Extra landing pages (variants) so we can show a direct link for each. */
  landings?: { key: string; name: string }[];
}

// Same rule as the server (actions.ts) so the previewed link matches the saved slug.
const slugify = toSlug;

export function ProductForm({ initial, categories, landings = [] }: Props) {
  const router = useRouter();
  const [nameBn, setNameBn] = useState(initial?.name_bn ?? "");
  const [nameEn, setNameEn] = useState(initial?.name_en ?? "");
  const [slug, setSlug] = useState(initial?.slug ?? "");
  const [price, setPrice] = useState(initial?.price?.toString() ?? "");
  const [compare, setCompare] = useState(initial?.compare_at_price?.toString() ?? "");
  const [stock, setStock] = useState(initial?.stock?.toString() ?? "0");
  const [sku, setSku] = useState(initial?.sku ?? "");
  const [categoryId, setCategoryId] = useState(initial?.category_id ?? "");
  const [descBn, setDescBn] = useState(initial?.description_bn ?? "");
  const [descEn, setDescEn] = useState(initial?.description_en ?? "");
  const [metaTitle, setMetaTitle] = useState(initial?.meta_title ?? "");
  const [metaDesc, setMetaDesc] = useState(initial?.meta_description ?? "");
  const [active, setActive] = useState(initial?.is_active ?? true);
  const [images, setImages] = useState<string[]>(initial?.images ?? []);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Direct ad links — ?color=<slug> pre-selects this product on a landing page.
  const effectiveSlug = slugify(slug || nameEn || nameBn);
  const origin =
    (process.env.NEXT_PUBLIC_SITE_URL && process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "")) ||
    (typeof window !== "undefined" ? window.location.origin : "https://dreamcomfortbd.com");
  // Homepage + every extra landing variant.
  const landingLinks = [
    { key: "", label: "হোমপেজ" },
    ...landings.map((l) => ({ key: l.key, label: l.name || l.key })),
  ].map((l) => ({
    ...l,
    url: effectiveSlug ? `${origin}${l.key ? "/" + l.key : ""}/?color=${effectiveSlug}` : "",
  }));

  async function copyLink(url: string, key: string) {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      const t = document.createElement("textarea");
      t.value = url;
      document.body.appendChild(t);
      t.select();
      try { document.execCommand("copy"); } catch {}
      document.body.removeChild(t);
    }
    setCopiedKey(key);
    setTimeout(() => setCopiedKey((k) => (k === key ? null : k)), 1600);
  }

  async function onUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    setUploading(true);
    setError(null);
    const supabase = getSupabaseBrowserClient();
    const uploaded: string[] = [];
    for (const file of files) {
      const ext = file.name.split(".").pop();
      const path = `${Date.now()}-${Math.floor(Math.random() * 1e6)}.${ext}`;
      const { error } = await supabase.storage
        .from("product-images")
        .upload(path, file, { cacheControl: "3600", upsert: false });
      if (error) {
        setError("ছবি আপলোড ব্যর্থ: " + error.message);
        continue;
      }
      const { data } = supabase.storage.from("product-images").getPublicUrl(path);
      uploaded.push(data.publicUrl);
    }
    setImages((prev) => [...prev, ...uploaded]);
    setUploading(false);
  }

  function move(idx: number, dir: -1 | 1) {
    setImages((prev) => {
      const next = [...prev];
      const j = idx + dir;
      if (j < 0 || j >= next.length) return prev;
      [next[idx], next[j]] = [next[j], next[idx]];
      return next;
    });
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!nameBn.trim() && !nameEn.trim()) return setError("পণ্যের নাম লিখুন।");
    if (!Number(price)) return setError("সঠিক দাম লিখুন।");

    setSaving(true);
    const res = await saveProduct({
      id: initial?.id,
      slug,
      name_bn: nameBn,
      name_en: nameEn,
      price: Number(price),
      compare_at_price: compare ? Number(compare) : null,
      stock: Number(stock),
      sku,
      category_id: categoryId || null,
      description_bn: descBn,
      description_en: descEn,
      meta_title: metaTitle,
      meta_description: metaDesc,
      is_active: active,
      images,
    });
    setSaving(false);
    if (!res.ok) return setError(res.error ?? "সেভ ব্যর্থ হয়েছে।");
    router.push("/admin/products");
    router.refresh();
  }

  const cls = "w-full rounded-lg border px-4 py-2.5 outline-none focus:border-brand";

  return (
    <form onSubmit={onSubmit} className="max-w-2xl space-y-4">
      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm mb-1">পণ্যের নাম (বাংলা)</label>
          <input value={nameBn} onChange={(e) => setNameBn(e.target.value)} placeholder="যেমন: প্রিমিয়াম কটন বেডশিট" className={cls} />
        </div>
        <div>
          <label className="block text-sm mb-1">নাম (English — URL এর জন্য)</label>
          <input value={nameEn} onChange={(e) => setNameEn(e.target.value)} placeholder="e.g. Premium Cotton Bedsheet" className={cls} />
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm mb-1">ক্যাটাগরি</label>
          <select value={categoryId ?? ""} onChange={(e) => setCategoryId(e.target.value)} className={cls}>
            <option value="">— নির্বাচন করুন —</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name_bn || c.name_en}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm mb-1">স্লাগ (URL, ঐচ্ছিক)</label>
          <input value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="premium-cotton-bedsheet" className={cls} />
        </div>
      </div>

      {/* Direct ad links — open a landing page with THIS product pre-selected. */}
      <div className="rounded-xl border border-brand/25 bg-brand-soft/40 p-3.5">
        <label className="block text-sm font-semibold mb-2">🔗 ডিরেক্ট অ্যাড লিংক (প্রতিটি ল্যান্ডিং পেজের জন্য)</label>
        <div className="space-y-2">
          {landingLinks.map((l) => (
            <div key={l.key || "home"}>
              <p className="text-xs text-gray-500 mb-0.5">{l.label}{l.key ? ` (/${l.key})` : ""}</p>
              <div className="flex items-center gap-2">
                <input
                  readOnly
                  value={l.url || "প্রথমে নাম বা স্লাগ লিখুন…"}
                  onFocus={(e) => e.currentTarget.select()}
                  className="flex-1 min-w-0 rounded-lg border bg-white px-3 py-2 text-sm font-mono text-brand-dark"
                />
                <button
                  type="button"
                  onClick={() => copyLink(l.url, l.key || "home")}
                  disabled={!l.url}
                  className="shrink-0 rounded-lg bg-brand text-white px-4 py-2 text-sm font-medium hover:bg-brand-dark disabled:opacity-50"
                >
                  {copiedKey === (l.key || "home") ? "✓ কপি হয়েছে" : "কপি"}
                </button>
              </div>
            </div>
          ))}
        </div>
        <p className="text-xs text-gray-500 mt-2">
          বিজ্ঞাপনে এই লিংক দিলে ঐ ল্যান্ডিং পেজে এই পণ্যটি অটো-সিলেক্ট হয়ে খুলবে — পণ্যটি ঐ পেজে featured না থাকলেও।
          {!slug.trim() && " (স্লাগ খালি — নাম থেকে অটো তৈরি হচ্ছে; সেভ করার পর লিংক পাকা হবে।)"}
        </p>
      </div>

      <div className="grid md:grid-cols-4 gap-4">
        <div>
          <label className="block text-sm mb-1">দাম (৳)</label>
          <input value={price} onChange={(e) => setPrice(e.target.value)} inputMode="numeric" className={cls} />
        </div>
        <div>
          <label className="block text-sm mb-1">কাটা দাম (৳)</label>
          <input value={compare} onChange={(e) => setCompare(e.target.value)} inputMode="numeric" className={cls} />
        </div>
        <div>
          <label className="block text-sm mb-1">স্টক</label>
          <input value={stock} onChange={(e) => setStock(e.target.value)} inputMode="numeric" className={cls} />
        </div>
        <div>
          <label className="block text-sm mb-1">SKU</label>
          <input value={sku} onChange={(e) => setSku(e.target.value)} className={cls} />
        </div>
      </div>

      <div>
        <label className="block text-sm mb-1">বিবরণ (বাংলা)</label>
        <textarea value={descBn} onChange={(e) => setDescBn(e.target.value)} rows={3} className={cls} />
      </div>
      <div>
        <label className="block text-sm mb-1">Description (English)</label>
        <textarea value={descEn} onChange={(e) => setDescEn(e.target.value)} rows={2} className={cls} />
      </div>

      <div>
        <label className="block text-sm mb-1">ছবি (প্রথমটি প্রধান ছবি হবে)</label>
        <input type="file" accept="image/*" multiple onChange={onUpload} />
        {uploading && <p className="text-sm text-gray-500 mt-1">আপলোড হচ্ছে...</p>}
        <div className="flex flex-wrap gap-2 mt-3">
          {images.map((url, idx) => (
            <div key={url} className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt="" className="h-20 w-20 object-cover rounded-lg border" />
              {idx === 0 && (
                <span className="absolute bottom-0 left-0 bg-brand text-white text-[9px] px-1">প্রধান</span>
              )}
              <div className="absolute -top-2 -right-2 flex gap-1">
                {idx > 0 && (
                  <button type="button" onClick={() => move(idx, -1)} className="bg-gray-700 text-white rounded-full h-5 w-5 text-xs">‹</button>
                )}
                <button type="button" onClick={() => setImages((p) => p.filter((u) => u !== url))} className="bg-red-500 text-white rounded-full h-5 w-5 text-xs">×</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <details className="rounded-lg border bg-white p-3">
        <summary className="text-sm cursor-pointer">SEO সেটিংস (ঐচ্ছিক)</summary>
        <div className="mt-3 space-y-3">
          <div>
            <label className="block text-sm mb-1">Meta Title</label>
            <input value={metaTitle} onChange={(e) => setMetaTitle(e.target.value)} className={cls} />
          </div>
          <div>
            <label className="block text-sm mb-1">Meta Description</label>
            <textarea value={metaDesc} onChange={(e) => setMetaDesc(e.target.value)} rows={2} className={cls} />
          </div>
        </div>
      </details>

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
        সক্রিয় (দোকানে দেখা যাবে)
      </label>

      {error && (
        <p className="rounded-lg bg-red-50 border border-red-200 text-red-700 px-3 py-2 text-sm">{error}</p>
      )}

      <div className="flex gap-3">
        <button type="submit" disabled={saving || uploading} className="rounded-lg bg-brand text-white px-6 py-2.5 font-medium hover:bg-brand-dark disabled:opacity-60">
          {saving ? "সেভ হচ্ছে..." : "সেভ করুন"}
        </button>
        <a href="/admin/products" className="rounded-lg border px-6 py-2.5">বাতিল</a>
      </div>
    </form>
  );
}
