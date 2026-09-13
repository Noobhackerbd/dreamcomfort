"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase/ssr-browser";
import { saveHomeStrip } from "./actions";
import type { HomeStripSettings } from "@/lib/settings";

async function uploadGif(file: File): Promise<string | null> {
  const supabase = getSupabaseBrowserClient();
  const ext = file.name.split(".").pop() || "gif";
  const path = `home/strip-${Date.now()}-${Math.floor(Math.random() * 1e6)}.${ext}`;
  const { error } = await supabase.storage.from("product-images").upload(path, file, { cacheControl: "3600", contentType: file.type || "image/gif" });
  if (error) return null;
  return supabase.storage.from("product-images").getPublicUrl(path).data.publicUrl;
}

export function StripManager({ initial }: { initial: HomeStripSettings }) {
  const router = useRouter();
  const [gif, setGif] = useState(initial?.gif ?? "");
  const [link, setLink] = useState(initial?.link ?? "");
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function onUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setErr(null);
    if (file.size > 5 * 1024 * 1024) { setErr("ফাইলটি অনেক বড় (৫MB এর নিচে দিন)।"); return; }
    setBusy(true);
    const url = await uploadGif(file);
    setBusy(false);
    if (!url) { setErr("আপলোড ব্যর্থ।"); return; }
    setGif(url); setSaved(false);
  }

  async function save() {
    setSaving(true); setSaved(false); setErr(null);
    const res = await saveHomeStrip({ gif, link });
    setSaving(false);
    if (!res.ok) { setErr(res.error ?? "Save failed."); return; }
    setSaved(true); router.refresh();
  }

  return (
    <section className="dc-card p-5 mt-5">
      <div className="flex items-center gap-2.5 mb-1">
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg shrink-0" style={{ background: "#e8f0fe", color: "#2563eb" }}>🎞️</span>
        <h2 className="font-bold text-[15.5px]">ব্যানারের নিচে GIF স্ট্রিপ</h2>
      </div>
      <p className="text-xs dc-muted mb-1 leading-relaxed">হিরো ব্যানারের ঠিক নিচে একটি স্লিম GIF/ছবি দেখানো হবে (আগের ট্রাস্ট-ব্যাজ সেকশনের জায়গায়)।</p>
      <p className="text-xs mb-4 leading-relaxed" style={{ color: "#F0530E" }}>
        <b>সাইজ:</b> প্রস্থ ১২০০px × উচ্চতা ~২০০px (স্লিম ওয়াইড ব্যানার) · ফরম্যাট GIF/JPG/PNG · সর্বোচ্চ ৫MB
      </p>

      {gif ? (
        <div className="mb-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={gif} alt="strip preview" className="w-full h-auto rounded-xl ring-1 ring-black/5" />
          <button type="button" onClick={() => { setGif(""); setSaved(false); }} className="mt-2 text-xs underline" style={{ color: "#dc2626" }}>GIF সরান</button>
        </div>
      ) : (
        <p className="text-sm dc-muted mb-3">এখনো কোনো GIF যোগ করা হয়নি।</p>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <label className="inline-flex items-center gap-2 dc-btn cursor-pointer">
          {busy ? "Uploading…" : (gif ? "GIF পরিবর্তন করুন" : "GIF আপলোড করুন")}
          <input type="file" accept="image/gif,image/png,image/jpeg,image/webp" onChange={onUpload} className="hidden" disabled={busy} />
        </label>
      </div>

      <div className="mt-3">
        <label className="block text-[13px] font-medium dc-muted mb-1">লিংক (ঐচ্ছিক — ট্যাপ করলে যেখানে যাবে, যেমন /products)</label>
        <input value={link} onChange={(e) => { setLink(e.target.value); setSaved(false); }} placeholder="/products" className="dc-input" />
      </div>

      <div className="mt-4 flex items-center">
        <button onClick={save} disabled={saving || busy} className="dc-btn dc-btn-solid disabled:opacity-60" style={{ background: "var(--a-violet)", borderColor: "var(--a-violet)" }}>
          {saving ? "Saving…" : "Save"}
        </button>
        {saved && <span className="text-sm ml-3" style={{ color: "var(--a-ok)" }}>Saved ✓</span>}
        {err && <span className="text-sm ml-3" style={{ color: "#dc2626" }}>{err}</span>}
      </div>
    </section>
  );
}
