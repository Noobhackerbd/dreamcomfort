"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

// Visual product search: pick/take a photo → downscale → /api/image-search
// (Gemini vision) → open the matching product results.
async function toBase64(file: File): Promise<{ data: string; mime: string }> {
  const dataUrl: string = await new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result as string);
    r.onerror = () => rej(new Error("read"));
    r.readAsDataURL(file);
  });
  try {
    const img = await new Promise<HTMLImageElement>((res, rej) => {
      const im = new window.Image();
      im.onload = () => res(im);
      im.onerror = () => rej(new Error("img"));
      im.src = dataUrl;
    });
    const MAX = 1024;
    let { width, height } = img;
    if (width > MAX || height > MAX) {
      const s = MAX / Math.max(width, height);
      width = Math.round(width * s);
      height = Math.round(height * s);
    }
    const c = document.createElement("canvas");
    c.width = width; c.height = height;
    const ctx = c.getContext("2d");
    if (ctx) {
      ctx.drawImage(img, 0, 0, width, height);
      return { data: c.toDataURL("image/jpeg", 0.8).split(",")[1], mime: "image/jpeg" };
    }
  } catch { /* fall back to original */ }
  return { data: dataUrl.split(",")[1], mime: file.type || "image/jpeg" };
}

export function ImageSearchButton() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const tRef = useRef<any>(null);

  function showToast(msg: string) {
    setToast(msg);
    if (tRef.current) clearTimeout(tRef.current);
    tRef.current = setTimeout(() => setToast(null), 3000);
  }

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setBusy(true);
    try {
      const { data, mime } = await toBase64(file);
      const r = await fetch("/api/image-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: data, mime }),
      });
      const j = await r.json();
      if (j.ok && j.q) {
        router.push(`/products?q=${encodeURIComponent(j.q)}`);
      } else if (j.reason === "not_configured") {
        showToast("ছবি সার্চ শীঘ্রই চালু হচ্ছে");
      } else {
        showToast("ছবিটি চেনা গেল না — আবার চেষ্টা করুন");
      }
    } catch {
      showToast("সমস্যা হয়েছে — আবার চেষ্টা করুন");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button
        onClick={() => !busy && inputRef.current?.click()}
        aria-label="ছবি দিয়ে খুঁজুন"
        title="ছবি দিয়ে খুঁজুন"
        disabled={busy}
        className="shrink-0 h-9 w-9 grid place-items-center rounded-full text-gray-700 hover:bg-black/5 transition disabled:opacity-70"
      >
        {busy ? (
          <svg viewBox="0 0 24 24" className="h-[19px] w-[19px] animate-spin text-gray-500" fill="none">
            <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2.2" strokeOpacity="0.25" />
            <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="h-[20px] w-[20px]">
            <path d="M4 8.5A1.5 1.5 0 0 1 5.5 7H8l1.2-1.6a1 1 0 0 1 .8-.4h4a1 1 0 0 1 .8.4L16 7h2.5A1.5 1.5 0 0 1 20 8.5v9A1.5 1.5 0 0 1 18.5 19h-13A1.5 1.5 0 0 1 4 17.5z" />
            <circle cx="12" cy="12.5" r="3.2" />
          </svg>
        )}
      </button>
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={onPick} />
      {toast && (
        <div className="fixed left-1/2 -translate-x-1/2 top-16 z-[95] rounded-full bg-gray-900/90 text-white text-[13px] px-4 py-2 shadow-lg">
          {toast}
        </div>
      )}
    </>
  );
}
