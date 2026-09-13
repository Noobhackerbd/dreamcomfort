// BrandManifesto — beat 09. A deliberate change of pace: minimal type, large
// whitespace, no products. The brand's philosophy, stated plainly. Server
// component. Optional image slot (admin banner) for real mother/baby photography.

import Image from "next/image";

export function BrandManifesto({ storyImage }: { storyImage?: string }) {
  return (
    <section className="bg-beige-soft overflow-hidden">
      <div className="mx-auto max-w-4xl px-5 sm:px-6 py-20 sm:py-28 text-center">
        <p className="sc-eyebrow text-blush-deep">আমাদের বিশ্বাস</p>
        <h2 className="mt-6 font-sans font-bold text-ink text-[30px] sm:text-[44px] leading-[1.18]">
          একজন মায়ের আরাম
          <br /> কখনো ছোট বিষয় নয়।
        </h2>
        <p className="mt-7 text-ink-soft text-[16px] sm:text-[17px] leading-relaxed max-w-2xl mx-auto">
          আমরা বিশ্বাস করি — যখন একজন মা ভালো থাকেন, পুরো পরিবার ভালো থাকে। তাই আমরা
          প্রতিটি পণ্য বানাই একটাই প্রশ্ন মাথায় রেখে:{" "}
          <span className="sc-serif italic text-ink">“এটা কি সত্যিই একজন মায়ের জীবন একটু সহজ করবে?”</span>{" "}
          মানসম্পন্ন উপকরণ, সততা আর যত্ন — এই তিনটিই Dream Comfort-এর ভিত্তি।
        </p>

        {storyImage && (
          <div className="mt-12 relative mx-auto w-full max-w-2xl aspect-[16/10] rounded-[36px] overflow-hidden ring-1 ring-ink/[0.06] shadow-lux">
            <Image src={storyImage} alt="Dream Comfort" fill sizes="(max-width:768px) 90vw, 640px" className="object-cover" />
          </div>
        )}

        <p className="mt-10 sc-serif italic text-ink-muted text-lg">— Dream Comfort পরিবার</p>
      </div>
    </section>
  );
}
