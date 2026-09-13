"use client";

// SignaturePillow — beat 03. The iconic Dream Comfort product, presented as an
// editorial split screen with interactive benefit hotspots: hover/tap a support
// zone and the matching area of the reclining figure lights up. Buy buttons use
// the real cart + Meta/TikTok tracking.

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useCart } from "@/lib/cart/store";
import { fireEvent } from "@/components/track";
import { taka } from "@/lib/format";
import type { Product } from "@/lib/types";

type ZoneKey = "head" | "back" | "belly" | "knee" | "leg";
const ZONES: { key: ZoneKey; label: string; note: string; x: number; y: number }[] = [
  { key: "head", label: "মাথা", note: "ঘাড় ও মাথা সঠিক অবস্থানে রেখে টেনশন কমায়।", x: 150, y: 95 },
  { key: "back", label: "পিঠ", note: "মেরুদণ্ডের প্রাকৃতিক বাঁক সাপোর্ট করে পিঠব্যথা কমায়।", x: 118, y: 188 },
  { key: "belly", label: "পেট", note: "বাড়তে থাকা পেটকে কোমল, চাপহীন সাপোর্ট দেয়।", x: 250, y: 206 },
  { key: "knee", label: "হাঁটু", note: "দুই হাঁটুর মাঝে থেকে কোমর ও নিতম্বের চাপ কমায়।", x: 300, y: 284 },
  { key: "leg", label: "পা", note: "পা উঁচু রেখে রক্তসঞ্চালন ভালো রাখে, ফোলাভাব কমায়।", x: 360, y: 318 },
];
const VW = 480, VH = 360;

export function SignaturePillow({ product }: { product: Product | null }) {
  const router = useRouter();
  const add = useCart((s) => s.add);
  const [active, setActive] = useState<ZoneKey>("belly");
  const [added, setAdded] = useState(false);
  const zone = ZONES.find((z) => z.key === active)!;

  const name = product ? (product.name_bn || product.name_en) : "প্রিমিয়াম প্রেগন্যান্সি পিলো সেট";
  const img = product?.images?.[0];
  const price = product?.price ?? 0;
  const compare = product?.compare_at_price ?? null;
  const hasDiscount = !!compare && compare > price;

  function track() {
    if (!product) return;
    fireEvent("AddToCart", {
      currency: "BDT", value: price, content_ids: [product.id], content_type: "product",
      contents: [{ id: product.id, quantity: 1, item_price: price }], num_items: 1,
    });
  }
  function addToCart() {
    if (!product) { router.push("/products"); return; }
    add({ id: product.id, slug: product.slug, name, price, image: img }, 1); track();
    setAdded(true); setTimeout(() => setAdded(false), 1400);
  }
  function orderNow() {
    if (!product) { router.push("/products"); return; }
    add({ id: product.id, slug: product.slug, name, price, image: img }, 1); track();
    router.push("/checkout");
  }

  return (
    <section className="bg-ink text-white overflow-hidden">
      <div className="mx-auto max-w-6xl px-5 sm:px-6 py-16 sm:py-20 grid lg:grid-cols-2 gap-10 lg:gap-14 items-center">
        {/* Interactive visual */}
        <div className="order-2 lg:order-1">
          <div className="relative w-full aspect-[4/3] rounded-[32px] bg-gradient-to-br from-[#37313f] to-[#2a2530] ring-1 ring-white/10 overflow-hidden">
            {/* Reclining figure + C-pillow, original line art */}
            <svg viewBox={`0 0 ${VW} ${VH}`} className="absolute inset-0 h-full w-full">
              <defs>
                <radialGradient id="sc-glow" cx="50%" cy="50%" r="50%">
                  <stop offset="0" stopColor="#F4ABBD" stopOpacity="0.85" />
                  <stop offset="1" stopColor="#F4ABBD" stopOpacity="0" />
                </radialGradient>
              </defs>
              {/* C-shaped support pillow */}
              <path d="M70 150C70 70 150 40 230 55c70 13 120 55 150 110 18 33 12 78-20 96-30 17-58-2-70-30-16-38-44-58-86-58-52 0-74 34-74 70 0 12-10 20-22 18-18-3-28-20-28-44z"
                fill="#F9CEDA" opacity="0.16" stroke="#F4ABBD" strokeOpacity="0.5" strokeWidth="2" />
              {/* active glow */}
              <circle cx={zone.x} cy={zone.y} r="66" fill="url(#sc-glow)" style={{ transition: "cx .4s, cy .4s" }} />
              {/* reclining figure line-art */}
              <g fill="none" stroke="#ffffff" strokeOpacity="0.82" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="150" cy="95" r="27" />
                <path d="M124 118c-14 16-20 44-14 70" />
                <path d="M176 116c26 10 52 34 74 66" />
                <path d="M110 188c30 22 78 26 120 6" />
                <path d="M232 206c28 20 52 46 68 78" />
                <path d="M300 284c22 12 44 22 60 34" />
              </g>
            </svg>

            {/* Hotspot dots */}
            {ZONES.map((z) => (
              <button
                key={z.key}
                aria-label={z.label}
                onMouseEnter={() => setActive(z.key)}
                onClick={() => setActive(z.key)}
                data-active={active === z.key}
                className="sc-hotspot"
                style={{ left: `calc(${(z.x / VW) * 100}% - 13px)`, top: `calc(${(z.y / VH) * 100}% - 13px)` }}
              >
                <span />
              </button>
            ))}

            {/* Active note */}
            <div className="absolute left-4 right-4 bottom-4 rounded-2xl bg-white/10 backdrop-blur px-4 py-3 ring-1 ring-white/15">
              <p className="text-[12px] font-bold text-blush-light">{zone.label} সাপোর্ট</p>
              <p className="text-[12.5px] text-white/85 leading-snug mt-0.5">{zone.note}</p>
            </div>
          </div>
        </div>

        {/* Copy + buy */}
        <div className="order-1 lg:order-2">
          <p className="sc-eyebrow text-blush-light">০৩ — সিগনেচার</p>
          <p className="sc-serif italic text-white/60 text-lg mt-3">The Dream Comfort Signature</p>
          <h2 className="mt-1.5 font-sans font-bold text-[27px] sm:text-[34px] leading-tight">{name}</h2>
          <div className="mt-3 flex items-center gap-2 text-[13px]">
            <span className="text-blush-light tracking-wide">★★★★★</span>
            <span className="text-white/60">৪.৯ · হাজারো মায়ের পছন্দ</span>
          </div>
          <p className="mt-4 text-white/75 text-[15px] leading-relaxed max-w-md">
            একটি পিলো, পুরো শরীরের আরাম। মাথা থেকে পা — প্রতিটি জায়গায় সঠিক সাপোর্ট,
            যেন প্রতিটি রাত হয় গভীর, শান্ত ঘুমের।
          </p>

          {/* Benefit chips */}
          <div className="mt-6 flex flex-wrap gap-2">
            {ZONES.map((z) => (
              <button
                key={z.key}
                onMouseEnter={() => setActive(z.key)}
                onClick={() => setActive(z.key)}
                className={`rounded-full px-4 py-2 text-[13px] font-semibold transition ring-1 ${
                  active === z.key ? "bg-blush text-white ring-blush" : "bg-white/5 text-white/80 ring-white/15 hover:bg-white/10"
                }`}
              >
                {z.label}
              </button>
            ))}
          </div>

          {product && (
            <div className="mt-7 flex items-baseline gap-3">
              <span className="font-bold text-[30px]">{taka(price)}</span>
              {hasDiscount && <span className="text-white/45 line-through text-[16px]">{taka(compare as number)}</span>}
              {hasDiscount && <span className="rounded-full bg-blush/20 text-blush-light text-[12px] font-bold px-2.5 py-1">সাশ্রয়</span>}
            </div>
          )}

          <div className="mt-6 flex flex-wrap gap-3">
            <button onClick={orderNow} className="sc-btn rounded-full px-8 py-3.5 text-[15px] font-bold">এখনই অর্ডার করুন</button>
            <button onClick={addToCart} className="rounded-full px-7 py-3.5 text-[15px] font-semibold bg-white/10 text-white ring-1 ring-white/20 hover:bg-white/15 transition">
              {added ? "✓ যোগ হয়েছে" : "কার্টে যোগ করুন"}
            </button>
          </div>

          {img && (
            <div className="mt-7 flex items-center gap-3">
              <span className="relative h-16 w-16 rounded-2xl overflow-hidden ring-1 ring-white/15 shrink-0">
                <Image src={img} alt={name} fill sizes="64px" className="object-cover" />
              </span>
              <a href={`/product/${product!.slug}`} className="text-[13.5px] text-white/70 hover:text-white underline underline-offset-4">
                সম্পূর্ণ বিবরণ ও ছবি দেখুন →
              </a>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
