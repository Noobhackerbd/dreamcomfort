"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase/ssr-browser";
import { Icon } from "@/components/admin/icons";
import { saveProduct, previewTranslate, aiAutofill, ProductInput } from "./actions";
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
  const [name, setName] = useState(initial?.name_bn || initial?.name_en || "");
  const [slug, setSlug] = useState(initial?.slug ?? "");
  const [tPreview, setTPreview] = useState<{ name?: { bn: string; en: string }; description?: { bn: string; en: string } } | null>(null);
  const [tBusy, setTBusy] = useState(false);
  const [price, setPrice] = useState(initial?.price?.toString() ?? "");
  const [compare, setCompare] = useState(initial?.compare_at_price?.toString() ?? "");
  const [stock, setStock] = useState(initial?.stock?.toString() ?? "0");
  const [sku, setSku] = useState(initial?.sku ?? "");
  const [categoryId, setCategoryId] = useState(initial?.category_id ?? "");
  const [description, setDescription] = useState(initial?.description_bn || initial?.description_en || "");
  const [metaTitle, setMetaTitle] = useState(initial?.meta_title ?? "");
  const [metaDesc, setMetaDesc] = useState(initial?.meta_description ?? "");
  const [active, setActive] = useState(initial?.is_active ?? true);
  const [rating, setRating] = useState(initial?.rating != null ? String(initial.rating) : "");
  const [reviewCount, setReviewCount] = useState(initial?.review_count != null ? String(initial.review_count) : "");
  const [highlightsText, setHighlightsText] = useState((initial as any)?.highlights_text ?? "");
  const [specsText, setSpecsText] = useState((initial as any)?.specs_text ?? "");
  const [howToUse, setHowToUse] = useState((initial as any)?.how_to_use ?? "");
  const [faqText, setFaqText] = useState((initial as any)?.faq_text ?? "");
  const [videoUrl, setVideoUrl] = useState((initial as any)?.video_url ?? "");
  const [images, setImages] = useState<string[]>(initial?.images ?? []);
  const [descImages, setDescImages] = useState<string[]>((initial as any)?.description_images ?? []);
  const [uploadingDesc, setUploadingDesc] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [afBusy, setAfBusy] = useState(false);
  const [afMsg, setAfMsg] = useState<string | null>(null);
  const [afOverwrite, setAfOverwrite] = useState(false);

  const effectiveSlug = slugify(slug || name);
  const BENGALI = /[ঀ-৿]/;

  async function runPreview() {
    setTBusy(true); setError(null);
    const res = await previewTranslate({ name, description });
    setTBusy(false);
    if (!res.ok) { setError(res.error ?? "Translation failed."); return; }
    setTPreview({ name: res.name, description: res.description });
  }
  /** AI auto-fill: drafts every content field from the name (+ first photo). Only
   *  empty fields are filled unless "Replace existing text" is ticked. */
  async function runAutofill() {
    if (!name.trim()) { setError("Enter the product name first."); return; }
    setAfBusy(true); setAfMsg(null); setError(null);
    const res = await aiAutofill({ name, description, imageUrl: images[0] });
    setAfBusy(false);
    if (!res.ok) { setError(res.error); return; }
    const d = res.data;
    const filled: string[] = [];
    const put = (label: string, current: string, next: string, set: (v: string) => void) => {
      if (!next) return;
      if (afOverwrite || !current.trim()) { set(next); filled.push(label); }
    };
    put("Description", description, d.description, setDescription);
    put("Highlights", highlightsText, d.highlights.join("\n"), setHighlightsText);
    put("Specifications", specsText, d.specs.map((x) => `${x.label}: ${x.value}`).join("\n"), setSpecsText);
    put("How to use", howToUse, d.howToUse, setHowToUse);
    put("FAQ", faqText, d.faq.map((x) => `${x.q} | ${x.a}`).join("\n"), setFaqText);
    put("Slug", slug, d.slug, setSlug);
    put("Meta title", metaTitle, d.metaTitle, setMetaTitle);
    put("Meta description", metaDesc, d.metaDescription, setMetaDesc);
    if (d.categoryId && (afOverwrite || !categoryId)) { setCategoryId(d.categoryId); filled.push("Category"); }
    setTPreview(null);
    setAfMsg(filled.length
      ? `✓ Filled: ${filled.join(", ")}. Please review before saving.`
      : "Nothing empty to fill. Tick “Replace existing text” to regenerate.");
  }

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

  async function onUploadDesc(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    setUploadingDesc(true); setError(null);
    const supabase = getSupabaseBrowserClient();
    const uploaded: string[] = [];
    for (const file of files) {
      const ext = file.name.split(".").pop();
      const path = `desc-${Date.now()}-${Math.floor(Math.random() * 1e6)}.${ext}`;
      const { error } = await supabase.storage.from("product-images").upload(path, file, { cacheControl: "3600", upsert: false });
      if (error) { setError("Image upload failed: " + error.message); continue; }
      const { data } = supabase.storage.from("product-images").getPublicUrl(path);
      uploaded.push(data.publicUrl);
    }
    setDescImages((prev) => [...prev, ...uploaded]);
    setUploadingDesc(false);
  }

  function moveDesc(idx: number, dir: -1 | 1) {
    setDescImages((prev) => {
      const next = [...prev]; const j = idx + dir;
      if (j < 0 || j >= next.length) return prev;
      [next[idx], next[j]] = [next[j], next[idx]];
      return next;
    });
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
    if (!name.trim()) return setError("Enter a product name.");
    if (!Number(price)) return setError("Enter a valid price.");
    setSaving(true);
    // Route the single Name/Description into the right language column; the server
    // AI-fills the OTHER language automatically.
    const nameIsBn = BENGALI.test(name);
    const descIsBn = BENGALI.test(description);
    const res = await saveProduct({
      id: initial?.id, slug,
      name_bn: nameIsBn ? name : "", name_en: nameIsBn ? "" : name,
      price: Number(price),
      compare_at_price: compare ? Number(compare) : null, stock: Number(stock), sku,
      category_id: categoryId || null,
      description_bn: descIsBn ? description : "", description_en: descIsBn ? "" : description,
      meta_title: metaTitle, meta_description: metaDesc, is_active: active, images,
      description_images: descImages,
      rating: rating.trim() === "" ? null : Number(rating),
      review_count: reviewCount.trim() === "" ? null : Number(reviewCount),
      highlights_text: highlightsText, specs_text: specsText, how_to_use: howToUse, faq_text: faqText, video_url: videoUrl,
    });
    setSaving(false);
    if (!res.ok) return setError(res.error ?? "Save failed.");
    router.push("/admin/products");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="max-w-2xl space-y-4">
      <div>
        <label className={lbl}>Product name</label>
        <input value={name} onChange={(e) => { setName(e.target.value); setTPreview(null); }} placeholder="Type in Bangla or English — e.g. প্রিমিয়াম প্রেগনেন্সি পিলো" className={cls} />
        <p className="text-xs dc-muted mt-1">
          ✨ Type the name in <b>one</b> language. AI creates the other language automatically when you save.{" "}
          <button type="button" onClick={runPreview} disabled={tBusy || (!name.trim() && !description.trim())} className="underline disabled:opacity-50" style={{ color: "var(--a-brand)" }}>
            {tBusy ? "Translating…" : "Preview AI translation"}
          </button>
        </p>
      </div>

      {/* AI auto-fill */}
      <div className="dc-card p-3.5 flex flex-wrap items-center gap-3" style={{ background: "var(--a-violet-soft)" }}>
        <button type="button" onClick={runAutofill} disabled={afBusy || !name.trim()}
          className="dc-btn dc-btn-solid disabled:opacity-60" style={{ background: "var(--a-violet)", borderColor: "var(--a-violet)" }}>
          {afBusy ? "AI is writing…" : "✨ AI Auto-fill"}
        </button>
        <label className="flex items-center gap-1.5 text-xs cursor-pointer select-none">
          <input type="checkbox" checked={afOverwrite} onChange={(e) => setAfOverwrite(e.target.checked)} className="h-3.5 w-3.5 accent-gray-900" />
          Replace existing text
        </label>
        <p className="text-xs dc-muted basis-full">
          Fills description, highlights, specs, how-to-use, FAQ, category, slug &amp; SEO from the name{images.length ? " and the first photo" : " (upload a photo first for better results)"}. It won&apos;t invent sizes, materials or health claims — add those yourself.
        </p>
        {afMsg && <p className="text-xs basis-full" style={{ color: "var(--a-ok)" }}>{afMsg}</p>}
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

      <div>
        <label className={lbl}>Description</label>
        <textarea value={description} onChange={(e) => { setDescription(e.target.value); setTPreview(null); }} rows={3} placeholder="Type in one language — AI translates the other on save." className={cls} />
      </div>

      {/* AI translation preview (read-only) */}
      {tPreview && (tPreview.name?.en || tPreview.name?.bn || tPreview.description?.en || tPreview.description?.bn) && (
        <div className="dc-card p-3.5 space-y-2" style={{ background: "var(--a-brand-soft)" }}>
          <p className="text-sm font-semibold">✨ AI translation preview <span className="dc-muted font-normal">(this is what will be saved)</span></p>
          {tPreview.name && (
            <div className="grid md:grid-cols-2 gap-3 text-sm">
              <div><span className="dc-muted text-xs block">Name (Bangla)</span>{tPreview.name.bn || "—"}</div>
              <div><span className="dc-muted text-xs block">Name (English)</span>{tPreview.name.en || "—"}</div>
            </div>
          )}
          {tPreview.description && (tPreview.description.bn || tPreview.description.en) && (
            <div className="grid md:grid-cols-2 gap-3 text-sm">
              <div><span className="dc-muted text-xs block">Description (Bangla)</span><span className="whitespace-pre-line">{tPreview.description.bn || "—"}</span></div>
              <div><span className="dc-muted text-xs block">Description (English)</span><span className="whitespace-pre-line">{tPreview.description.en || "—"}</span></div>
            </div>
          )}
        </div>
      )}

      {/* Description photos — shown as "পণ্যের বিস্তারিত" (long details) on the product page */}
      <div>
        <label className={lbl}>Description photos <span className="dc-muted font-normal">(optional — long detail images shown on the product page)</span></label>
        <input type="file" accept="image/*" multiple onChange={onUploadDesc} className="text-sm" />
        {uploadingDesc && <p className="text-sm dc-muted mt-1">Uploading…</p>}
        <div className="flex flex-wrap gap-2 mt-3">
          {descImages.map((url, idx) => (
            <div key={url} className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt="" className="h-20 w-20 object-cover rounded-lg border" style={{ borderColor: "var(--a-border)" }} />
              <div className="absolute -top-2 -right-2 flex gap-1">
                {idx > 0 && <button type="button" onClick={() => moveDesc(idx, -1)} className="bg-gray-700 text-white rounded-full h-5 w-5 text-xs">‹</button>}
                <button type="button" onClick={() => setDescImages((p) => p.filter((u) => u !== url))} className="bg-red-500 text-white rounded-full h-5 w-5 text-xs">×</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Premium product-page content (all optional) */}
      <div className="dc-card p-3.5 space-y-3" style={{ background: "var(--a-surface-2)" }}>
        <p className="text-sm font-semibold">Premium page content <span className="dc-muted font-normal">(optional — shown on the product page)</span></p>
        <div><label className={lbl}>Highlights — one per line</label><textarea value={highlightsText} onChange={(e) => setHighlightsText(e.target.value)} rows={3} placeholder={"আরামদায়ক ফ্যাব্রিক\nমেশিন ওয়াশেবল\n১০০% কটন"} className={cls} /></div>
        <div><label className={lbl}>Specifications — one per line as “Label: Value”</label><textarea value={specsText} onChange={(e) => setSpecsText(e.target.value)} rows={3} placeholder={"উপাদান: কটন\nসাইজ: ফ্রি\nওজন: ৮০০ গ্রাম"} className={cls} /></div>
        <div><label className={lbl}>How to use</label><textarea value={howToUse} onChange={(e) => setHowToUse(e.target.value)} rows={2} className={cls} /></div>
        <div><label className={lbl}>FAQ — one per line as “Question | Answer”</label><textarea value={faqText} onChange={(e) => setFaqText(e.target.value)} rows={3} placeholder={"ওয়াশ করা যাবে? | হ্যাঁ, মেশিন ওয়াশেবল।\nডেলিভারিতে কত দিন? | ঢাকায় ১–২ দিন।"} className={cls} /></div>
        <div><label className={lbl}>Product video URL (YouTube / mp4, optional)</label><input value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} placeholder="https://youtu.be/..." className={cls} /></div>
      </div>

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
