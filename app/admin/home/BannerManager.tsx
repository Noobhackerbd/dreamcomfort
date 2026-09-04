"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase/ssr-browser";
import { Icon } from "@/components/admin/icons";
import { saveHomeBanners } from "./actions";
import type { HomeBanner, HomeBannersSettings } from "@/lib/settings";

async function uploadImage(file: File): Promise<string | null> {
  const supabase = getSupabaseBrowserClient();
  const ext = file.name.split(".").pop();
  const path = `home/${Date.now()}-${Math.floor(Math.random() * 1e6)}.${ext}`;
  const { error } = await supabase.storage.from("product-images").upload(path, file, { cacheControl: "3600" });
  if (error) return null;
  return supabase.storage.from("product-images").getPublicUrl(path).data.publicUrl;
}

function BannerList({
  title, hint, aspect, items, setItems,
}: {
  title: string; hint: string; aspect: string; items: HomeBanner[]; setItems: (v: HomeBanner[]) => void;
}) {
  const [busy, setBusy] = useState(false);

  async function onUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    setBusy(true);
    const added: HomeBanner[] = [];
    for (const f of files) {
      const url = await uploadImage(f);
      if (url) added.push({ image: url, link: "" });
    }
    setItems([...items, ...added]);
    setBusy(false);
    e.target.value = "";
  }
  function move(i: number, d: -1 | 1) {
    const j = i + d;
    if (j < 0 || j >= items.length) return;
    const next = items.slice();
    [next[i], next[j]] = [next[j], next[i]];
    setItems(next);
  }
  function setLink(i: number, link: string) { setItems(items.map((b, idx) => (idx === i ? { ...b, link } : b))); }
  function remove(i: number) { setItems(items.filter((_, idx) => idx !== i)); }

  return (
    <section className="dc-card p-5">
      <h2 className="font-bold text-[15px]">{title}</h2>
      <p className="text-xs dc-muted mb-3">{hint}</p>

      <div className="space-y-2.5">
        {items.map((b, i) => (
          <div key={i} className="flex items-center gap-3 rounded-xl p-2" style={{ border: "1px solid var(--a-border)" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={b.image} alt="" className="rounded-lg object-cover shrink-0" style={{ width: 96, aspectRatio: aspect, background: "var(--a-surface-2)" }} />
            <div className="flex-1 min-w-0">
              <label className="block text-[11px] dc-muted mb-1">Link (optional — e.g. /product/slug or /products)</label>
              <input value={b.link ?? ""} onChange={(e) => setLink(i, e.target.value)} placeholder="/products" className="dc-input py-1.5 text-[13px]" />
            </div>
            <div className="flex flex-col shrink-0">
              <button onClick={() => move(i, -1)} disabled={i === 0} className="dc-act dc-act-sm disabled:opacity-30" title="Up"><Icon name="chevronDown" className="h-3.5 w-3.5 rotate-180" /></button>
              <button onClick={() => move(i, 1)} disabled={i === items.length - 1} className="dc-act dc-act-sm disabled:opacity-30" title="Down"><Icon name="chevronDown" className="h-3.5 w-3.5" /></button>
            </div>
            <button onClick={() => remove(i)} className="dc-act dc-act-sm shrink-0" style={{ color: "#dc2626" }} title="Remove"><Icon name="trash" className="h-4 w-4" /></button>
          </div>
        ))}
        {items.length === 0 && <p className="text-sm dc-muted py-2">No images yet.</p>}
      </div>

      <label className="mt-3 inline-flex items-center gap-2 dc-btn cursor-pointer">
        <Icon name="image" className="h-4 w-4" /> {busy ? "Uploading…" : "Upload image(s)"}
        <input type="file" accept="image/*" multiple onChange={onUpload} className="hidden" />
      </label>
    </section>
  );
}

export function BannerManager({ initial }: { initial: HomeBannersSettings }) {
  const router = useRouter();
  const [hero, setHero] = useState<HomeBanner[]>(initial?.hero ?? []);
  const [offers, setOffers] = useState<HomeBanner[]>(initial?.offers ?? []);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function save() {
    setSaving(true); setSaved(false); setErr(null);
    const res = await saveHomeBanners({ hero, offers });
    setSaving(false);
    if (!res.ok) { setErr(res.error ?? "Save failed."); return; }
    setSaved(true);
    router.refresh();
  }

  return (
    <div className="max-w-2xl space-y-5">
      <BannerList
        title="🖼️ Hero slider" aspect="16 / 10"
        hint="Wide banner images shown at the top as an auto-slider. Recommended ~1200×750. Text should be part of the image."
        items={hero} setItems={setHero}
      />
      <BannerList
        title="🏷️ Offer banners" aspect="16 / 8"
        hint="Promo banners shown lower on the homepage (also an auto-slider). Leave empty to hide the section."
        items={offers} setItems={setOffers}
      />

      <div className="sticky bottom-3 dc-card p-3" style={{ boxShadow: "var(--a-shadow-lg)" }}>
        <div className="flex items-center gap-3">
          <button onClick={save} disabled={saving} className="dc-btn dc-btn-solid disabled:opacity-60" style={{ background: "var(--a-violet)", borderColor: "var(--a-violet)" }}>
            {saving ? "Saving…" : "Save banners"}
          </button>
          {saved && <span className="text-sm" style={{ color: "var(--a-ok)" }}>Saved ✓</span>}
          {err && <span className="text-sm" style={{ color: "#dc2626" }}>{err}</span>}
          <a href="/" target="_blank" className="text-sm hover:underline ml-auto" style={{ color: "var(--a-brand)" }}>View homepage →</a>
        </div>
      </div>
    </div>
  );
}
