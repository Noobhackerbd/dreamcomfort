"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { saveAddress, deleteAddress, setDefaultAddress, type Address } from "@/app/account/address-actions";

const empty = { id: "", label: "", name: "", phone: "", address_line: "", area: "", city: "", is_default: false };

export function AddressManager({ initial }: { initial: Address[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<null | typeof empty>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const input = "w-full rounded-xl border border-black/10 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/15 transition";
  const label = "block text-[12px] font-medium text-gray-600 mb-1";

  function openNew() { setErr(null); setEditing({ ...empty, is_default: initial.length === 0 }); }
  function openEdit(a: Address) {
    setErr(null);
    setEditing({ id: a.id, label: a.label || "", name: a.name || "", phone: (a.phone || "").replace(/^88/, ""), address_line: a.address_line || "", area: a.area || "", city: a.city || "", is_default: a.is_default });
  }

  async function save() {
    if (!editing) return;
    setErr(null); setBusy(true);
    const res = await saveAddress(editing);
    setBusy(false);
    if (!res.ok) { setErr(res.error ?? "ব্যর্থ।"); return; }
    setEditing(null); router.refresh();
  }
  async function remove(id: string) {
    setBusy(true); await deleteAddress(id); setBusy(false); router.refresh();
  }
  async function makeDefault(id: string) {
    setBusy(true); await setDefaultAddress(id); setBusy(false); router.refresh();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-500">{initial.length} টি সেভ করা ঠিকানা</p>
        <button onClick={openNew} className="rounded-xl bg-brand text-white px-4 py-2 text-sm font-semibold hover:bg-brand-dark">+ নতুন ঠিকানা</button>
      </div>

      {initial.length === 0 && !editing && (
        <div className="rounded-3xl bg-white ring-1 ring-black/5 shadow-sm px-5 py-12 text-center text-gray-500">
          কোনো ঠিকানা সেভ করা নেই।
        </div>
      )}

      <div className="grid sm:grid-cols-2 gap-3">
        {initial.map((a) => (
          <div key={a.id} className="rounded-2xl bg-white ring-1 ring-black/5 shadow-sm p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                {a.label && <span className="text-[11px] font-semibold rounded-full bg-brand-soft text-brand-dark px-2 py-0.5">{a.label}</span>}
                {a.is_default && <span className="text-[11px] font-semibold rounded-full bg-green-50 text-green-700 px-2 py-0.5">ডিফল্ট</span>}
              </div>
            </div>
            <p className="mt-2 font-semibold text-gray-900 text-sm">{a.name}</p>
            <p className="text-sm text-gray-600">{(a.phone || "").replace(/^88/, "")}</p>
            <p className="text-sm text-gray-600 mt-1 leading-relaxed">{[a.address_line, a.area, a.city].filter(Boolean).join(", ")}</p>
            <div className="mt-3 flex items-center gap-3 text-xs font-medium">
              <button onClick={() => openEdit(a)} className="text-brand hover:underline">এডিট</button>
              {!a.is_default && <button onClick={() => makeDefault(a.id)} className="text-gray-500 hover:underline">ডিফল্ট করুন</button>}
              <button onClick={() => remove(a.id)} className="text-red-500 hover:underline ml-auto">ডিলিট</button>
            </div>
          </div>
        ))}
      </div>

      {editing && (
        <div className="fixed inset-0 z-[80] bg-black/50 flex items-start justify-center overflow-y-auto p-4" onClick={() => setEditing(null)}>
          <div className="bg-white rounded-3xl w-full max-w-md my-8 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b px-5 py-3">
              <h3 className="font-bold">{editing.id ? "ঠিকানা এডিট" : "নতুন ঠিকানা"}</h3>
              <button onClick={() => setEditing(null)} className="text-gray-400 text-xl">×</button>
            </div>
            <div className="p-5 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div><label className={label}>লেবেল</label><input value={editing.label} onChange={(e) => setEditing({ ...editing, label: e.target.value })} className={input} placeholder="বাসা / অফিস" /></div>
                <div><label className={label}>নাম *</label><input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} className={input} /></div>
              </div>
              <div><label className={label}>মোবাইল *</label><input value={editing.phone} onChange={(e) => setEditing({ ...editing, phone: e.target.value })} inputMode="numeric" className={input} placeholder="01XXXXXXXXX" /></div>
              <div><label className={label}>ঠিকানা *</label><textarea value={editing.address_line} onChange={(e) => setEditing({ ...editing, address_line: e.target.value })} rows={2} className={input} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className={label}>এলাকা</label><input value={editing.area} onChange={(e) => setEditing({ ...editing, area: e.target.value })} className={input} /></div>
                <div><label className={label}>শহর / জেলা</label><input value={editing.city} onChange={(e) => setEditing({ ...editing, city: e.target.value })} className={input} /></div>
              </div>
              <label className="flex items-center gap-2 text-sm text-gray-700"><input type="checkbox" checked={editing.is_default} onChange={(e) => setEditing({ ...editing, is_default: e.target.checked })} className="h-4 w-4 accent-brand" /> ডিফল্ট ঠিকানা হিসেবে সেট করুন</label>
              {err && <p className="rounded-xl bg-red-50 text-red-600 text-sm px-3 py-2">{err}</p>}
            </div>
            <div className="flex justify-end gap-2 border-t px-5 py-3">
              <button onClick={() => setEditing(null)} className="rounded-xl border px-4 py-2 text-sm">বাতিল</button>
              <button onClick={save} disabled={busy} className="rounded-xl bg-brand text-white px-5 py-2 text-sm font-semibold hover:bg-brand-dark disabled:opacity-60">{busy ? "..." : "সেভ করুন"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
