"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase/ssr-browser";
import { createWorker } from "./actions";

export function AddWorker() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [photo, setPhoto] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function onUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true); setErr(null);
    const supabase = getSupabaseBrowserClient();
    const ext = file.name.split(".").pop();
    const path = `worker-${Date.now()}-${Math.floor(Math.random() * 1e6)}.${ext}`;
    const { error } = await supabase.storage.from("product-images").upload(path, file, { cacheControl: "3600", upsert: false });
    if (error) { setErr("ছবি আপলোড ব্যর্থ: " + error.message); setUploading(false); return; }
    const { data } = supabase.storage.from("product-images").getPublicUrl(path);
    setPhoto(data.publicUrl);
    setUploading(false);
  }

  async function save() {
    setErr(null);
    if (!name.trim()) { setErr("নাম দিন।"); return; }
    setBusy(true);
    const res = await createWorker({ name, phone, photo });
    setBusy(false);
    if (!res.ok) { setErr(res.error ?? "সেভ ব্যর্থ।"); return; }
    setName(""); setPhone(""); setPhoto(null); setOpen(false);
    router.refresh();
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="w-full rounded-xl border-2 border-dashed border-brand/30 text-brand-dark py-3 text-sm font-medium hover:bg-brand-soft">
        + নতুন কর্মী যোগ করুন
      </button>
    );
  }

  return (
    <div className="rounded-xl border bg-white p-4">
      <div className="flex items-center gap-4">
        <label className="h-16 w-16 rounded-full overflow-hidden bg-gray-100 ring-1 ring-black/5 flex items-center justify-center cursor-pointer shrink-0">
          {photo ? <Image src={photo} alt="" width={64} height={64} className="h-full w-full object-cover" /> : <span className="text-xs text-gray-400 text-center">{uploading ? "..." : "📷 ছবি"}</span>}
          <input type="file" accept="image/*" onChange={onUpload} className="hidden" />
        </label>
        <div className="flex-1 space-y-2">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="কর্মীর নাম *" className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-brand" />
          <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="ফোন (ঐচ্ছিক)" className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-brand" />
        </div>
      </div>
      {err && <p className="text-sm text-red-600 mt-2">{err}</p>}
      <div className="mt-3 flex gap-2">
        <button onClick={save} disabled={busy || uploading} className="rounded-lg bg-brand text-white px-5 py-2 text-sm disabled:opacity-60">{busy ? "সেভ হচ্ছে..." : "সেভ করুন"}</button>
        <button onClick={() => { setOpen(false); setErr(null); }} className="rounded-lg border px-5 py-2 text-sm">বাতিল</button>
      </div>
    </div>
  );
}
