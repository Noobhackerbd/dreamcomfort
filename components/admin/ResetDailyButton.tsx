"use client";

// components/admin/ResetDailyButton.tsx — PIN-protected reset for today's counters.
import { useState } from "react";
import { useRouter } from "next/navigation";
import { resetDailyOrders } from "@/app/admin/dashboard-actions";

export function ResetDailyButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    const res = await resetDailyOrders(pin);
    setBusy(false);
    if (!res.ok) {
      setErr(res.error ?? "রিসেট ব্যর্থ হয়েছে।");
      setPin("");
      return;
    }
    setOpen(false);
    setPin("");
    router.refresh();
  }

  return (
    <>
      <button
        onClick={() => {
          setOpen(true);
          setErr(null);
        }}
        className="rounded-lg border border-black/10 text-gray-600 hover:text-brand-dark hover:border-brand/40 px-3 py-1.5 text-xs font-medium transition"
      >
        🔄 রিসেট
      </button>

      {open && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-black/40" onClick={() => !busy && setOpen(false)} />
          <form
            onSubmit={submit}
            className="relative w-full max-w-xs rounded-2xl bg-white p-5 shadow-2xl text-center"
          >
            <div className="text-3xl mb-1">🔄</div>
            <h3 className="font-display font-bold">আজকের গণনা রিসেট</h3>
            <p className="text-xs text-gray-500 mt-1 mb-4">
              আজকের অর্ডার সংখ্যা, আয় ও পণ্য-গণনা এখন থেকে নতুন করে শুরু হবে। চালিয়ে যেতে পিন দিন।
            </p>
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
              <button
                type="button"
                onClick={() => !busy && setOpen(false)}
                className="flex-1 rounded-xl border border-black/10 px-4 py-2.5 text-sm"
              >
                বাতিল
              </button>
              <button
                type="submit"
                disabled={busy || pin.length === 0}
                className="flex-1 rounded-xl bg-brand text-white px-4 py-2.5 text-sm font-medium hover:bg-brand-dark disabled:opacity-60"
              >
                {busy ? "রিসেট হচ্ছে..." : "রিসেট করুন"}
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
