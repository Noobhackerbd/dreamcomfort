"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/admin/icons";

/** Live (debounced) order search — updates the URL as you type, no search button. */
export function OrderSearch({ initialQuery, status, from, to }: { initialQuery: string; status?: string; from?: string; to?: string }) {
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
      if (from) sp.set("from", from);
      if (to) sp.set("to", to);
      const s = q.trim();
      if (s) sp.set("q", s);
      const qs = sp.toString();
      startTransition(() => router.replace(`/admin/orders${qs ? `?${qs}` : ""}`));
    }, 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, status, from, to]);

  return (
    <div className="relative mb-4">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 dc-muted"><Icon name="search" className="h-4 w-4" /></span>
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search order no, name or phone…"
        inputMode="search"
        className="dc-input !pl-9 !pr-10"
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
