"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase/ssr-browser";
import { saveLanding } from "./actions";
import type { LandingConfig } from "@/lib/landing";

interface ProductOpt { slug: string; name: string; price?: number; image?: string | null }

const cls = "dc-input py-2";

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
  const [dragIdx, setDragIdx] = useState<number | null>(null);

  const slugs = c.productSlugs ?? [];
  const bySlug = new Map(products.map((p) => [p.slug, p]));
  const selected = slugs.map((s) => bySlug.get(s)).filter(Boolean) as ProductOpt[];
  const available = products.filter((p) => !slugs.includes(p.slug));

  function setSlugs(next: string[]) {
    setC((prev) => ({ ...prev, productSlugs: next, productSlug: next[0] ?? "" }));
    setSaved(false);
  }
  function addProduct(slug: string) { setSlugs([...slugs, slug]); }
  function removeProduct(slug: string) { setSlugs(slugs.filter((s) => s !== slug)); }
  function move(from: number, to: number) {
    if (to < 0 || to >= slugs.length || from === to) return;
    const next = slugs.slice();
    const [m] = next.splice(from, 1);
    next.splice(to, 0, m);
    setSlugs(next);
  }

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
      if (!res?.ok) { setSaveError(res?.error || "Save failed."); return; }
      setSaved(true);
      router.refresh();
    } catch (e: any) {
      setSaveError(e?.message || "Save failed.");
    } finally {
      setSaving(false);
    }
  }

  const iconBtn = "h-7 w-7 rounded-lg border text-sm disabled:opacity-30 flex items-center justify-center";

  return (
    <div className="space-y-5 max-w-3xl">
      {/* Hero product + logo */}
      <section className="dc-card p-5 space-y-3">
        <h2 className="font-bold text-[15px]">Main products &amp; logo</h2>
        <div>
          <label className="block text-sm font-medium dc-muted mb-1">Landing page products (drag to order)</label>
          <p className="text-xs dc-muted mb-2">Drag up/down or use ▲▼ to reorder — customers see products in this order. If none are chosen, all active products show.</p>

          {selected.length === 0 ? (
            <p className="rounded-lg p-3 text-sm dc-muted" style={{ border: "1px dashed var(--a-border)" }}>No products selected — add from below.</p>
          ) : (
            <div className="rounded-lg divide-y" style={{ border: "1px solid var(--a-border)" }}>
              {selected.map((p, idx) => (
                <div
                  key={p.slug}
                  draggable
                  onDragStart={() => setDragIdx(idx)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => { if (dragIdx !== null) move(dragIdx, idx); setDragIdx(null); }}
                  onDragEnd={() => setDragIdx(null)}
                  className={"flex items-center gap-2 px-2 py-2 " + (dragIdx === idx ? "opacity-50" : "")}
                >
                  <span className="cursor-grab select-none px-1" style={{ color: "var(--a-faint)" }} title="Drag">⠿</span>
                  <span className="w-5 text-center text-xs dc-muted">{idx + 1}</span>
                  {p.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.image} alt="" className="h-9 w-9 rounded object-cover" />
                  ) : (
                    <span className="h-9 w-9 rounded" style={{ background: "var(--a-surface-2)" }} />
                  )}
                  <span className="flex-1 min-w-0 truncate text-sm">{p.name}</span>
                  <div className="flex items-center gap-1">
                    <button type="button" onClick={() => move(idx, idx - 1)} disabled={idx === 0} className={iconBtn} style={{ borderColor: "var(--a-border)" }}>▲</button>
                    <button type="button" onClick={() => move(idx, idx + 1)} disabled={idx === selected.length - 1} className={iconBtn} style={{ borderColor: "var(--a-border)" }}>▼</button>
                    <button type="button" onClick={() => removeProduct(p.slug)} className={iconBtn} style={{ borderColor: "#f0c9c9", color: "#dc2626" }} title="Remove">×</button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {available.length > 0 && (
            <div className="mt-3">
              <label className="block text-xs font-medium dc-muted mb-1">Add a product</label>
              <div className="max-h-40 overflow-y-auto rounded-lg divide-y" style={{ border: "1px solid var(--a-border)" }}>
                {available.map((p) => (
                  <button type="button" key={p.slug} onClick={() => addProduct(p.slug)} className="w-full flex items-center gap-2 px-2 py-2 text-left text-sm hover:bg-[var(--a-surface-2)]">
                    {p.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.image} alt="" className="h-8 w-8 rounded object-cover" />
                    ) : (
                      <span className="h-8 w-8 rounded" style={{ background: "var(--a-surface-2)" }} />
                    )}
                    <span className="flex-1 min-w-0 truncate">{p.name}</span>
                    <span className="text-lg leading-none" style={{ color: "var(--a-violet)" }}>＋</span>
                  </button>
                ))}
              </div>
            </div>
          )}
          {products.length === 0 && <p className="mt-2 text-sm dc-muted">No products — <a href="/admin/products" className="underline" style={{ color: "var(--a-brand)" }}>add a product</a> first.</p>}
          {selected.length > 0 && <p className="text-xs dc-muted mt-2">{selected.length} product(s) selected.</p>}
        </div>
        <div>
          <label className="block text-sm font-medium dc-muted mb-1">Logo</label>
          <div className="flex items-center gap-3">
            {c.logoUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={c.logoUrl} alt="logo" className="h-10 w-auto object-contain rounded p-1" style={{ border: "1px solid var(--a-border)" }} />
            )}
            <label className="text-sm cursor-pointer" style={{ color: "var(--a-brand)" }}>
              {c.logoUrl ? "Change" : "Upload"} {busy && "…"}
              <input type="file" accept="image/*" className="hidden" onChange={async (e) => {
                const f = e.target.files?.[0]; if (!f) return; setBusy(true);
                const url = await uploadImage(f); setBusy(false); if (url) set("logoUrl", url);
              }} />
            </label>
            {c.logoUrl && <button onClick={() => set("logoUrl", "")} className="text-sm" style={{ color: "#dc2626" }}>Remove</button>}
          </div>
        </div>
      </section>

      {/* Headline / copy */}
      <section className="dc-card p-5 space-y-3">
        <h2 className="font-bold text-[15px]">Headline &amp; text</h2>
        <div><label className="block text-sm font-medium dc-muted mb-1">Headline</label><input value={c.headline} onChange={(e) => set("headline", e.target.value)} className={cls} /></div>
        <div><label className="block text-sm font-medium dc-muted mb-1">Sub-headline</label><textarea value={c.subheadline} onChange={(e) => set("subheadline", e.target.value)} rows={2} className={cls} /></div>
        <div className="grid sm:grid-cols-2 gap-3">
          <div><label className="block text-sm font-medium dc-muted mb-1">Urgency text</label><input value={c.urgencyText} onChange={(e) => set("urgencyText", e.target.value)} className={cls} /></div>
          <div><label className="block text-sm font-medium dc-muted mb-1">Stat (e.g. 5000+ happy moms)</label><input value={c.statText} onChange={(e) => set("statText", e.target.value)} className={cls} /></div>
          <div><label className="block text-sm font-medium dc-muted mb-1">Button text (CTA)</label><input value={c.ctaText} onChange={(e) => set("ctaText", e.target.value)} className={cls} /></div>
        </div>
      </section>

      {/* Hero images note */}
      <section className="dc-card p-5">
        <h2 className="font-bold text-[15px] mb-1">Hero images (slider)</h2>
        <p className="text-sm dc-muted">The hero slider is built from each <b>product&apos;s own images</b>. For a multi-image slideshow, <a href="/admin/products" className="underline" style={{ color: "var(--a-brand)" }}>edit the product</a> and upload multiple images — they show as a slideshow when the customer picks that product.</p>
      </section>

      {/* Badges */}
      <section className="dc-card p-5">
        <h2 className="font-bold text-[15px] mb-2">Badges / promises</h2>
        {c.badges.map((b, idx) => (
          <div key={idx} className="flex gap-2 mb-2">
            <input value={b} onChange={(e) => set("badges", c.badges.map((x, i) => i === idx ? e.target.value : x))} className={cls} />
            <button onClick={() => set("badges", c.badges.filter((_, i) => i !== idx))} className="text-sm px-2" style={{ color: "#dc2626" }}>✕</button>
          </div>
        ))}
        <button onClick={() => set("badges", [...c.badges, ""])} className="text-sm" style={{ color: "var(--a-violet)" }}>+ Add badge</button>
      </section>

      {/* Benefits */}
      <section className="dc-card p-5">
        <h2 className="font-bold text-[15px] mb-2">Benefits</h2>
        {c.benefits.map((b, idx) => (
          <div key={idx} className="grid grid-cols-[60px_1fr_1fr_auto] gap-2 mb-2 items-center">
            <input value={b.icon} onChange={(e) => set("benefits", c.benefits.map((x, i) => i === idx ? { ...x, icon: e.target.value } : x))} placeholder="🛌" className={cls} />
            <input value={b.title} onChange={(e) => set("benefits", c.benefits.map((x, i) => i === idx ? { ...x, title: e.target.value } : x))} placeholder="Title" className={cls} />
            <input value={b.text} onChange={(e) => set("benefits", c.benefits.map((x, i) => i === idx ? { ...x, text: e.target.value } : x))} placeholder="Description" className={cls} />
            <button onClick={() => set("benefits", c.benefits.filter((_, i) => i !== idx))} className="text-sm" style={{ color: "#dc2626" }}>✕</button>
          </div>
        ))}
        <button onClick={() => set("benefits", [...c.benefits, { icon: "✅", title: "", text: "" }])} className="text-sm" style={{ color: "var(--a-violet)" }}>+ Add benefit</button>
      </section>

      {/* Guarantee */}
      <section className="dc-card p-5 space-y-3">
        <h2 className="font-bold text-[15px]">Guarantee</h2>
        <input value={c.guaranteeTitle} onChange={(e) => set("guaranteeTitle", e.target.value)} placeholder="Guarantee title" className={cls} />
        <textarea value={c.guaranteeText} onChange={(e) => set("guaranteeText", e.target.value)} rows={2} placeholder="Guarantee description" className={cls} />
      </section>

      {/* Reviews */}
      <section className="dc-card p-5">
        <h2 className="font-bold text-[15px] mb-2">Reviews</h2>
        {c.reviews.map((r, idx) => (
          <div key={idx} className="rounded-lg p-3 mb-2 space-y-2" style={{ border: "1px solid var(--a-border)" }}>
            <div className="grid grid-cols-[1fr_80px_auto] gap-2 items-center">
              <input value={r.name} onChange={(e) => set("reviews", c.reviews.map((x, i) => i === idx ? { ...x, name: e.target.value } : x))} placeholder="Name" className={cls} />
              <select value={r.stars} onChange={(e) => set("reviews", c.reviews.map((x, i) => i === idx ? { ...x, stars: Number(e.target.value) } : x))} className={cls}>
                {[5, 4, 3, 2, 1].map((s) => <option key={s} value={s}>{s} ★</option>)}
              </select>
              <button onClick={() => set("reviews", c.reviews.filter((_, i) => i !== idx))} className="text-sm px-2" style={{ color: "#dc2626" }}>✕</button>
            </div>
            <textarea value={r.text} onChange={(e) => set("reviews", c.reviews.map((x, i) => i === idx ? { ...x, text: e.target.value } : x))} rows={2} placeholder="Review text" className={cls} />
            <div className="flex items-center gap-2">
              {r.image && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={r.image} alt="" className="h-8 w-8 rounded-full object-cover" />
              )}
              <label className="text-xs cursor-pointer" style={{ color: "var(--a-brand)" }}>
                {r.image ? "Change photo" : "Add photo (optional)"}
                <input type="file" accept="image/*" className="hidden" onChange={async (e) => {
                  const f = e.target.files?.[0]; if (!f) return; setBusy(true);
                  const u = await uploadImage(f); setBusy(false);
                  if (u) set("reviews", c.reviews.map((x, i) => i === idx ? { ...x, image: u } : x));
                }} />
              </label>
            </div>
          </div>
        ))}
        <button onClick={() => set("reviews", [...c.reviews, { name: "", text: "", stars: 5 }])} className="text-sm" style={{ color: "var(--a-violet)" }}>+ Add review</button>
      </section>

      {/* Save bar */}
      <div className="sticky bottom-3 dc-card p-3" style={{ boxShadow: "var(--a-shadow-lg)" }}>
        <div className="flex items-center gap-3">
          <button onClick={save} disabled={saving} className="dc-btn dc-btn-solid disabled:opacity-60" style={{ background: "var(--a-violet)", borderColor: "var(--a-violet)" }}>
            {saving ? "Saving…" : "Save landing page"}
          </button>
          {saved && <span className="text-sm" style={{ color: "var(--a-ok)" }}>Saved ✓</span>}
          <a href="/" target="_blank" className="text-sm hover:underline ml-auto" style={{ color: "var(--a-brand)" }}>View landing page →</a>
        </div>
        {saveError && (
          <p className="mt-2 rounded-lg px-3 py-2 text-sm" style={{ background: "#fdeaea", border: "1px solid #f0c9c9", color: "#b91c1c" }}>
            ⚠️ {saveError} — the <code>settings</code> table may not exist yet. Run <b>supabase-migration-2.sql</b> in the Supabase SQL editor.
          </p>
        )}
      </div>
    </div>
  );
}
