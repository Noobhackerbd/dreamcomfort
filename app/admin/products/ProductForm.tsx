"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase/ssr-browser";
import { Icon } from "@/components/admin/icons";
import { saveProduct, ProductInput } from "./actions";
import type { Category } from "@/lib/types";
import { toSlug } from "@/lib/slug";

interface Props {
  initial?: Partial<ProductInput> & { id?: string };
  categories: Category[];
  landings?: { key: string; name: string }[];
}

const slugify = toSlug;
const cls = "dc-input";
const lbl = "block text-[13px] font-medium dc-muted mb-1";

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
  const [rating, setRating] = useState(initial?.rating != null ? String(initial.rating) : "");
  const [reviewCount, setReviewCount] = useState(initial?.review_count != null ? String(initial.review_count) : "");
  const [images, setImages] = useState<string[]>(initial?.images ?? []);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const effectiveSlug = slugify(slug || nameEn || nameBn);
  const origin =
    (process.env.NEXT_PUBLIC_SITE_URL && process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "")) ||
    (typeof window !== "undefined" ? window.location.origin : "https://dreamcomfortbd.com");
  const landingLinks = [
    { key: "landing", label: "Main funnel (/landing)" },
    ...landings.map((l) => ({ key: l.key, label: l.name || l.key })),
  ].map((l) => ({ ...l, url: effectiveSlug ? `${origin}/${l.key}/?color=${effectiveSlug}` : "" }));

  async function copyLink(url: string, key: string) {
    if (!url) return;
    try { await navigator.clipboard.writeText(url); }
    catch {
      const t = document.createElement("textarea"); t.value = url; document.body.appendChild(t); t.select();
      try { document.execCommand("copy"); } catch {}
      document.body.removeChild(t);
    }
    setCopiedKey(key);
    setTimeout(() => setCopiedKey((k) => (k === key ? null : k)), 1600);
  }

  async function onUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    setUploading(true); setError(null);
    const supabase = getSupabaseBrowserClient();
    const uploaded: string[] = [];
    for (const file of files) {
      const ext = file.name.split(".").pop();
      const path = `${Date.now()}-${Math.floor(Math.random() * 1e6)}.${ext}`;
      const { error } = await supabase.storage.from("product-images").upload(path, file, { cacheControl: "3600", upsert: false });
      if (error) { setError("Image upload failed: " + error.message); continue; }
      const { data } = supabase.storage.from("product-images").getPublicUrl(path);
      uploaded.push(data.publicUrl);
    }
    setImages((prev) => [...prev, ...uploaded]);
    setUploading(false);
  }

  function move(idx: number, dir: -1 | 1) {
    setImages((prev) => {
      const next = [...prev]; const j = idx + dir;
      if (j < 0 || j >= next.length) return prev;
      [next[idx], next[j]] = [next[j], next[idx]];
      return next;
    });
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!nameBn.trim() && !nameEn.trim()) return setError("Enter a product name.");
    if (!Number(price)) return setError("Enter a valid price.");
    setSaving(true);
    const res = await saveProduct({
      id: initial?.id, slug, name_bn: nameBn, name_en: nameEn, price: Number(price),
      compare_at_price: compare ? Number(compare) : null, stock: Number(stock), sku,
      category_id: categoryId || null, description_bn: descBn, description_en: descEn,
      meta_title: metaTitle, meta_description: metaDesc, is_active: active, images,
      rating: rating.trim() === "" ? null : Number(rating),
      review_count: reviewCount.trim() === "" ? null : Number(reviewCount),
    });
    setSaving(false);
    if (!res.ok) return setError(res.error ?? "Save failed.");
    router.push("/admin/products");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="max-w-2xl space-y-4">
      <div className="grid md:grid-cols-2 gap-4">
        <div><label className={lbl}>Product name (Bangla)</label><input value={nameBn} onChange={(e) => setNameBn(e.target.value)} placeholder="e.g. প্রিমিয়াম প্রেগনেন্সি পিলো" className={cls} /></div>
        <div><label className={lbl}>Name (English — for URL)</label><input value={nameEn} onChange={(e) => setNameEn(e.target.value)} placeholder="e.g. Premium Pregnancy Pillow" className={cls} /></div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <label className={lbl}>Category</label>
          <select value={categoryId ?? ""} onChange={(e) => setCategoryId(e.target.value)} className={cls}>
            <option value="">— Select —</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name_bn || c.name_en}</option>)}
          </select>
        </div>
        <div><label className={lbl}>Slug (URL, optional)</label><input value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="premium-pregnancy-pillow" className={cls} /></div>
      </div>

      {/* Direct ad links */}
      <div className="dc-card p-3.5" style={{ background: "var(--a-brand-soft)" }}>
        <label className="flex items-center gap-2 text-sm font-semibold mb-2"><Icon name="tracking" className="h-4 w-4" style={{ color: "var(--a-brand)" }} /> Direct ad links (per landing page)</label>
        <div className="space-y-2">
          {landingLinks.map((l) => (
            <div key={l.key || "home"}>
              <p className="text-xs dc-muted mb-0.5">{l.label}{l.key ? ` (/${l.key})` : ""}</p>
              <div className="flex items-center gap-2">
                <input readOnly value={l.url || "Enter a name or slug first…"} onFocus={(e) => e.currentTarget.select()} className="dc-input flex-1 min-w-0 font-mono text-[13px]" style={{ color: "var(--a-brand)" }} />
                <button type="button" onClick={() => copyLink(l.url, l.key || "home")} disabled={!l.url} className="dc-btn dc-btn-solid shrink-0 disabled:opacity-50" style={{ background: "var(--a-brand)", borderColor: "var(--a-brand)" }}>
                  {copiedKey === (l.key || "home") ? "✓ Copied" : "Copy"}
                </button>
              </div>
            </div>
          ))}
        </div>
        <p className="text-xs dc-muted mt-2">
          Put this link in an ad and the landing page opens with THIS product pre-selected — even if it isn't featured there.
          {!slug.trim() && " (Slug is empty — auto-generated from the name; it's finalized after you save.)"}
        </p>
      </div>

      <div className="grid md:grid-cols-4 gap-4">
        <div><label className={lbl}>Price (৳)</label><input value={price} onChange={(e) => setPrice(e.target.value)} inputMode="numeric" className={cls} /></div>
        <div><label className={lbl}>Compare-at price (৳)</label><input value={compare} onChange={(e) => setCompare(e.target.value)} inputMode="numeric" className={cls} /></div>
        <div><label className={lbl}>Stock</label><input value={stock} onChange={(e) => setStock(e.target.value)} inputMode="numeric" className={cls} /></div>
        <div><label className={lbl}>SKU</label><input value={sku} onChange={(e) => setSku(e.target.value)} className={cls} /></div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div><label className={lbl}>Rating (0–5, shown on card)</label><input value={rating} onChange={(e) => setRating(e.target.value.replace(/[^\d.]/g, ""))} inputMode="decimal" placeholder="e.g. 4.8" className={cls} /></div>
        <div><label className={lbl}>Review count</label><input value={reviewCount} onChange={(e) => setReviewCount(e.target.value.replace(/\D/g, ""))} inputMode="numeric" placeholder="e.g. 250" className={cls} /></div>
      </div>

      <div><label className={lbl}>Description (Bangla)</label><textarea value={descBn} onChange={(e) => setDescBn(e.target.value)} rows={3} className={cls} /></div>
      <div><label className={lbl}>Description (English)</label><textarea value={descEn} onChange={(e) => setDescEn(e.target.value)} rows={2} className={cls} /></div>

      <div>
        <label className={lbl}>Images (first is the main image)</label>
        <input type="file" accept="image/*" multiple onChange={onUpload} className="text-sm" />
        {uploading && <p className="text-sm dc-muted mt-1">Uploading…</p>}
        <div className="flex flex-wrap gap-2 mt-3">
          {images.map((url, idx) => (
            <div key={url} className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt="" className="h-20 w-20 object-cover rounded-lg border" style={{ borderColor: "var(--a-border)" }} />
              {idx === 0 && <span className="absolute bottom-0 left-0 text-white text-[9px] px-1 rounded-tr" style={{ background: "var(--a-brand)" }}>Main</span>}
              <div className="absolute -top-2 -right-2 flex gap-1">
                {idx > 0 && <button type="button" onClick={() => move(idx, -1)} className="bg-gray-700 text-white rounded-full h-5 w-5 text-xs">‹</button>}
                <button type="button" onClick={() => setImages((p) => p.filter((u) => u !== url))} className="bg-red-500 text-white rounded-full h-5 w-5 text-xs">×</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <details className="dc-card p-3">
        <summary className="text-sm cursor-pointer font-medium">SEO settings (optional)</summary>
        <div className="mt-3 space-y-3">
          <div><label className={lbl}>Meta Title</label><input value={metaTitle} onChange={(e) => setMetaTitle(e.target.value)} className={cls} /></div>
          <div><label className={lbl}>Meta Description</label><textarea value={metaDesc} onChange={(e) => setMetaDesc(e.target.value)} rows={2} className={cls} /></div>
        </div>
      </details>

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} className="h-4 w-4 accent-gray-900" />
        Active (visible in store)
      </label>

      {error && <p className="rounded-lg border px-3 py-2 text-sm" style={{ background: "#fdeaea", borderColor: "#f5c9c9", color: "#b91c1c" }}>{error}</p>}

      <div className="flex gap-3">
        <button type="submit" disabled={saving || uploading} className="dc-btn dc-btn-solid disabled:opacity-60" style={{ background: "var(--a-violet)", borderColor: "var(--a-violet)" }}>
          {saving ? "Saving…" : "Save product"}
        </button>
        <a href="/admin/products" className="dc-btn">Cancel</a>
      </div>
    </form>
  );
}
