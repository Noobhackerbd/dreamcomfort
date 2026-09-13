// CommunityFamily — beat 10. An elegant social-commerce invitation. We don't have
// real customer UGC in the schema, so this is honestly framed as a brand gallery +
// an invite to join on social — never fabricated customer photos. Uses real
// product imagery. When you add a customer-photo field later, swap `images` for it.

import Image from "next/image";

export function CommunityFamily({ images, instagram, facebook }: { images: string[]; instagram?: string; facebook?: string }) {
  const tiles = images.filter(Boolean).slice(0, 5);
  const social = instagram || facebook;

  return (
    <section className="bg-ivory">
      <div className="mx-auto max-w-6xl px-5 sm:px-6 py-16 sm:py-20">
        <div className="text-center max-w-xl mx-auto">
          <p className="sc-eyebrow text-blush-deep">১০ — কমিউনিটি</p>
          <h2 className="mt-3 font-sans font-bold text-ink text-[26px] sm:text-[32px] leading-tight">Dream Comfort Family</h2>
          <p className="mt-2 text-ink-muted text-[14.5px]">
            #DreamComfort — আপনার মুহূর্ত শেয়ার করুন, হাজারো মায়ের পরিবারের অংশ হোন।
          </p>
        </div>

        <div className="mt-10 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-3.5">
          {tiles.map((src, idx) => (
            <div
              key={idx}
              className="relative aspect-square rounded-3xl overflow-hidden ring-1 ring-ink/[0.06] bg-blush-mist"
            >
              <Image src={src} alt="Dream Comfort" fill sizes="(max-width:768px) 40vw, 200px" className="object-cover transition-transform duration-700 ease-soft-spring hover:scale-105" />
            </div>
          ))}

          {/* Join card */}
          <a
            href={social || "/products"}
            target={social ? "_blank" : undefined}
            rel={social ? "noopener" : undefined}
            className="group relative rounded-3xl bg-ink text-white p-5 flex flex-col justify-between aspect-square"
          >
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#F4ABBD" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.5" cy="6.5" r="1" fill="#F4ABBD" /></svg>
            <div>
              <p className="text-[14px] font-bold leading-tight">আমাদের পরিবারের সাথে যুক্ত হোন</p>
              <p className="mt-1 text-[12px] text-white/60 inline-flex items-center gap-1 group-hover:text-blush-light transition">
                ফলো করুন <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
              </p>
            </div>
          </a>
        </div>
      </div>
    </section>
  );
}
