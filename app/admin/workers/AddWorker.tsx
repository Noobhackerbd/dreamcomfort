"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase/ssr-browser";
import { Icon } from "@/components/admin/icons";
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
    if (error) { setErr("Image upload failed: " + error.message); setUploading(false); return; }
    const { data } = supabase.storage.from("product-images").getPublicUrl(path);
    setPhoto(data.publicUrl);
    setUploading(false);
  }

  async function save() {
    setErr(null);
    if (!name.trim()) { setErr("Enter a name."); return; }
    setBusy(true);
    const res = await createWorker({ name, phone, photo });
    setBusy(false);
    if (!res.ok) { setErr(res.error ?? "Save failed."); return; }
    setName(""); setPhone(""); setPhoto(null); setOpen(false);
    router.refresh();
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="w-full rounded-xl py-3 text-sm font-medium transition" style={{ border: "2px dashed var(--a-border)", color: "var(--a-violet)", background: "var(--a-violet-soft)" }}>
        + Add a new worker
      </button>
    );
  }

  return (
    <div className="dc-card p-4">
      <div className="flex items-center gap-4">
        <label className="h-16 w-16 rounded-full overflow-hidden flex items-center justify-center cursor-pointer shrink-0" style={{ background: "var(--a-surface-2)", boxShadow: "inset 0 0 0 1px var(--a-border)" }}>
          {photo ? <Image src={photo} alt="" width={64} height={64} className="h-full w-full object-cover" /> : <span className="text-xs dc-muted text-center">{uploading ? "…" : "📷 Photo"}</span>}
          <input type="file" accept="image/*" onChange={onUpload} className="hidden" />
        </label>
        <div className="flex-1 space-y-2">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Worker name *" className="dc-input" />
          <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone (optional)" className="dc-input" />
        </div>
      </div>
      {err && <p className="text-sm mt-2" style={{ color: "#dc2626" }}>{err}</p>}
      <div className="mt-3 flex gap-2">
        <button onClick={save} disabled={busy || uploading} className="dc-btn dc-btn-solid disabled:opacity-60" style={{ background: "var(--a-violet)", borderColor: "var(--a-violet)" }}>
          <Icon name="check" className="h-4 w-4" /> {busy ? "Saving…" : "Save"}
        </button>
        <button onClick={() => { setOpen(false); setErr(null); }} className="dc-btn">Cancel</button>
      </div>
    </div>
  );
}
