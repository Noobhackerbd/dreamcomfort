"use client";

import { useEffect, useRef, useState } from "react";
import { playPop } from "@/lib/sound";

/** Auto-advancing image slideshow with manual controls (arrows, dots, swipe) + sound. */
export function HeroSlider({ images, alt }: { images: string[]; alt: string }) {
  const [i, setI] = useState(0);
  const has = images.length > 0;
  const many = images.length > 1;
  const touchX = useRef<number | null>(null);
  const pausedUntil = useRef<number>(0);

  // Auto-advance (pauses briefly after a manual interaction).
  useEffect(() => {
    if (!many) return;
    const t = setInterval(() => {
      if (Date.now() < pausedUntil.current) return;
      setI((p) => (p + 1) % images.length);
    }, 3800);
    return () => clearInterval(t);
  }, [images.length, many]);

  function go(next: number, withSound = true) {
    if (!many) return;
    pausedUntil.current = Date.now() + 6000; // pause auto for 6s after manual move
    setI((next + images.length) % images.length);
    if (withSound) playPop();
  }

  return (
    <div className="relative">
      {/* soft glow behind */}
      <div className="absolute -inset-4 rounded-[2.5rem] bg-gradient-to-br from-brand-light/50 to-accent-light/50 blur-2xl" />
      <div
        className="relative aspect-square w-full overflow-hidden rounded-[2rem] bg-white shadow-soft ring-1 ring-white select-none"
        onTouchStart={(e) => (touchX.current = e.touches[0].clientX)}
        onTouchEnd={(e) => {
          if (touchX.current == null) return;
          const dx = e.changedTouches[0].clientX - touchX.current;
          if (Math.abs(dx) > 40) go(dx < 0 ? i + 1 : i - 1);
          touchX.current = null;
        }}
      >
        {has ? (
          images.map((src, idx) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={src + idx}
              src={src}
              alt={alt}
              draggable={false}
              loading={idx === 0 ? "eager" : "lazy"}
              decoding="async"
              className="absolute inset-0 h-full w-full object-cover transition-opacity duration-[900ms]"
              style={{ opacity: idx === i ? 1 : 0 }}
            />
          ))
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-brand-soft to-accent-soft text-gray-400 font-display text-lg">
            {alt}
          </div>
        )}

        {many && (
          <>
            <button
              type="button"
              aria-label="আগের ছবি"
              onClick={() => go(i - 1)}
              className="absolute left-3 top-1/2 -translate-y-1/2 h-11 w-11 rounded-full bg-white text-brand-dark text-2xl leading-none shadow-lg ring-1 ring-black/5 hover:scale-110 active:scale-95 transition flex items-center justify-center"
            >
              ‹
            </button>
            <button
              type="button"
              aria-label="পরের ছবি"
              onClick={() => go(i + 1)}
              className="absolute right-3 top-1/2 -translate-y-1/2 h-11 w-11 rounded-full bg-white text-brand-dark text-2xl leading-none shadow-lg ring-1 ring-black/5 hover:scale-110 active:scale-95 transition flex items-center justify-center"
            >
              ›
            </button>

            {/* image counter */}
            <span className="absolute top-3 right-3 rounded-full bg-black/45 text-white text-xs px-2 py-0.5">
              {i + 1}/{images.length}
            </span>

            <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5">
              {images.map((_, idx) => (
                <button
                  key={idx}
                  type="button"
                  aria-label={`ছবি ${idx + 1}`}
                  onClick={() => go(idx)}
                  className={"h-2.5 rounded-full transition-all " + (idx === i ? "w-7 bg-accent" : "w-2.5 bg-white/90 ring-1 ring-black/5")}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
