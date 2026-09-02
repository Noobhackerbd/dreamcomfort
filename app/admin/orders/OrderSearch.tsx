"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

/** Live (debounced) order search — updates the URL as you type, no search button. */
export function OrderSearch({ initialQuery, status }: { initialQuery: string; status?: string }) {
  const router = useRouter();
  const [q, setQ] = useState(initialQuery);
  const [pending, startTransition] = useTransition();
  const first = useRef(true);

  useEffect(() => {
    // Don't fire on initial mount (URL already reflects initialQuery).
    if (first.current) { first.current = false; return; }
    const t = setTimeout(() => {
      const sp = new URLSearchParams();
      if (status) sp.set("status", status);
      const s = q.trim();
      if (s) sp.set("q", s);
      const qs = sp.toString();
      startTransition(() => router.replace(`/admin/orders${qs ? `?${qs}` : ""}`));
    }, 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, status]);

  return (
    <div className="relative mb-4">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="অর্ডার নম্বর / নাম / ফোন — টাইপ করলেই খুঁজবে"
        inputMode="search"
        className="w-full rounded-lg border pl-9 pr-10 py-2.5 text-sm outline-none focus:border-brand"
      />
      {q && (
        <button
          type="button"
          onClick={() => setQ("")}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 px-1"
          aria-label="মুছুন"
        >
          ✕
        </button>
      )}
      {pending && <span className="absolute right-8 top-1/2 -translate-y-1/2 text-[11px] text-gray-400">…</span>}
    </div>
  );
}
