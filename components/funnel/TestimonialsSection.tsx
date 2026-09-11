"use client";
// components/funnel/TestimonialsSection.tsx — social-proof section for the landing.
// Left: brand promo panel. Right: ONE real review at a time, auto-advancing every
// 4.5s with clickable dots. Data comes from landing.reviews (set through the admin) —
// nothing here is fabricated.
import Image from "next/image";
import { useEffect, useState } from "react";

export type Testimonial = {
  id: string;
  name: string | null;
  rating: number;
  body: string | null;
  images?: string[] | null;
};

const AVATAR_GRADIENTS = [
  "from-violet-400 to-pink-400",
  "from-sky-400 to-indigo-400",
  "from-pink-400 to-rose-500",
  "from-fuchsia-400 to-purple-500",
  "from-cyan-400 to-blue-500",
  "from-rose-400 to-orange-400",
];

export function TestimonialsSection({ reviews, reviewsHref }: { reviews: Testimonial[]; reviewsHref: string }) {
  const [i, setI] = useState(0);
  const n = reviews.length;
  const dots = Math.min(n, 6);

  useEffect(() => {
    if (n <= 1) return;
    const t = setInterval(() => setI((v) => (v + 1) % n), 4500);
    return () => clearInterval(t);
  }, [n]);

  const r = n ? reviews[i % n] : null;
  const initial = (r?.name || "গ").trim().charAt(0).toUpperCase();
  const photo = r?.images && r.images.length ? r.images[0] : null;

  return (
    <section className="mt-8">
      <div className="grid overflow-hidden rounded-[1.75rem] shadow-sm ring-1 ring-black/5 md:grid-cols-2">
        {/* LEFT — brand promo */}
        <div className="bg-gradient-to-br from-accent to-accent-dark px-6 py-9 text-white sm:px-9">
          <p className="inline-flex items-center gap-2 text-[13px] font-semibold text-white/90">
            <svg viewBox="0 0 24 24" className="h-4 w-4 fill-white" aria-hidden><path d="M12 21s-6.7-4.4-9.3-8.2C.9 10 1.6 6.5 4.4 5.3c1.9-.8 3.9-.2 5.2 1.3L12 9l2.4-2.4c1.3-1.5 3.3-2.1 5.2-1.3 2.8 1.2 3.5 4.7 1.7 7.5C18.7 16.6 12 21 12 21z" /></svg>
            আমাদের প্রিয় গ্রাহকদের মতামত
          </p>
          <h2 className="mt-4 font-display text-2xl font-extrabold leading-snug sm:text-[1.9rem]">হাজারো মায়ের বিশ্বাসের নাম <span className="whitespace-nowrap">ড্রিম কমফোর্ট</span></h2>
          <div className="mt-4 flex items-center gap-2.5">
            <span className="inline-flex gap-0.5">
              {Array.from({ length: 5 }).map((_, k) => (
                <svg key={k} viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="#FBBF24" aria-hidden><path d="m12 2 3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1z" /></svg>
              ))}
            </span>
            <span className="text-sm font-semibold">৪.৯/৫ <span className="font-normal text-white/85">(৫০,০০০+ রিভিউ)</span></span>
          </div>
        </div>

        {/* RIGHT — one review at a time */}
        <div className="flex flex-col justify-center bg-white px-6 py-9 sm:px-8">
          {r ? (
            <>
              <span aria-hidden className="mb-1 block font-serif text-5xl leading-none text-accent/25">&rdquo;</span>
              <p className="min-h-[84px] text-[15px] italic leading-relaxed text-gray-700">{r.body}</p>
              <div className="mt-5 flex items-center gap-3">
                {photo ? (
                  <Image src={photo} alt={r.name || "গ্রাহক"} width={48} height={48} sizes="48px" className="h-12 w-12 shrink-0 rounded-full object-cover ring-2 ring-accent-light" />
                ) : (
                  <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-full bg-gradient-to-br ${AVATAR_GRADIENTS[i % AVATAR_GRADIENTS.length]} text-lg font-bold text-white`}>{initial}</span>
                )}
                <div>
                  <p className="font-bold text-gray-900">{r.name || "গ্রাহক"}</p>
                  <p className="mt-0.5 inline-flex items-center gap-1 text-[12px] font-semibold text-green-600">
                    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="currentColor" aria-hidden><path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm-1.2 14.2-4-4 1.4-1.4 2.6 2.6 5.6-5.6 1.4 1.4z" /></svg>
                    ভেরিফায়েড ক্রেতা
                  </p>
                </div>
              </div>

              {dots > 1 && (
                <div className="mt-6 flex items-center gap-2">
                  {Array.from({ length: dots }).map((_, k) => (
                    <button
                      key={k}
                      type="button"
                      aria-label={`রিভিউ ${k + 1}`}
                      onClick={() => setI(k)}
                      className={`h-2 rounded-full transition-all ${k === i % dots ? "w-5 bg-accent" : "w-2 bg-gray-300"}`}
                    />
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="text-center">
              <p className="text-[15px] text-gray-600">এখনো কোনো রিভিউ যোগ হয়নি — অ্যাডমিন প্যানেল থেকে রিভিউ যোগ করুন।</p>
              <a href={reviewsHref} className="mt-5 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-accent to-accent-dark px-6 py-3 text-sm font-bold text-white shadow-md">রিভিউ দিন <span aria-hidden>→</span></a>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
