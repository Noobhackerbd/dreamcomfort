"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { searchProducts, type SearchHit } from "@/app/store-search-actions";
import { taka } from "@/lib/format";

export function PredictiveSearch() {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const timer = useRef<any>(null);
  const seq = useRef(0);

  useEffect(() => { if (open) setTimeout(() => inputRef.current?.focus(), 50); }, [open]);
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") setOpen(false); }
    if (open) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  function onChange(v: string) {
    setQ(v);
    if (timer.current) clearTimeout(timer.current);
    if (v.trim().length < 2) { setHits([]); setLoading(false); return; }
    setLoading(true);
    const my = ++seq.current;
    timer.current = setTimeout(async () => {
      const res = await searchProducts(v);
      if (my === seq.current) { setHits(res.hits); setLoading(false); }
    }, 220);
  }

  return (
    <>
      <button onClick={() => setOpen(true)} aria-label="Search" title="Search"
        className="h-10 w-10 grid place-items-center rounded-full text-gray-700 hover:bg-black/5 transition">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-[21px] w-[21px]"><circle cx="11" cy="11" r="7" /><path d="M21 21l-4-4" /></svg>
      </button>

      {open && (
        <div className="fixed inset-0 z-[95] bg-black/40 backdrop-blur-sm" onClick={() => setOpen(false)}>
          <div className="mx-auto max-w-2xl mt-[8vh] px-4" onClick={(e) => e.stopPropagation()}>
            <div className="rounded-2xl bg-white shadow-2xl overflow-hidden">
              <div className="flex items-center gap-2 px-4 border-b border-black/5">
                <svg viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.8" className="h-5 w-5 shrink-0"><circle cx="11" cy="11" r="7" /><path d="M21 21l-4-4" /></svg>
                <input ref={inputRef} value={q} onChange={(e) => onChange(e.target.value)} placeholder="পণ্য খুঁজুন..." className="flex-1 py-4 text-[15px] outline-none bg-transparent" />
                <button onClick={() => setOpen(false)} className="text-gray-400 text-sm font-medium px-2">বন্ধ</button>
              </div>

              <div className="max-h-[60vh] overflow-y-auto">
                {loading && <p className="px-5 py-6 text-center text-sm text-gray-400">খুঁজছি...</p>}
                {!loading && q.trim().length >= 2 && hits.length === 0 && <p className="px-5 py-6 text-center text-sm text-gray-400">কোনো পণ্য পাওয়া যায়নি।</p>}
                {hits.map((h) => (
                  <a key={h.id} href={`/product/${h.slug}`} onClick={() => setOpen(false)}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition">
                    <span className="relative h-12 w-12 rounded-lg overflow-hidden bg-gray-100 ring-1 ring-black/5 shrink-0">
                      {h.image && <Image src={h.image} alt="" fill sizes="48px" className="object-cover" />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium text-gray-900 truncate">{h.name}</span>
                      {h.category && <span className="block text-[11px] text-gray-400">{h.category}</span>}
                    </span>
                    <span className="text-sm font-bold text-accent-dark whitespace-nowrap">{taka(h.price)}</span>
                  </a>
                ))}
                {q.trim().length < 2 && <p className="px-5 py-6 text-center text-sm text-gray-400">পণ্যের নাম লিখুন...</p>}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
