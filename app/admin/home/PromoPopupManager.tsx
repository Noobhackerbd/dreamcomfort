"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase/ssr-browser";
import { savePromoPopup } from "./actions";
import type { PromoPopupSettings } from "@/lib/settings";

async function uploadImage(file: File): Promise<string | null> {
  const supabase = getSupabaseBrowserClient();
  const ext = file.name.split(".").pop() || "jpg";
  const path = `promo/popup-${Date.now()}-${Math.floor(Math.random() * 1e6)}.${ext}`;
  const { error } = await supabase.storage.from("product-images").upload(path, file, { cacheControl: "604800", contentType: file.type || "image/jpeg" });
  if (error) return null;
  return supabase.storage.from("product-images").getPublicUrl(path).data.publicUrl;
}

export function PromoPopupManager({ initial }: { initial: PromoPopupSettings }) {
  const router = useRouter();
  const [enabled, setEnabled] = useState(!!initial?.enabled);
  const [image, setImage] = useState(initial?.image ?? "");
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
    const url = await uploadImage(file);
    setBusy(false);
    if (!url) { setErr("আপলোড ব্যর্থ।"); return; }
    setImage(url); setSaved(false);
  }

  async function save() {
    setSaving(true); setSaved(false); setErr(null);
    const res = await savePromoPopup({ enabled, image, link });
    setSaving(false);
    if (!res.ok) { setErr(res.error ?? "Save failed."); return; }
    setSaved(true); router.refresh();
  }

  return (
    <section className="dc-card p-5 mt-5">
      <div className="flex items-center gap-2.5 mb-1">
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg shrink-0" style={{ background: "#fde8dd", color: "#F0530E" }}>🎁</span>
        <h2 className="font-bold text-[15.5px]">প্রোমো পপ-আপ (প্রথম ভিজিটে)</h2>
      </div>
      <p className="text-xs dc-muted mb-1 leading-relaxed">ভিজিটর সাইটে ঢুকলে একটি ব্যানার পপ-আপ দেখানো হবে (অফার/ডিসকাউন্ট)। একই সেশনে একবারই দেখাবে; “আর দেখাবেন না” চাপলে আর দেখাবে না। নতুন ব্যানার আপলোড করলে সবাই আবার একবার দেখবে।</p>
      <p className="text-xs mb-4 leading-relaxed" style={{ color: "#F0530E" }}>
        <b>সাইজ:</b> পোর্ট্রেট ব্যানার — প্রস্থ ~৮০০px × উচ্চতা ~১০০০px (৪:৫ অনুপাত) · JPG/PNG/WebP · সর্বোচ্চ ৫MB<br />
        <span className="text-gray-500">💡 ছবিতেই সব লেখা/অফার বসিয়ে দিন। পেজ লোড হওয়ার পরে দেখানো হয় — সাইটের স্পিডে প্রভাব পড়ে না।</span>
      </p>

      <label className="flex items-center gap-2.5 mb-4 cursor-pointer select-none">
        <span className="relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition" style={{ background: enabled ? "#22c55e" : "#cbd5e1" }}>
          <span className="inline-block h-5 w-5 rounded-full bg-white shadow transition-transform" style={{ transform: enabled ? "translateX(22px)" : "translateX(2px)" }} />
        </span>
        <input type="checkbox" checked={enabled} onChange={(e) => { setEnabled(e.target.checked); setSaved(false); }} className="sr-only" />
        <span className="text-sm font-semibold">{enabled ? "চালু আছে" : "বন্ধ আছে"}</span>
      </label>

      {image ? (
        <div className="mb-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={image} alt="popup preview" className="w-full max-w-[280px] h-auto rounded-xl ring-1 ring-black/5" />
          <button type="button" onClick={() => { setImage(""); setSaved(false); }} className="mt-2 text-xs underline" style={{ color: "#dc2626" }}>সরান</button>
        </div>
      ) : (
        <p className="text-sm dc-muted mb-3">এখনো ব্যানার যোগ করা হয়নি।</p>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <label className="inline-flex items-center gap-2 dc-btn cursor-pointer">
          {busy ? "Uploading…" : (image ? "ব্যানার পরিবর্তন করুন" : "ব্যানার আপলোড করুন")}
          <input type="file" accept="image/png,image/jpeg,image/webp" onChange={onUpload} className="hidden" disabled={busy} />
        </label>
      </div>

      <div className="mt-3">
        <label className="block text-[13px] font-medium dc-muted mb-1">লিংক (ঐচ্ছিক — ব্যানারে ট্যাপ করলে যেখানে যাবে, যেমন /products)</label>
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
