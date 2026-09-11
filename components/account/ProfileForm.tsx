"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateProfile } from "@/app/account/actions";

// Local-only (avoid importing server-side carrybee into this client component).
function toLocalBdPhone(raw: string): string {
  let d = (raw || "").replace(/\D/g, "");
  if (d.startsWith("00")) d = d.slice(2);
  if (d.startsWith("880")) d = "0" + d.slice(3);
  else if (d.startsWith("1") && d.length === 10) d = "0" + d;
  return d;
}

export function ProfileForm({ initialName, initialPhone, email }: { initialName: string; initialPhone: string; email: string }) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [phone, setPhone] = useState(toLocalBdPhone(initialPhone) || initialPhone);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  const input = "w-full rounded-xl border border-black/10 bg-white px-4 py-3 text-[15px] outline-none focus:border-brand focus:ring-2 focus:ring-brand/15 transition";
  const label = "block text-[13px] font-medium text-gray-600 mb-1.5";

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setErr(null); setOk(false); setBusy(true);
    const res = await updateProfile({ name, phone });
    setBusy(false);
    if (!res.ok) { setErr(res.error ?? "সেভ ব্যর্থ।"); return; }
    setOk(true);
    router.refresh();
  }

  return (
    <form onSubmit={save} className="rounded-3xl bg-white ring-1 ring-black/5 shadow-sm p-6 space-y-4 max-w-lg">
      <div>
        <label className={label}>পূর্ণ নাম</label>
        <input value={name} onChange={(e) => setName(e.target.value)} className={input} />
      </div>
      <div>
        <label className={label}>মোবাইল নম্বর</label>
        <input value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="numeric" className={input} placeholder="01XXXXXXXXX" />
        <p className="mt-1 text-xs text-gray-400">এই নম্বর দিয়েই আপনার অর্ডার মিলবে।</p>
      </div>
      <div>
        <label className={label}>ইমেইল</label>
        <input value={email} disabled className={input + " opacity-60 cursor-not-allowed"} />
      </div>

      {err && <p className="rounded-xl bg-red-50 text-red-600 text-sm px-3 py-2">{err}</p>}
      {ok && <p className="rounded-xl bg-green-50 text-green-700 text-sm px-3 py-2">সেভ হয়েছে ✓</p>}

      <button type="submit" disabled={busy} className="rounded-xl bg-brand text-white px-6 py-3 font-semibold hover:bg-brand-dark disabled:opacity-60 transition">
        {busy ? "..." : "সেভ করুন"}
      </button>
    </form>
  );
}
