// HeroCinematic — beat 01. Full-bleed cinematic opening. Server component
// (no client hooks). Accepts an optional hero photograph (from admin banners);
// when absent it renders an original, brand-tuned fine-line illustration so the
// page still feels art-directed. Drop real mother/baby photography into the
// admin "hero banner" slot to replace the illustration.

import Image from "next/image";

export function HeroCinematic({ heroImage }: { heroImage?: string }) {
  return (
    <section className="relative overflow-hidden bg-ivory">
      {/* Soft organic background shapes */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute -top-32 -right-24 h-[520px] w-[520px] sc-blob bg-blush-soft/70 blur-2xl" />
        <div className="absolute -bottom-40 -left-32 h-[460px] w-[460px] sc-blob-2 bg-beige-soft/80 blur-2xl" />
      </div>

      <div className="relative mx-auto max-w-6xl px-5 sm:px-6">
        <div className="grid lg:grid-cols-[1.05fr_1fr] gap-8 lg:gap-12 items-center min-h-[86vh] py-14 lg:py-20">
          {/* Copy */}
          <div className="max-w-xl">
            <p className="sc-eyebrow text-blush-deep">ড্রিম কমফোর্ট</p>
            <p className="sc-serif italic text-ink-muted text-lg mt-4">Soft comfort, from the very first day —</p>
            <h1 className="mt-2 font-sans font-bold text-ink leading-[1.12] text-[34px] sm:text-[46px] lg:text-[54px]">
              মায়ের আরাম থেকেই শুরু হয়
              <br className="hidden sm:block" /> একটি সুন্দর যাত্রা।
            </h1>
            <p className="mt-5 text-ink-soft text-[15.5px] leading-relaxed max-w-md">
              গর্ভাবস্থা থেকে মাতৃত্বের প্রতিটি মুহূর্তে Dream Comfort পাশে আছে — যত্ন,
              নিরাপত্তা আর সত্যিকারের আরাম নিয়ে।
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <a href="/products" className="sc-btn rounded-full px-8 py-3.5 text-[15px] font-bold">শপ করুন</a>
              <a href="/about" className="sc-btn-ghost rounded-full px-7 py-3.5 text-[15px] font-semibold">
                Dream Comfort সম্পর্কে জানুন
              </a>
            </div>
            <div className="mt-9 flex items-center gap-6 text-[12.5px] text-ink-muted">
              <span className="inline-flex items-center gap-2">
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10zM9 12l2 2 4-4" /></svg>
                সারা দেশে ক্যাশ অন ডেলিভারি
              </span>
              <span className="hidden sm:inline-flex items-center gap-2">
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#E1809A" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z" /></svg>
                ১০,০০০+ মায়ের ভরসা
              </span>
            </div>
          </div>

          {/* Visual */}
          <div className="relative">
            <div className="relative mx-auto w-full max-w-[440px] aspect-[4/5] overflow-hidden ring-1 ring-ink/[0.06] shadow-lux bg-gradient-to-br from-blush-mist via-ivory to-beige-soft" style={{ borderRadius: "46% 54% 50% 50% / 40% 42% 58% 60%" }}>
              {heroImage ? (
                <Image src={heroImage} alt="Dream Comfort" fill priority sizes="(max-width:1024px) 90vw, 440px" className="object-cover" />
              ) : (
                <HeroIllustration />
              )}
            </div>
            {/* Floating soft chip */}
            <div className="absolute -left-2 sm:left-2 bottom-8 rounded-2xl bg-white/95 backdrop-blur px-4 py-3 shadow-card ring-1 ring-ink/[0.05] sc-float-soft">
              <p className="text-[11px] text-ink-muted">প্রিমিয়াম প্রেগন্যান্সি পিলো</p>
              <p className="text-[13px] font-bold text-ink flex items-center gap-1">
                ★★★★★ <span className="text-ink-muted font-medium">৪.৯</span>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Scroll cue */}
      <div className="sc-scroll-cue absolute bottom-5 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1.5 text-ink-faint">
        <span className="h-8 w-[22px] rounded-full border border-ink/20 grid justify-center pt-1.5">
          <span className="block h-1.5 w-1 rounded-full bg-ink/40" />
        </span>
      </div>
    </section>
  );
}

// Original, abstract line-art of a mother — no photo dependency, no realistic face.
function HeroIllustration() {
  return (
    <svg viewBox="0 0 400 500" className="absolute inset-0 h-full w-full" role="img" aria-label="মা ও শিশুর যত্নের অলংকরণ">
      <defs>
        <linearGradient id="sc-hero-g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#FBE3EA" />
          <stop offset="1" stopColor="#F2E9DD" />
        </linearGradient>
      </defs>
      <rect width="400" height="500" fill="url(#sc-hero-g)" />
      <circle cx="205" cy="150" r="150" fill="#F9CEDA" opacity="0.55" />
      <g fill="none" stroke="#2A2530" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" opacity="0.78">
        {/* head */}
        <circle cx="188" cy="150" r="40" />
        {/* hair sweep */}
        <path d="M150 140c-6-34 22-58 50-56 24 2 40 20 40 40 0 8-2 14-2 14" />
        {/* body + cradling arms around belly */}
        <path d="M150 190c-16 22-24 60-18 104 4 30 6 60 4 96" />
        <path d="M232 188c22 20 34 58 30 108-2 28-4 60-2 90" />
        {/* belly curve */}
        <path d="M164 300c8 42 60 52 92 22 20-19 20-58 4-86" />
        {/* embracing hands */}
        <path d="M176 286c14 16 40 20 58 8" />
        {/* small heart near belly */}
        <path d="M198 250c-8-9-22-4-22 7 0 10 22 22 22 22s22-12 22-22c0-11-14-16-22-7z" stroke="#E1809A" fill="#F9CEDA" />
      </g>
    </svg>
  );
}
