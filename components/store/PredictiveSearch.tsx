"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { searchSuggestions } from "@/app/store-search-actions";

const RECENT_KEY = "dc-search-recent";
function loadRecent(): string[] { try { return JSON.parse(localStorage.getItem(RECENT_KEY) || "[]"); } catch { return []; } }

function Highlight({ text, q }: { text: string; q: string }) {
  const i = q ? text.toLowerCase().indexOf(q.toLowerCase()) : -1;
  if (i < 0) return <>{text}</>;
  return (<>{text.slice(0, i)}<b className="font-bold text-gray-900">{text.slice(i, i + q.length)}</b>{text.slice(i + q.length)}</>);
}

export function PredictiveSearch() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [items, setItems] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [recent, setRecent] = useState<string[]>([]);
  const [popular, setPopular] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const timer = useRef<any>(null);
  const seq = useRef(0);
  const popLoaded = useRef(false);

  useEffect(() => {
    if (!open) return;
    setTimeout(() => inputRef.current?.focus(), 50);
    setRecent(loadRecent());
    if (!popLoaded.current) {
      popLoaded.current = true;
      searchSuggestions("").then((r) => setPopular(r.suggestions)).catch(() => {});
    }
  }, [open]);
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") setOpen(false); }
    if (open) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  function onChange(v: string) {
    setQ(v);
    if (timer.current) clearTimeout(timer.current);
    if (v.trim().length < 1) { setItems([]); setLoading(false); return; }
    setLoading(true);
    const my = ++seq.current;
    timer.current = setTimeout(async () => {
      const res = await searchSuggestions(v);
      if (my === seq.current) { setItems(res.suggestions); setLoading(false); }
    }, 200);
  }

  function runSearch(term: string) {
    const t = term.trim();
    if (!t) return;
    try {
      const next = [t, ...loadRecent().filter((x) => x.toLowerCase() !== t.toLowerCase())].slice(0, 8);
      localStorage.setItem(RECENT_KEY, JSON.stringify(next));
    } catch {}
    setOpen(false);
    router.push(`/products?q=${encodeURIComponent(t)}`);
  }

  function clearRecent() { try { localStorage.removeItem(RECENT_KEY); } catch {} setRecent([]); }

  const typing = q.trim().length >= 1;

  return (
    <>
      {/* Field-shaped search trigger — visible on mobile & desktop */}
      <button onClick={() => setOpen(true)} aria-label="Search"
        className="ml-2.5 sm:ml-4 mr-0.5 flex min-w-0 flex-1 sm:flex-none sm:w-56 items-center gap-1.5 sm:gap-2 h-8 sm:h-9 rounded-full bg-white/70 ring-1 ring-black/10 pl-2.5 pr-3 sm:pl-3 sm:pr-4 text-left text-gray-400 hover:bg-white hover:ring-black/20 transition">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" className="h-4 w-4 sm:h-[18px] sm:w-[18px] shrink-0 text-gray-500"><circle cx="11" cy="11" r="7" /><path d="M21 21l-4-4" /></svg>
        <span className="truncate text-[12px] sm:text-sm">পণ্য খুঁজুন...</span>
      </button>

      {open && (
        <div className="fixed inset-0 z-[95] bg-black/50 backdrop-blur-sm" onClick={() => setOpen(false)}>
          <div className="mx-auto max-w-2xl px-0 sm:px-4 sm:mt-[7vh]" onClick={(e) => e.stopPropagation()}>
            <div className="bg-white rounded-b-2xl sm:rounded-2xl shadow-2xl overflow-hidden">
              {/* Search bar */}
              <div className="flex items-center gap-2 p-3 sm:p-4">
                <div className="flex-1 flex items-center gap-2 h-11 rounded-full bg-gray-100 px-4 focus-within:ring-2 focus-within:ring-brand/25 transition">
                  <svg viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.9" className="h-[18px] w-[18px] shrink-0"><circle cx="11" cy="11" r="7" /><path d="M21 21l-4-4" /></svg>
                  <input ref={inputRef} value={q} onChange={(e) => onChange(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") runSearch(q); }}
                    placeholder="পণ্য খুঁজুন..." className="flex-1 min-w-0 bg-transparent text-[15px] outline-none" />
                  {q && <button onClick={() => { setQ(""); setItems([]); inputRef.current?.focus(); }} aria-label="মুছুন" className="shrink-0 text-gray-400 hover:text-gray-600">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4"><path d="M6 6l12 12M18 6L6 18" /></svg>
                  </button>}
                </div>
                <button onClick={() => runSearch(q)} className="h-11 px-4 sm:px-5 rounded-full bg-brand text-white text-sm font-semibold hover:bg-brand-dark transition shrink-0">খুঁজুন</button>
                <button onClick={() => setOpen(false)} aria-label="বন্ধ" className="shrink-0 h-11 w-11 grid place-items-center rounded-full text-gray-500 hover:bg-black/5 transition">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5"><path d="M6 6l12 12M18 6L6 18" /></svg>
                </button>
              </div>

              <div className="max-h-[60vh] overflow-y-auto border-t border-black/5">
                {typing ? (
                  <>
                    {loading && items.length === 0 && <p className="px-5 py-6 text-center text-sm text-gray-400">খুঁজছি...</p>}
                    {!loading && items.length === 0 && (
                      <button onClick={() => runSearch(q)} className="flex w-full items-center gap-3 px-5 py-3.5 text-left hover:bg-gray-50 transition">
                        <svg viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.8" className="h-4 w-4 shrink-0"><circle cx="11" cy="11" r="7" /><path d="M21 21l-4-4" /></svg>
                        <span className="text-[15px] text-gray-700">&ldquo;{q}&rdquo; খুঁজুন</span>
                      </button>
                    )}
                    {items.map((s) => (
                      <div key={s} className="flex items-center hover:bg-gray-50 transition">
                        <button onClick={() => runSearch(s)} className="flex-1 min-w-0 flex items-center gap-3 px-5 py-3 text-left">
                          <svg viewBox="0 0 24 24" fill="none" stroke="#c4c4c4" strokeWidth="1.7" className="h-4 w-4 shrink-0"><circle cx="11" cy="11" r="7" /><path d="M21 21l-4-4" /></svg>
                          <span className="truncate text-[15px] text-gray-600"><Highlight text={s} q={q} /></span>
                        </button>
                        <button onClick={() => { setQ(s); onChange(s); inputRef.current?.focus(); }} aria-label="ইনপুটে বসান" className="shrink-0 h-9 w-9 grid place-items-center text-gray-300 hover:text-gray-500 mr-2">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-[18px] w-[18px]"><path d="M17 17L7 7M7 7h7M7 7v7" /></svg>
                        </button>
                      </div>
                    ))}
                  </>
                ) : (
                  <div className="p-4 sm:p-5 space-y-5">
                    {recent.length > 0 && (
                      <div>
                        <div className="flex items-center justify-between mb-2.5">
                          <p className="text-[13px] font-semibold text-gray-700">সাম্প্রতিক সার্চ</p>
                          <button onClick={clearRecent} className="text-[12px] text-gray-400 hover:text-gray-600">মুছুন</button>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {recent.map((t) => (
                            <button key={t} onClick={() => runSearch(t)} className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 text-[13px] px-3.5 py-1.5 transition">
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="h-3.5 w-3.5 text-gray-400"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>
                              {t}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                    {popular.length > 0 && (
                      <div>
                        <p className="text-[13px] font-semibold text-gray-700 mb-2.5">জনপ্রিয় সার্চ</p>
                        <div className="flex flex-wrap gap-2">
                          {popular.map((t) => (
                            <button key={t} onClick={() => runSearch(t)} className="rounded-full bg-accent-light/40 hover:bg-accent-light/70 text-accent-dark text-[13px] px-3.5 py-1.5 font-medium transition">{t}</button>
                          ))}
                        </div>
                      </div>
                    )}
                    {recent.length === 0 && popular.length === 0 && (
                      <p className="py-6 text-center text-sm text-gray-400">পণ্যের নাম লিখে খুঁজুন...</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
