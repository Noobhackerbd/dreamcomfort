"use client";

import { useState } from "react";
import { taka } from "@/lib/format";
import type { PublicCoupon } from "@/app/account/coupon-actions";

export function CouponsGrid({ coupons }: { coupons: PublicCoupon[] }) {
  const [copied, setCopied] = useState<string | null>(null);

  function copy(code: string) {
    try {
      navigator.clipboard.writeText(code);
      setCopied(code);
      setTimeout(() => setCopied((c) => (c === code ? null : c)), 1800);
    } catch {}
  }

  if (coupons.length === 0) {
    return <div className="rounded-3xl bg-white ring-1 ring-black/5 shadow-sm px-5 py-14 text-center text-gray-500">এই মুহূর্তে কোনো কুপন নেই।</div>;
  }

  return (
    <div className="grid sm:grid-cols-2 gap-3">
      {coupons.map((c) => {
        const off = c.type === "percent" ? `${c.value}% ছাড়` : `${taka(c.value)} ছাড়`;
        return (
          <div key={c.code} className="relative overflow-hidden rounded-2xl bg-white ring-1 ring-black/5 shadow-sm p-4 flex items-center gap-4">
            {/* left accent */}
            <div className="shrink-0 h-16 w-16 rounded-xl bg-gradient-to-br from-brand to-brand-dark text-white grid place-items-center text-center leading-tight">
              <span className="text-lg font-extrabold">{c.type === "percent" ? `${c.value}%` : taka(c.value)}</span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-bold text-gray-900">{off}</p>
              <p className="text-xs text-gray-500 mt-0.5">
                {c.min_order > 0 ? `সর্বনিম্ন ${taka(c.min_order)} অর্ডারে` : "যেকোনো অর্ডারে"}
                {c.expires_at ? ` · মেয়াদ ${new Date(c.expires_at).toISOString().slice(0, 10)}` : ""}
              </p>
              <div className="mt-2 flex items-center gap-2">
                <code className="rounded-lg bg-gray-100 px-2.5 py-1 text-sm font-mono font-semibold tracking-wide text-gray-900">{c.code}</code>
                <button onClick={() => copy(c.code)} className="text-xs font-semibold text-brand hover:underline">
                  {copied === c.code ? "কপি হয়েছে ✓" : "কপি করুন"}
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
