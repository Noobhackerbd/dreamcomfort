// components/funnel/LandingScreen.tsx — the storefront funnel, driven by a landing
// config. Used by the homepage (/) and by extra landing pages (/landing2, …) — same
// design, only the featured products differ.
import Image from "next/image";
import { getServerSupabase } from "@/lib/supabase/server";
import { Product } from "@/lib/types";
import type { LandingConfig } from "@/lib/landing";
import { getShippingSettings } from "@/lib/settings";
import { STORE } from "@/lib/config";
import { taka } from "@/lib/format";
import { ProductFunnel } from "@/components/funnel/ProductFunnel";
import { Reveal } from "@/components/Reveal";
import { LandingBodyClass } from "@/components/funnel/LandingBodyClass";
import { StickyOrderButton } from "@/components/funnel/StickyOrderButton";
import { ProductShowcase } from "@/components/funnel/ProductShowcase";

async function getFeaturedProducts(slugs: string[], legacy: string): Promise<Product[]> {
  const supabase = getServerSupabase();
  const wanted = slugs.length ? slugs : legacy ? [legacy] : [];
  if (wanted.length) {
    const { data } = await supabase.from("products").select("*").in("slug", wanted).eq("is_active", true);
    const bySlug = new Map((data ?? []).map((p: any) => [p.slug, p as Product]));
    return wanted.map((s) => bySlug.get(s)).filter(Boolean) as Product[];
  }
  const { data } = await supabase.from("products").select("*").eq("is_active", true).order("created_at", { ascending: false }).limit(12);
  return (data as Product[]) ?? [];
}

function resolvePreselect(products: Product[], raw: string | string[] | undefined): string | undefined {
  const q = (Array.isArray(raw) ? raw[0] : raw)?.trim().toLowerCase();
  if (!q) return undefined;
  const norm = (s: string) => s.toLowerCase().replace(/[\s_]+/g, "-");
  const key = norm(q);
  let m = products.find((p) => p.slug.toLowerCase() === q || norm(p.slug) === key);
  if (!m) m = products.find((p) => norm(p.slug).includes(key));
  if (!m) m = products.find((p) => (p.name_bn ?? "").toLowerCase().includes(q) || (p.name_en ?? "").toLowerCase().includes(q));
  return m?.id;
}

const USE_REASONS = [
  { icon: "😣", title: "রাতে কোমরের অসহ্য ব্যথা", text: "ডাবল লেয়ার সাপোর্ট শরীরের শেপ অনুযায়ী বসে যায়, ফলে কোমরের ব্যথা ৮০% পর্যন্ত কমে আসে।" },
  { icon: "🦴", title: "মেরুদণ্ড ও পিঠের ব্যথা", text: "পুরো শরীরকে সমানভাবে সাপোর্ট দেয়, তাই মেরুদণ্ডে বাড়তি চাপ পড়ে না।" },
  { icon: "🤰", title: "সঠিক বেবি পজিশন", text: "মা ও গর্ভের শিশু — দু'জনের জন্যই স্বাস্থ্যকর ও সঠিক ঘুমের অবস্থান নিশ্চিত করে।" },
  { icon: "😴", title: "গভীর, নিরবচ্ছিন্ন ঘুম", text: "বারবার ঘুম না ভেঙে সারারাত আরামে ঘুমান — সকালে উঠবেন একদম ঝরঝরে মন নিয়ে।" },
];
const DOUBLE_LAYER = [
  { icon: "🧵", title: "ডাবল লেয়ার ডিজাইন", text: "দুটি আলাদা স্তরের প্রিমিয়াম কটন ফাইবার দিয়ে তৈরি।", benefit: "ভিতরের ফাইবার সহজে বসে যায় না, তাই পিলো দীর্ঘদিন তার আকৃতি ধরে রাখে।" },
  { icon: "🛡️", title: "ফাইবার লিকেজ ফ্রি", text: "উন্নত ডাবল-স্ক্রিন প্রোটেকশন প্রযুক্তি।", benefit: "বারবার ব্যবহারের পরেও ফাইবার বাইরে আসে না — মা ও শিশু উভয়ের জন্যই ১০০% নিরাপদ।" },
  { icon: "💪", title: "সম্পূর্ণ শরীর সাপোর্ট", text: "পিঠ, কোমর, ঘাড় ও পায়ের জন্য সমন্বিত সাপোর্ট।", benefit: "একটি পিলোই আপনার পুরো শরীরের চাপ কমিয়ে দিনভরের ক্লান্তি দূর করে।" },
  { icon: "🌬️", title: "হালকা ও শ্বাসপ্রশ্বাসযোগ্য", text: "১০০% কটন ফ্যাব্রিক, যার ভেতর দিয়ে বাতাস অবাধে চলাচল করে।", benefit: "দীর্ঘক্ষণ ব্যবহারেও ঘাম হয় না বা গরম অনুভব হয় না।" },
  { icon: "🔄", title: "মাল্টিফাংশনাল ব্যবহার", text: "প্রেগনেন্সি, নার্সিং এবং ব্যাক সাপোর্ট — সব ক্ষেত্রেই ব্যবহারযোগ্য।", benefit: "একবার কিনলেই গর্ভাবস্থার পরেও দৈনন্দিন জীবনে বছরের পর বছর কাজে লাগবে।" },
];
const WHY_US = [
  { icon: "💵", title: "ক্যাশ অন ডেলিভারি", text: "প্রোডাক্ট হাতে পেয়ে, নিজে চোখে দেখে-চেক করে তারপর টাকা দিন। কোনো অগ্রিম পেমেন্ট লাগবে না।" },
  { icon: "🛡️", title: "৩ দিনের মানিব্যাক গ্যারান্টি", text: "ব্যবহারের পর সন্তুষ্ট না হলে ৩ দিনের মধ্যে সম্পূর্ণ টাকা ফেরত পাবেন — ঝুঁকি সম্পূর্ণ আমাদের।" },
  { icon: "↩️", title: "ফ্রি রিটার্ন", text: "রিটার্নের জন্য কোনো ডেলিভারি চার্জ নেই — সমস্ত খরচ আমরাই বহন করি।" },
  { icon: "🚚", title: "দ্রুত গতির হোম ডেলিভারি", text: "ঢাকায় ১-২ দিন, সারা বাংলাদেশে যেকোনো জায়গায় ২-৩ দিনের মধ্যেই হাতে পাবেন।" },
];

export async function LandingScreen({
  config: landing,
  searchParams,
}: {
  config: LandingConfig;
  searchParams?: { [key: string]: string | string[] | undefined };
}) {
  const [products, shipping] = await Promise.all([
    getFeaturedProducts(landing.productSlugs ?? [], landing.productSlug),
    getShippingSettings(),
  ]);

  const initialProductId = resolvePreselect(products, searchParams?.color ?? searchParams?.product ?? searchParams?.slug);

  const Logo = (
    <div className="flex flex-col items-center pt-8 pb-2">
      <Image src={landing.logoUrl || "/logo.png"} alt={STORE.name} width={663} height={252} priority sizes="(max-width: 768px) 320px, 420px" className="h-40 md:h-52 w-auto object-contain drop-shadow-sm" />
    </div>
  );

  if (products.length === 0) {
    return (
      <>
        <LandingBodyClass />
        {Logo}
        <div className="text-center py-16">
          <h1 className="font-display text-2xl font-bold">{landing.headline}</h1>
          <p className="mt-3 text-gray-500 max-w-md mx-auto">ল্যান্ডিং পেজ দেখাতে অ্যাডমিন প্যানেলে পণ্য যোগ করুন ও ল্যান্ডিং সেটিংসে সেগুলো নির্বাচন করুন।</p>
          <a href="/admin" className="mt-6 inline-block rounded-2xl bg-brand text-white px-6 py-3">অ্যাডমিন প্যানেল</a>
        </div>
      </>
    );
  }

  const minPrice = Math.min(...products.map((p) => Number(p.price)));

  return (
    <div className="-mt-8 relative">
      <LandingBodyClass />

      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden -z-10">
        <div className="dc-blob absolute -top-10 -left-10 h-72 w-72 rounded-full bg-brand-light/40" />
        <div className="dc-blob absolute top-40 -right-10 h-80 w-80 rounded-full bg-accent-light/40" style={{ animationDelay: "3s" }} />
      </div>

      <div className="relative z-10">{Logo}</div>

      <div className="relative z-10 overflow-hidden rounded-full mx-auto max-w-3xl bg-gradient-to-r from-brand to-accent text-white text-sm shadow-soft">
        <div className="flex whitespace-nowrap py-2 dc-marquee">
          {Array.from({ length: 2 }).map((_, k) => (
            <span key={k} className="flex shrink-0">
              {landing.badges.map((b, i) => (
                <span key={i} className="mx-6 inline-flex items-center gap-1">✓ {b}</span>
              ))}
            </span>
          ))}
        </div>
      </div>

      <div className="relative z-10 mx-auto max-w-6xl px-1">
        <ProductFunnel
          products={products}
          initialProductId={initialProductId}
          shipping={{ inside: shipping.insideDhaka, outside: shipping.outsideDhaka }}
          headline={landing.headline}
          subheadline={landing.subheadline}
          urgencyText={landing.urgencyText}
          statText={landing.statText}
          badges={landing.badges}
          ctaText={landing.ctaText}
        />

        <section className="py-10">
          <Reveal>
            <h2 className="font-display text-2xl md:text-3xl font-bold text-center mb-8">প্রেগনেন্সি পিলো <span className="dc-gradient-text">কেন ব্যবহার করবেন?</span></h2>
          </Reveal>
          <div className="grid gap-4 sm:grid-cols-2">
            {USE_REASONS.map((r, i) => (
              <Reveal key={i} delay={i * 80}>
                <div className="flex gap-4 rounded-2xl bg-white p-5 h-full shadow-sm ring-1 ring-black/5 hover:shadow-md transition">
                  <div className="shrink-0 h-11 w-11 rounded-xl bg-brand-soft flex items-center justify-center text-xl">{r.icon}</div>
                  <div>
                    <h3 className="font-display font-bold text-gray-900">{r.title}</h3>
                    <p className="mt-1 text-sm text-gray-600 leading-relaxed">{r.text}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </section>

        <section className="py-10">
          <Reveal>
            <h2 className="font-display text-2xl md:text-3xl font-bold text-center mb-8">ডাবল লেয়ার প্রেগনেন্সি পিলোর <span className="dc-gradient-text">সুবিধা</span></h2>
          </Reveal>
          <div className="grid gap-4 md:grid-cols-2">
            {DOUBLE_LAYER.map((d, i) => (
              <Reveal key={i} delay={i * 70}>
                <div className="rounded-2xl bg-white p-5 h-full shadow-sm ring-1 ring-black/5 hover:shadow-md transition">
                  <div className="flex items-center gap-3">
                    <span className="h-10 w-10 rounded-xl bg-brand-soft flex items-center justify-center text-lg">{d.icon}</span>
                    <h3 className="font-display font-bold">{d.title}</h3>
                  </div>
                  <p className="mt-3 text-sm text-gray-600">{d.text}</p>
                  <p className="mt-2 text-sm text-green-700 bg-green-50 rounded-xl px-3 py-2"><b>সুবিধা:</b> {d.benefit}</p>
                </div>
              </Reveal>
            ))}
          </div>
          <div className="mt-8 text-center">
            <a href="#order-form" className="inline-block rounded-xl bg-accent-dark text-white px-8 py-3.5 font-semibold hover:bg-accent transition">এখনই অর্ডার করুন →</a>
          </div>
        </section>

        <ProductShowcase products={products} />

        <section className="py-10">
          <Reveal>
            <h2 className="font-display text-2xl md:text-3xl font-bold text-center mb-8">প্রেগনেন্সি পিলো <span className="dc-gradient-text">কেন আমাদের কাছ থেকে নেবেন?</span></h2>
          </Reveal>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {WHY_US.map((w, i) => (
              <Reveal key={i} delay={i * 80}>
                <div className="rounded-2xl bg-white p-5 h-full text-center shadow-sm ring-1 ring-black/5 hover:shadow-md transition-all">
                  <div className="mx-auto h-12 w-12 rounded-xl bg-brand-soft flex items-center justify-center text-xl">{w.icon}</div>
                  <h3 className="mt-3 font-display font-bold">{w.title}</h3>
                  <p className="mt-1 text-sm text-gray-600 leading-relaxed">{w.text}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </section>

        {landing.reviews.length > 0 && (
          <section className="py-10">
            <Reveal>
              <h2 className="font-display text-2xl md:text-3xl font-bold text-center mb-8">গ্রাহকদের অভিজ্ঞতা</h2>
            </Reveal>
            <div className="grid gap-4 md:grid-cols-3">
              {landing.reviews.map((r, i) => (
                <Reveal key={i} delay={i * 90}>
                  <div className="rounded-[1.5rem] bg-white p-5 h-full shadow-sm ring-1 ring-accent/10">
                    <div className="flex items-center gap-3">
                      {r.image ? (
                        <Image src={r.image} alt={r.name} width={44} height={44} sizes="44px" className="h-11 w-11 rounded-full object-cover" />
                      ) : (
                        <span className="h-11 w-11 rounded-full bg-gradient-to-br from-brand-light to-accent-light text-white flex items-center justify-center font-bold">{r.name.charAt(0)}</span>
                      )}
                      <div>
                        <p className="font-semibold text-sm">{r.name}</p>
                        <p className="text-amber-400 text-sm">{"★".repeat(r.stars)}{"☆".repeat(5 - r.stars)}</p>
                      </div>
                    </div>
                    <p className="mt-3 text-gray-700 text-sm">{r.text}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </section>
        )}

        <section className="py-10">
          <Reveal>
            <div className="rounded-3xl bg-gradient-to-br from-brand to-accent text-white p-8 md:p-10 text-center shadow-soft">
              <div className="text-4xl">🛡️</div>
              <h2 className="mt-3 font-display text-2xl md:text-3xl font-bold">{landing.guaranteeTitle}</h2>
              <p className="mt-2 text-white/90 max-w-xl mx-auto">{landing.guaranteeText}</p>
              <a href="#order-form" className="mt-6 inline-block rounded-2xl bg-white text-accent-dark px-8 py-3 font-bold hover:scale-105 transition">{landing.ctaText} →</a>
            </div>
          </Reveal>
        </section>
      </div>

      <StickyOrderButton label={`${landing.ctaText} · ${taka(minPrice)}`} />
      <div className="lg:hidden h-24" />
    </div>
  );
}
