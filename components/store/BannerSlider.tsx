"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

export interface Slide { image: string; link?: string }

export function BannerSlider({
  slides, aspect = "16 / 10", arrows = false, rounded = "1.25rem", interval = 4000,
}: {
  slides: Slide[]; aspect?: string; arrows?: boolean; rounded?: string; interval?: number;
}) {
  const [i, setI] = useState(0);
  const n = slides.length;
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (n <= 1) return;
    timer.current = setInterval(() => setI((x) => (x + 1) % n), interval);
    return () => { if (timer.current) clearInterval(timer.current); };
  }, [n, interval]);

  if (n === 0) return null;
  const go = (d: number) => setI((x) => (x + d + n) % n);

  return (
    <div className="relative overflow-hidden" style={{ borderRadius: rounded }}>
      <div className="flex transition-transform duration-500 ease-out" style={{ transform: `translateX(-${i * 100}%)` }}>
        {slides.map((s, idx) => {
          const inner = (
            <div className="relative w-full" style={{ aspectRatio: aspect, background: "linear-gradient(135deg,#E7F4FC,#FDEDF3)" }}>
              <Image src={s.image} alt="" fill sizes="(max-width:768px) 100vw, 1024px" className="object-cover" priority={idx === 0} />
            </div>
          );
          return (
            <div key={idx} className="min-w-full">
              {s.link ? <a href={s.link}>{inner}</a> : inner}
            </div>
          );
        })}
      </div>

      {arrows && n > 1 && (
        <>
          <button onClick={() => go(-1)} aria-label="prev" className="absolute left-2 top-1/2 -translate-y-1/2 h-9 w-9 rounded-full bg-white/90 shadow flex items-center justify-center text-gray-600">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
          </button>
          <button onClick={() => go(1)} aria-label="next" className="absolute right-2 top-1/2 -translate-y-1/2 h-9 w-9 rounded-full bg-white/90 shadow flex items-center justify-center text-gray-600">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6" /></svg>
          </button>
        </>
      )}

      {n > 1 && (
        <div className="absolute bottom-2.5 inset-x-0 flex justify-center gap-1.5">
          {slides.map((_, idx) => (
            <button key={idx} onClick={() => setI(idx)} aria-label={`slide ${idx + 1}`}
              className="h-[7px] rounded-full transition-all"
              style={{ width: idx === i ? 18 : 7, background: idx === i ? "#5FB4E4" : "rgba(0,0,0,.18)" }} />
          ))}
        </div>
      )}
    </div>
  );
}
