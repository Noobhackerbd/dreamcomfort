"use client";

// BodyComfort — beat 05. Turns product education into an interactive comfort map.
// Select a body zone (or hover a card) to see how proper support helps. Light,
// editorial, no hard sell — it builds understanding, not urgency.

import { useState } from "react";

type Key = "head" | "back" | "belly" | "hip" | "leg";
const ZONES: { key: Key; label: string; title: string; body: string; x: number; y: number }[] = [
  { key: "head", label: "মাথা", title: "সঠিক উচ্চতায় মাথা ও ঘাড়", body: "কাঁধ ও ঘাড়ের পেশি শিথিল থাকে — সকালে ঘাড়ব্যথা ছাড়াই ঘুম ভাঙে।", x: 130, y: 60 },
  { key: "back", label: "পিঠ", title: "মেরুদণ্ডের প্রাকৃতিক সাপোর্ট", body: "পাশ ফিরে শোয়ার সময় মেরুদণ্ড সোজা থাকে, নিচের পিঠের চাপ কমে।", x: 108, y: 170 },
  { key: "belly", label: "পেট", title: "পেটের কোমল ঠেকা", body: "ক্রমবর্ধমান পেট ঝুলে না পড়ে কোমল সাপোর্ট পায়, পেশিতে টান কমে।", x: 168, y: 200 },
  { key: "hip", label: "হাঁটু ও কোমর", title: "হাঁটুর মাঝে সঠিক ব্যবধান", body: "দুই হাঁটুর মাঝে পিলো রাখলে কোমর ও নিতম্বের জয়েন্ট সঠিক অবস্থানে থাকে।", x: 150, y: 285 },
  { key: "leg", label: "পা", title: "পা উঁচু ও রিল্যাক্সড", body: "পা সামান্য উঁচুতে থাকলে রক্তসঞ্চালন ভালো হয়, পায়ের ফোলাভাব কমে।", x: 175, y: 355 },
];
const VW = 260, VH = 400;

export function BodyComfort() {
  const [active, setActive] = useState<Key>("belly");

  return (
    <section className="bg-ivory">
      <div className="mx-auto max-w-6xl px-5 sm:px-6 py-16 sm:py-20">
        <div className="text-center max-w-xl mx-auto">
          <p className="sc-eyebrow text-blush-deep">০৫ — কমফোর্ট ম্যাপ</p>
          <h2 className="mt-3 font-sans font-bold text-ink text-[26px] sm:text-[32px] leading-tight">শরীরের যেখানে আরাম প্রয়োজন</h2>
          <p className="mt-2 text-ink-muted text-[14.5px]">প্রতিটি জায়গায় ট্যাপ করুন — দেখুন সঠিক সাপোর্ট কীভাবে কাজ করে।</p>
        </div>

        <div className="mt-10 grid lg:grid-cols-[0.85fr_1.15fr] gap-10 items-center">
          {/* Figure */}
          <div className="relative mx-auto w-full max-w-[320px] aspect-[260/400]">
            <div className="absolute inset-0 sc-blob bg-blush-mist/70" />
            <svg viewBox={`0 0 ${VW} ${VH}`} className="absolute inset-0 h-full w-full">
              <defs>
                <radialGradient id="sc-bc-glow" cx="50%" cy="50%" r="50%">
                  <stop offset="0" stopColor="#F4ABBD" stopOpacity="0.8" />
                  <stop offset="1" stopColor="#F4ABBD" stopOpacity="0" />
                </radialGradient>
              </defs>
              {(() => { const z = ZONES.find((z) => z.key === active)!; return <circle cx={z.x} cy={z.y} r="46" fill="url(#sc-bc-glow)" style={{ transition: "cx .35s, cy .35s" }} />; })()}
              {/* side-profile standing pregnant figure */}
              <g fill="none" stroke="#2A2530" strokeOpacity="0.8" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="130" cy="58" r="26" />
                <path d="M112 78c-6 20-8 44-6 66" />
                <path d="M148 76c10 14 14 36 14 60" />
                {/* belly */}
                <path d="M106 150c-6 34 4 60 44 62 30 1 30-40 12-64" />
                {/* legs */}
                <path d="M118 214c-2 40 4 70 10 96l6 40" />
                <path d="M150 216c8 34 16 62 22 88l4 42" />
              </g>
            </svg>
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
          </div>

          {/* Zone list */}
          <div className="space-y-2.5">
            {ZONES.map((z) => {
              const on = z.key === active;
              return (
                <button
                  key={z.key}
                  onMouseEnter={() => setActive(z.key)}
                  onClick={() => setActive(z.key)}
                  className={`w-full text-left rounded-3xl p-5 transition-all duration-300 ease-soft-spring ring-1 ${
                    on ? "bg-white ring-blush shadow-card" : "bg-white/60 ring-ink/[0.06] hover:bg-white"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className={`grid place-items-center h-9 w-9 rounded-full text-[13px] font-bold shrink-0 transition ${on ? "bg-blush text-white" : "bg-blush-soft text-blush-deep"}`}>
                      {ZONES.indexOf(z) + 1}
                    </span>
                    <div className="min-w-0">
                      <p className="text-[11px] font-semibold text-blush-deep">{z.label}</p>
                      <p className="text-[15px] font-bold text-ink leading-tight">{z.title}</p>
                    </div>
                  </div>
                  <div className={`grid transition-all duration-300 ease-soft-spring ${on ? "grid-rows-[1fr] opacity-100 mt-2.5" : "grid-rows-[0fr] opacity-0"}`}>
                    <p className="overflow-hidden text-[13.5px] text-ink-soft leading-relaxed pl-12">{z.body}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
