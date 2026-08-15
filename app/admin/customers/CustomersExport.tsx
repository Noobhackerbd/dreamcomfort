"use client";

// app/admin/customers/CustomersExport.tsx — PIN-protected "download all customers as CSV".
import { useState } from "react";

export function CustomersExport() {
  const [open, setOpen] = useState(false);
  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function download(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch("/api/admin/customers/export?pin=" + encodeURIComponent(pin), { cache: "no-store" });
      if (res.status === 403) {
        setErr("ভুল পিন।");
        setBusy(false);
        return;
      }
      if (!res.ok) {
        setErr("ডাউনলোড ব্যর্থ হয়েছে।");
        setBusy(false);
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "customers.csv";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setBusy(false);
      setOpen(false);
      setPin("");
    } catch {
      setErr("সমস্যা হয়েছে। আবার চেষ্টা করুন।");
      setBusy(false);
    }
  }

  return (
    <>
      <button
        onClick={() => {
          setOpen(true);
          setErr(null);
        }}
        className="rounded-lg bg-green-600 text-white px-4 py-2 text-sm font-medium hover:bg-green-700 whitespace-nowrap"
      >
        ⬇️ CSV এক্সপোর্ট
      </button>

      {open && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-black/40" onClick={() => !busy && setOpen(false)} />
          <form onSubmit={download} className="relative w-full max-w-xs rounded-2xl bg-white p-5 shadow-2xl text-center">
            <div className="text-3xl mb-1">⬇️</div>
            <h3 className="font-display font-bold">সব গ্রাহক CSV ডাউনলোড</h3>
            <p className="text-xs text-gray-500 mt-1 mb-4">সকল গ্রাহকের নাম, ফোন, ইমেইল, অর্ডার ও খরচ — Excel-এ খোলা যাবে। পিন দিন।</p>
            <input
              type="password"
              inputMode="numeric"
              autoFocus
              value={pin}
              onChange={(e) => {
                setPin(e.target.value.replace(/\D/g, ""));
                setErr(null);
              }}
              placeholder="পিন"
              className={"w-full rounded-xl border px-4 py-2.5 text-center tracking-[0.3em] outline-none focus:border-brand " + (err ? "border-red-300" : "border-black/10")}
            />
            {err && <p className="mt-2 text-sm text-red-600">{err}</p>}
            <div className="mt-4 flex gap-2">
              <button type="button" onClick={() => !busy && setOpen(false)} className="flex-1 rounded-xl border border-black/10 px-4 py-2.5 text-sm">
                বাতিল
              </button>
              <button type="submit" disabled={busy || pin.length === 0} className="flex-1 rounded-xl bg-green-600 text-white px-4 py-2.5 text-sm font-medium hover:bg-green-700 disabled:opacity-60">
                {busy ? "ডাউনলোড হচ্ছে..." : "ডাউনলোড"}
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
