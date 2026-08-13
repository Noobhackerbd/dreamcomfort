"use client";

// app/admin/print-station/PrintStationGate.tsx
// Simple access code gate for the print station. Content stays hidden until the
// correct code is entered. (Not high security — just prevents casual/accidental
// access on the shared print laptop.)

import { useState } from "react";

const ACCESS_CODE = "103020";

export function PrintStationGate({ children }: { children: React.ReactNode }) {
  const [unlocked, setUnlocked] = useState(false);
  const [code, setCode] = useState("");
  const [error, setError] = useState(false);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (code.trim() === ACCESS_CODE) {
      setUnlocked(true);
      setError(false);
    } else {
      setError(true);
      setCode("");
    }
  }

  if (unlocked) return <>{children}</>;

  return (
    <div className="max-w-sm mx-auto mt-6 rounded-2xl border border-black/5 bg-white p-6 shadow-sm text-center">
      <div className="text-4xl mb-2">🔒</div>
      <h2 className="font-display text-lg font-bold">প্রিন্ট স্টেশন লকড</h2>
      <p className="text-sm text-gray-500 mt-1 mb-5">চালিয়ে যেতে অ্যাক্সেস কোড লিখুন।</p>

      <form onSubmit={submit} className="space-y-3">
        <input
          type="password"
          inputMode="numeric"
          autoFocus
          value={code}
          onChange={(e) => {
            setCode(e.target.value.replace(/\D/g, ""));
            setError(false);
          }}
          placeholder="• • • • • •"
          className={
            "w-full rounded-xl border px-4 py-3 text-center text-lg tracking-[0.4em] outline-none focus:border-brand " +
            (error ? "border-red-300" : "border-black/10")
          }
        />
        {error && <p className="text-sm text-red-600">ভুল কোড। আবার চেষ্টা করুন।</p>}
        <button
          type="submit"
          className="w-full rounded-xl bg-brand text-white px-5 py-3 font-medium hover:bg-brand-dark transition-colors"
        >
          আনলক করুন
        </button>
      </form>
    </div>
  );
}
