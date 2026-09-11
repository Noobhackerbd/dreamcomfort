"use client";

import Image from "next/image";
import { useRef, useState } from "react";

function ytEmbed(url: string): string | null {
  const m = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([\w-]{6,})/);
  return m ? `https://www.youtube.com/embed/${m[1]}` : null;
}

export function ProductGallery({ images, name, videoUrl }: { images: string[]; name: string; videoUrl?: string | null }) {
  const hasVideo = !!videoUrl;
  const yt = videoUrl ? ytEmbed(videoUrl) : null;
  const slides = hasVideo ? [{ type: "video" as const }, ...images.map((src) => ({ type: "image" as const, src }))] : images.map((src) => ({ type: "image" as const, src }));

  const [active, setActive] = useState(0);
  const [lightbox, setLightbox] = useState(false);
  const [zoom, setZoom] = useState<{ x: number; y: number } | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const current = slides[active] || slides[0];

  function onMove(e: React.MouseEvent) {
    const el = ref.current; if (!el) return;
    const r = el.getBoundingClientRect();
    setZoom({ x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100 });
  }

  return (
    <div>
      <div
        ref={ref}
        className="group relative aspect-square rounded-2xl bg-gray-100 overflow-hidden ring-1 ring-black/5 cursor-zoom-in"
        onMouseMove={current?.type === "image" ? onMove : undefined}
        onMouseLeave={() => setZoom(null)}
        onClick={() => current?.type === "image" && setLightbox(true)}
      >
        {current?.type === "video" ? (
          yt ? (
            <iframe src={yt} title={name} className="absolute inset-0 h-full w-full" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
          ) : (
            // eslint-disable-next-line jsx-a11y/media-has-caption
            <video src={videoUrl!} controls className="absolute inset-0 h-full w-full object-cover" />
          )
        ) : current?.src ? (
          <Image
            src={current.src}
            alt={name}
            fill
            priority
            sizes="(max-width: 768px) 100vw, 560px"
            className="object-cover transition-transform duration-200"
            style={zoom ? { transform: "scale(1.9)", transformOrigin: `${zoom.x}% ${zoom.y}%` } : undefined}
          />
        ) : (
          <span className="absolute inset-0 grid place-items-center text-gray-400">{name}</span>
        )}
      </div>

      {slides.length > 1 && (
        <div className="mt-3 flex gap-2 flex-wrap">
          {slides.map((s, i) => (
            <button key={i} onClick={() => setActive(i)}
              className={"relative h-16 w-16 rounded-xl overflow-hidden ring-2 transition " + (i === active ? "ring-brand" : "ring-transparent hover:ring-black/10")}>
              {s.type === "video" ? (
                <span className="absolute inset-0 grid place-items-center bg-gray-900 text-white">
                  <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5"><path d="M8 5v14l11-7z" /></svg>
                </span>
              ) : (
                <Image src={s.src} alt="" fill sizes="64px" className="object-cover" />
              )}
            </button>
          ))}
        </div>
      )}

      {/* Lightbox */}
      {lightbox && current?.type === "image" && current.src && (
        <div className="fixed inset-0 z-[90] bg-black/90 grid place-items-center p-4" onClick={() => setLightbox(false)}>
          <button className="absolute top-4 right-4 text-white text-3xl" aria-label="close">×</button>
          <div className="relative w-full max-w-3xl aspect-square">
            <Image src={current.src} alt={name} fill sizes="90vw" className="object-contain" />
          </div>
        </div>
      )}
    </div>
  );
}
