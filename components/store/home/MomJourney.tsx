"use client";

// MomJourney — beat 07. An immersive timeline of motherhood; each stage surfaces
// the relevant part of the catalogue, so the brand reads as an ecosystem, not a
// single product. Matching is client-side keyword mapping over real products.

import { useMemo, useState } from "react";
import type { Product, Category } from "@/lib/types";
import { SoftProductCard } from "@/components/store/home/SoftProductCard";

const STAGES: { en: string; bn: string; desc: string; kw: string[] }[] = [
  { en: "Discovering", bn: "গর্ভধারণের শুরু", desc: "নতুন যাত্রার প্রথম দিন — শরীর ও মন দুটোরই একটু বেশি যত্ন দরকার।", kw: ["pregn", "maternity", "গর্ভ", "প্রেগ", "pillow", "পিলো"] },
  { en: "Growing", bn: "বেড়ে ওঠা", desc: "পেট বাড়ছে, ঘুম কঠিন হচ্ছে — সঠিক সাপোর্টে রাত হোক আরামের।", kw: ["pillow", "পিলো", "support", "belly", "cushion", "কুশন", "cream"] },
  { en: "Preparing", bn: "প্রস্তুতি", desc: "আগমনের অপেক্ষা — নবজাতকের জন্য নরম, নিরাপদ সবকিছু গুছিয়ে নিন।", kw: ["newborn", "নবজাত", "blanket", "কম্বল", "baby", "শিশু", "bag"] },
  { en: "Becoming a mother", bn: "মা হওয়া", desc: "প্রথম কোল, প্রথম ফিড — মায়ের সুস্থতাও ঠিক ততটাই জরুরি।", kw: ["feeding", "ফিডিং", "nursing", "mom", "মা", "postpartum", "breast"] },
  { en: "Caring for baby", bn: "শিশুর যত্ন", desc: "প্রতিদিনের যত্ন — কোমল ত্বকের জন্য কোমল, নিরাপদ পণ্য।", kw: ["baby", "শিশু", "বেবি", "diaper", "ডায়াপার", "lotion", "bath"] },
  { en: "Growing together", bn: "একসাথে বেড়ে ওঠা", desc: "প্রতিটি নতুন ধাপ — শেখা, খেলা আর বেড়ে ওঠার আনন্দে পাশে থাকা।", kw: ["baby", "শিশু", "toy", "খেলনা", "kids", "grow"] },
];

export function MomJourney({ products }: { products: Product[]; categories?: Category[] }) {
  const [i, setI] = useState(0);
  const stage = STAGES[i];

  const matched = useMemo(() => {
    const hay = (p: Product) => `${p.name_en || ""} ${p.name_bn || ""} ${p.slug}`.toLowerCase();
    const hit = products.filter((p) => stage.kw.some((k) => hay(p).includes(k)));
    return (hit.length >= 2 ? hit : products).slice(0, 4);
  }, [i, products]);

  return (
    <section className="bg-ink text-white overflow-hidden">
      <div className="mx-auto max-w-6xl px-5 sm:px-6 py-16 sm:py-20">
        <div className="max-w-xl">
          <p className="sc-eyebrow text-blush-light">০৭ — মাতৃত্বের যাত্রা</p>
          <h2 className="mt-3 font-sans font-bold text-[26px] sm:text-[32px] leading-tight">প্রতিটি ধাপে, পাশে</h2>
          <p className="mt-2 text-white/60 text-[14.5px]">Dream Comfort শুধু একটি পিলো নয় — পুরো মাতৃত্বের সঙ্গী।</p>
        </div>

        {/* Timeline rail */}
        <div className="mt-9 -mx-5 px-5 sm:mx-0 sm:px-0 overflow-x-auto sc-noscroll">
          <div className="flex items-center gap-0 min-w-[640px]">
            {STAGES.map((s, idx) => {
              const on = idx === i;
              const done = idx < i;
              return (
                <div key={s.en} className="flex items-center flex-1">
                  <button onClick={() => setI(idx)} className="flex flex-col items-center gap-2 group">
                    <span className={`grid place-items-center h-9 w-9 rounded-full text-[13px] font-bold transition ring-2 ${on ? "bg-blush text-white ring-blush" : done ? "bg-white/15 text-white ring-white/20" : "bg-transparent text-white/50 ring-white/20"}`}>
                      {idx + 1}
                    </span>
                    <span className={`text-[11px] font-semibold whitespace-nowrap transition ${on ? "text-white" : "text-white/45"}`}>{s.bn}</span>
                  </button>
                  {idx < STAGES.length - 1 && <span className={`h-[2px] flex-1 mx-1 rounded transition ${idx < i ? "bg-blush/60" : "bg-white/12"}`} />}
                </div>
              );
            })}
          </div>
        </div>

        {/* Active stage panel */}
        <div className="mt-9 grid lg:grid-cols-[0.8fr_1.2fr] gap-8 items-center">
          <div>
            <p className="sc-serif italic text-blush-light text-xl">{stage.en}</p>
            <h3 className="mt-1 font-sans font-bold text-[24px]">{stage.bn}</h3>
            <p className="mt-3 text-white/70 text-[15px] leading-relaxed max-w-sm">{stage.desc}</p>
            <a href="/products" className="mt-5 inline-flex items-center gap-1.5 text-[14px] font-semibold text-blush-light hover:text-white transition">
              এই ধাপের পণ্য দেখুন
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
            </a>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
            {matched.map((p) => <SoftProductCard key={p.id} p={p} />)}
          </div>
        </div>
      </div>
    </section>
  );
}
