"use client";

import { useRef, useState } from "react";

// Image / visual search entry point. Opens the device camera or photo picker.
// (Visual-search backend not wired yet — shows a lightweight "coming soon" toast.)
export function ImageSearchButton() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [toast, setToast] = useState(false);
  const tRef = useRef<any>(null);

  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    if (!e.target.files || e.target.files.length === 0) return;
    e.target.value = "";
    setToast(true);
    if (tRef.current) clearTimeout(tRef.current);
    tRef.current = setTimeout(() => setToast(false), 2600);
  }

  return (
    <>
      <button onClick={() => inputRef.current?.click()} aria-label="ছবি দিয়ে খুঁজুন" title="ছবি দিয়ে খুঁজুন"
        className="shrink-0 h-9 w-9 grid place-items-center rounded-full text-gray-700 hover:bg-black/5 transition">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="h-[20px] w-[20px]">
          <path d="M4 8.5A1.5 1.5 0 0 1 5.5 7H8l1.2-1.6a1 1 0 0 1 .8-.4h4a1 1 0 0 1 .8.4L16 7h2.5A1.5 1.5 0 0 1 20 8.5v9A1.5 1.5 0 0 1 18.5 19h-13A1.5 1.5 0 0 1 4 17.5z" />
          <circle cx="12" cy="12.5" r="3.2" />
        </svg>
      </button>
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={onPick} />
      {toast && (
        <div className="fixed left-1/2 -translate-x-1/2 top-16 z-[95] rounded-full bg-gray-900/90 text-white text-[13px] px-4 py-2 shadow-lg">
          ছবি দিয়ে খোঁজা শীঘ্রই আসছে
        </div>
      )}
    </>
  );
}
