"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { submitReview, uploadReviewPhoto, type Review } from "@/app/product/review-actions";
import { useL } from "@/components/i18n/I18nProvider";
import { T } from "@/components/i18n/T";

function Stars({ rating, size = 14 }: { rating: number; size?: number }) {
  return (
    <span className="inline-flex items-center gap-[1px]">
      {[0, 1, 2, 3, 4].map((i) => {
        const fill = Math.max(0, Math.min(1, rating - i));
        const id = `rv${i}-${Math.round(fill * 100)}-${size}`;
        return (
          <svg key={i} width={size} height={size} viewBox="0 0 24 24" aria-hidden>
            <defs><linearGradient id={id}><stop offset={`${fill * 100}%`} stopColor="#f5b301" /><stop offset={`${fill * 100}%`} stopColor="#e5e1d8" /></linearGradient></defs>
            <path d="M12 2l3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1z" fill={`url(#${id})`} />
          </svg>
        );
      })}
    </span>
  );
}

async function shrink(file: File): Promise<{ base64: string; mediaType: string }> {
  const dataUrl: string = await new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result as string); r.onerror = () => rej(new Error("read")); r.readAsDataURL(file); });
  const img = await new Promise<HTMLImageElement>((res, rej) => { const im = new window.Image(); im.onload = () => res(im); im.onerror = () => rej(new Error("img")); im.src = dataUrl; });
  const MAX = 1200; let { width, height } = img;
  if (width > MAX || height > MAX) { const s = MAX / Math.max(width, height); width = Math.round(width * s); height = Math.round(height * s); }
  const c = document.createElement("canvas"); c.width = width; c.height = height;
  const ctx = c.getContext("2d"); if (!ctx) return { base64: dataUrl.split(",")[1], mediaType: file.type || "image/jpeg" };
  ctx.drawImage(img, 0, 0, width, height);
  return { base64: c.toDataURL("image/jpeg", 0.82).split(",")[1], mediaType: "image/jpeg" };
}

export function ProductReviews({ productId, initial, count, average }: { productId: string; initial: Review[]; count: number; average: number }) {
  const { L } = useL();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [rating, setRating] = useState(5);
  const [hover, setHover] = useState(0);
  const [body, setBody] = useState("");
  const [photos, setPhotos] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  // Photo lightbox: clicking a review photo opens a full popup with prev/next.
  const [lb, setLb] = useState<{ imgs: string[]; i: number } | null>(null);
  const lbPrev = () => setLb((s) => (s ? { ...s, i: (s.i - 1 + s.imgs.length) % s.imgs.length } : s));
  const lbNext = () => setLb((s) => (s ? { ...s, i: (s.i + 1) % s.imgs.length } : s));

  useEffect(() => {
    if (!lb) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLb(null);
      else if (e.key === "ArrowLeft") lbPrev();
      else if (e.key === "ArrowRight") lbNext();
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, [lb]);

  const input = "w-full rounded-lg border border-black/10 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/15 transition";

  async function onPhotos(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []); e.target.value = "";
    if (!files.length) return;
    setUploading(true); setErr(null);
    for (const f of files.slice(0, 4 - photos.length)) {
      try { const { base64, mediaType } = await shrink(f); const res = await uploadReviewPhoto(base64, mediaType); if (res.ok && res.url) setPhotos((p) => [...p, res.url!]); } catch {}
    }
    setUploading(false);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setErr(null); setBusy(true);
    const res = await submitReview({ productId, name, rating, body, images: photos });
    setBusy(false);
    if (!res.ok) { setErr(res.error ?? L("Failed.","ব্যর্থ।")); return; }
    setDone(true); setName(""); setBody(""); setPhotos([]); setRating(5); setOpen(false);
    router.refresh();
  }

  return (
    <section className="mt-14 max-w-3xl">
      <div className="flex items-center justify-between gap-3 mb-4">
        <h2 className="text-xl font-bold font-display"><T en="Customer Reviews" bn="গ্রাহক রিভিউ" /></h2>
        <button onClick={() => setOpen((v) => !v)} className="rounded-lg bg-brand text-white px-4 py-2 text-sm font-semibold hover:bg-brand-dark transition-colors"><T en="Write a Review" bn="রিভিউ লিখুন" /></button>
      </div>

      {count > 0 && (
        <div className="rounded-lg bg-white border border-black/[0.06] shadow-[0_1px_2px_rgba(0,0,0,0.03)] p-5 flex items-center gap-5 mb-4">
          <div className="text-center shrink-0">
            <p className="text-4xl font-extrabold text-gray-900">{average.toFixed(1)}</p>
            <div className="mt-1"><Stars rating={average} /></div>
            <p className="mt-1 text-xs text-gray-400">{count} <T en="reviews" bn="রিভিউ" /></p>
          </div>
          <p className="text-sm text-gray-600 leading-relaxed"><T en="Reviews from verified customers. Share your experience too." bn="যাচাইকৃত গ্রাহকদের রিভিউ। আপনার অভিজ্ঞতাও শেয়ার করুন।" /></p>
        </div>
      )}

      {done && <p className="rounded-lg bg-green-50 text-green-700 text-sm px-3 py-2 mb-4"><T en="Thank you! Your review has been added ✓" bn="ধন্যবাদ! আপনার রিভিউ যোগ হয়েছে ✓" /></p>}

      {open && (
        <form onSubmit={submit} className="rounded-lg bg-white border border-black/[0.06] shadow-[0_1px_2px_rgba(0,0,0,0.03)] p-5 space-y-3 mb-5">
          <div>
            <label className="block text-[12px] font-medium text-gray-600 mb-1"><T en="Your rating" bn="আপনার রেটিং" /></label>
            <div className="flex items-center gap-1" onMouseLeave={() => setHover(0)}>
              {[1, 2, 3, 4, 5].map((n) => (
                <button key={n} type="button" onClick={() => setRating(n)} onMouseEnter={() => setHover(n)} aria-label={`${n} star`}>
                  <svg width="26" height="26" viewBox="0 0 24 24" fill={(hover || rating) >= n ? "#f5b301" : "#e5e1d8"}><path d="M12 2l3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1z" /></svg>
                </button>
              ))}
            </div>
          </div>
          <div><input value={name} onChange={(e) => setName(e.target.value)} placeholder={L("Your name","আপনার নাম")} className={input} /></div>
          <div><textarea value={body} onChange={(e) => setBody(e.target.value)} rows={3} placeholder={L("How did you like the product?","পণ্যটি কেমন লাগলো?")} className={input} /></div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              {photos.map((u, i) => (
                <span key={i} className="relative h-14 w-14 rounded-md overflow-hidden ring-1 ring-black/10">
                  <Image src={u} alt="" fill sizes="56px" className="object-cover" />
                  <button type="button" onClick={() => setPhotos((p) => p.filter((_, j) => j !== i))} className="absolute top-0 right-0 h-5 w-5 bg-black/60 text-white text-xs">×</button>
                </span>
              ))}
              {photos.length < 4 && (
                <label className="h-14 w-14 rounded-md border-2 border-dashed border-gray-300 grid place-items-center cursor-pointer text-gray-400 hover:border-brand">
                  {uploading ? "…" : "+"}
                  <input type="file" accept="image/*" multiple className="hidden" onChange={onPhotos} disabled={uploading} />
                </label>
              )}
            </div>
            <p className="text-[11px] text-gray-400 mt-1"><T en="Add photos (optional, up to 4)" bn="ছবি যোগ করুন (ঐচ্ছিক, সর্বোচ্চ ৪টি)" /></p>
          </div>
          {err && <p className="rounded-lg bg-red-50 text-red-600 text-sm px-3 py-2">{err}</p>}
          <button type="submit" disabled={busy || uploading} className="rounded-lg bg-brand text-white px-6 py-2.5 text-sm font-semibold hover:bg-brand-dark disabled:opacity-60 transition-colors">{busy ? "..." : <T en="Submit Review" bn="রিভিউ জমা দিন" />}</button>
        </form>
      )}

      {initial.length === 0 ? (
        !open && <p className="text-sm text-gray-500"><T en="No reviews yet — be the first to review!" bn="এখনো কোনো রিভিউ নেই — প্রথম রিভিউটি আপনি দিন!" /></p>
      ) : (
        <div className="space-y-3">
          {initial.map((r) => (
            <div key={r.id} className="rounded-lg bg-white border border-black/[0.06] shadow-[0_1px_2px_rgba(0,0,0,0.03)] p-4">
              <div className="flex items-center gap-2">
                <span className="h-9 w-9 rounded-full bg-brand-soft text-brand-dark grid place-items-center font-bold text-sm">{(r.name || "?").charAt(0).toUpperCase()}</span>
                <div>
                  <p className="text-sm font-semibold text-gray-900">{r.name || <T en="Customer" bn="গ্রাহক" />}</p>
                  <div className="flex items-center gap-1.5"><Stars rating={r.rating} size={12} /><span className="text-[11px] text-gray-400">{new Date(r.created_at).toISOString().slice(0, 10)}</span></div>
                </div>
              </div>
              {r.body && <p className="mt-2 text-sm text-gray-700 leading-relaxed">{r.body}</p>}
              {Array.isArray(r.images) && r.images.filter(Boolean).length > 0 && (
                <div className="mt-2 flex gap-2 flex-wrap">
                  {r.images.filter(Boolean).map((u, i, arr) => (
                    <button key={i} type="button" onClick={() => setLb({ imgs: arr as string[], i })}
                      aria-label={L("View larger image","ছবি বড় করে দেখুন")}
                      className="relative h-16 w-16 rounded-md overflow-hidden ring-1 ring-black/10 cursor-zoom-in transition-transform hover:scale-[1.04]">
                      <Image src={u} alt="" fill sizes="64px" className="object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Photo lightbox popup with prev / next */}
      {lb && (
        <div className="fixed inset-0 z-[120] bg-black/85 backdrop-blur-sm grid place-items-center px-4 select-none"
          onClick={() => setLb(null)}>
          {/* Close */}
          <button type="button" onClick={() => setLb(null)} aria-label={L("Close","বন্ধ")}
            className="absolute top-4 right-4 h-11 w-11 grid place-items-center rounded-full bg-white/10 text-white hover:bg-white/20 transition">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-6 w-6"><path d="M6 6l12 12M18 6L6 18" /></svg>
          </button>

          {/* Prev */}
          {lb.imgs.length > 1 && (
            <button type="button" onClick={(e) => { e.stopPropagation(); lbPrev(); }} aria-label={L("Previous image","আগের ছবি")}
              className="absolute left-3 sm:left-6 top-1/2 -translate-y-1/2 h-12 w-12 grid place-items-center rounded-full bg-white/10 text-white hover:bg-white/25 transition">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="h-7 w-7"><path d="M15 18l-6-6 6-6" /></svg>
            </button>
          )}

          {/* Image */}
          <div className="relative max-w-3xl max-h-[82vh] w-full flex flex-col items-center" onClick={(e) => e.stopPropagation()}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={lb.imgs[lb.i]} alt="" className="max-h-[78vh] w-auto max-w-full rounded-lg object-contain shadow-2xl" />
            {lb.imgs.length > 1 && (
              <div className="mt-3 rounded-full bg-white/12 text-white text-[13px] font-medium px-3 py-1 tabular-nums">
                {lb.i + 1} / {lb.imgs.length}
              </div>
            )}
          </div>

          {/* Next */}
          {lb.imgs.length > 1 && (
            <button type="button" onClick={(e) => { e.stopPropagation(); lbNext(); }} aria-label={L("Next image","পরের ছবি")}
              className="absolute right-3 sm:right-6 top-1/2 -translate-y-1/2 h-12 w-12 grid place-items-center rounded-full bg-white/10 text-white hover:bg-white/25 transition">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="h-7 w-7"><path d="M9 18l6-6-6-6" /></svg>
            </button>
          )}
        </div>
      )}
    </section>
  );
}
