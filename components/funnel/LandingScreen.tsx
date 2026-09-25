// components/funnel/LandingScreen.tsx — the storefront funnel, driven by a landing
// config. Used by the homepage (/) and by extra landing pages (/landing2, …) — same
// design, only the featured products differ.
//
// NOTE: the order engine (ProductFunnel → OrderForm) is untouched; only the surrounding
// content sections carry the bolder, more premium restyle.
import Image from "next/image";
import { getServerSupabase } from "@/lib/supabase/server";
import { Product } from "@/lib/types";
import type { LandingConfig } from "@/lib/landing";
import { getShippingSettings } from "@/lib/settings";
import { STORE } from "@/lib/config";
import { ProductFunnel } from "@/components/funnel/ProductFunnel";
import { Reveal } from "@/components/Reveal";
import { LandingBodyClass } from "@/components/funnel/LandingBodyClass";
import { TestimonialsSection } from "@/components/funnel/TestimonialsSection";
import { toSlug } from "@/lib/slug";

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

/**
 * Look up a single product by the ?color= value (matches its slug, then its SKU) so a deep
 * link can show a product even if it isn't in THIS landing's featured list — the link then
 * "just works" on any landing (homepage, /landing2, new variants).
 */
async function fetchProductByColor(raw: string | string[] | undefined): Promise<Product | null> {
  const v = (Array.isArray(raw) ? raw[0] : raw)?.trim();
  if (!v) return null;
  const supabase = getServerSupabase();
  let res = await supabase.from("products").select("*").eq("slug", v).eq("is_active", true).limit(1);
  if (!res.data?.length) res = await supabase.from("products").select("*").eq("sku", v).eq("is_active", true).limit(1);
  return (res.data?.[0] as Product) ?? null;
}

function resolvePreselect(products: Product[], raw: string | string[] | undefined): string | undefined {
  const rawStr = (Array.isArray(raw) ? raw[0] : raw)?.trim();
  if (!rawStr) return undefined;
  const q = rawStr.toLowerCase();
  const key = toSlug(rawStr);
  let m = key ? products.find((p) => toSlug(p.slug) === key) : undefined;
  if (!m) m = products.find((p) => p.slug.toLowerCase() === q);
  if (!m && key) m = products.find((p) => { const s = toSlug(p.slug); return s && (s.includes(key) || key.includes(s)); });
  if (!m) m = products.find((p) => (p.name_bn ?? "").toLowerCase().includes(q) || (p.name_en ?? "").toLowerCase().includes(q));
  return m?.id;
}

// Premium line icons (stroke) replace the old emojis for a bolder, more premium feel.
const USE_REASONS = [
  { img: "/reason-1-backpain.png", bg: "bg-rose-50", tc: "text-rose-600", title: "রাতে কোমরের অসহ্য ব্যথা?", text: "শরীরের শেপ অনুযায়ী বসে যাওয়া ডাবল লেয়ার সাপোর্ট কোমরের ব্যথা ৮০% পর্যন্ত কমিয়ে দেয় — নির্ভার ঘুমের নিশ্চয়তা।" },
  { img: "/reason-2-spine.png", bg: "bg-sky-50", tc: "text-sky-700", title: "মেরুদণ্ড ও পিঠের চাপ", text: "পুরো শরীরে সমান সাপোর্ট দিয়ে মেরুদণ্ডের বাড়তি চাপ সরিয়ে দেয় — সকালে উঠবেন ব্যথাহীন, ঝরঝরে।" },
  { img: "/reason-3-position.png", bg: "bg-emerald-50", tc: "text-emerald-700", title: "নিরাপদ ঘুমের পজিশন", text: "ডাক্তারের পরামর্শমতো বাম কাতে ঘুমানো সহজ করে — মা ও গর্ভের শিশু দু'জনের জন্যই স্বাস্থ্যকর।" },
  { img: "/reason-4-sleep.png", bg: "bg-violet-50", tc: "text-violet-700", title: "সারারাত নিরবচ্ছিন্ন ঘুম", text: "বারবার এপাশ-ওপাশ না করে সারারাত এক টানা আরামের ঘুম — প্রতিদিন সকাল শুরু হবে সতেজ মন নিয়ে।" },
  { img: "/reason-5-support.png", bg: "bg-rose-50", tc: "text-rose-500", title: "পুরো প্রেগনেন্সি জুড়ে সঙ্গী", text: "গর্ভাবস্থার শুরু থেকে ডেলিভারির আগ পর্যন্ত — প্রতিটি মুহূর্তে মা ও শিশুর নিরাপদ আরাম।" },
];
const DOUBLE_LAYER = [
  { d: "M12 2l9 5-9 5-9-5 9-5zM3 12l9 5 9-5M3 17l9 5 9-5", title: "প্রিমিয়াম ডাবল লেয়ার", text: "দুই স্তরের প্রিমিয়াম কটন ফাইবার — বাইরে নরম, ভেতরে মজবুত সাপোর্ট।", benefit: "মাসের পর মাস ব্যবহারেও চুপসে যায় না, প্রথম দিনের মতোই ফুলকো থাকে।" },
  { d: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10zM9 12l2 2 4-4", title: "ফাইবার লিকেজ ফ্রি", text: "উন্নত ডাবল-স্ক্রিন প্রোটেকশন — ধোয়ার পরেও ফাইবার বের হয় না।", benefit: "মা ও নবজাতকের জন্য ১০০% নিরাপদ, কোনো ক্ষতিকর কিছু নেই।" },
  { d: "M12 2a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM8 22l1.5-9M16 22l-1.5-9M7 13h10l-1.5-4h-7z", title: "মাথা থেকে পা — সব সাপোর্ট", text: "একটি পিলোতেই পিঠ, কোমর, ঘাড় ও পা — আলাদা বালিশের ঝামেলা নেই।", benefit: "সারা শরীরের চাপ সমানভাবে কমিয়ে দিনভরের ক্লান্তি দূর করে।" },
  { d: "M3 8h11a3 3 0 1 0-3-3M3 12h15a3 3 0 1 1-3 3M3 16h9a3 3 0 1 1-3 3", title: "হালকা ও শ্বাসপ্রশ্বাসযোগ্য", text: "১০০% কটন ফ্যাব্রিক, ভেতর দিয়ে বাতাস অবাধে চলাচল করে।", benefit: "গরমে ঘেমে যাওয়ার ভয় নেই — সারারাত ঠান্ডা, আরামদায়ক।" },
  { d: "M3 12a9 9 0 1 0 3-6.7L3 8M3 3v5h5", title: "একবার কিনলেই বছরজুড়ে", text: "প্রেগনেন্সিতে সাপোর্ট, ডেলিভারির পরে বাচ্চাকে দুধ খাওয়ানো ও ব্যাক রেস্ট।", benefit: "একটি কেনাতেই বছরের পর বছর কাজে লাগবে — টাকা পুরোপুরি উসুল।" },
];
const WHY_US = [
  { d: "M2 7h20v10H2zM2 11h20M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z", title: "ক্যাশ অন ডেলিভারি", text: "পণ্য হাতে পেয়ে, খুলে দেখে-চেক করে সন্তুষ্ট হলে তবেই টাকা দিন — এক টাকাও অগ্রিম নয়।" },
  { d: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10zM9 12l2 2 4-4", title: "৩ দিনের মানিব্যাক গ্যারান্টি", text: "৩ দিন ব্যবহার করে ভালো না লাগলে ১০০% টাকা ফেরত — পুরো ঝুঁকি আমাদের, আপনার নয়।" },
  { d: "M3 12a9 9 0 1 1 3 6.7L3 16M3 21v-5h5", title: "সম্পূর্ণ ফ্রি রিটার্ন", text: "পছন্দ না হলে রিটার্ন একদম ফ্রি — ডেলিভারি চার্জও আমরাই বহন করি।" },
  { d: "M1 3h15v13H1zM16 8h4l3 3v5h-7M5.5 18.5a2.5 2.5 0 105 0M18.5 18.5a2.5 2.5 0 105 0", title: "দ্রুত হোম ডেলিভারি", text: "অর্ডার কনফার্মের পর ঢাকায় ১–২ দিন, সারা দেশে ২–৩ দিনেই দরজায় পৌঁছে যাবে।" },
];

// Soft pastel circular icon badge — matches the premium pink/pastel look of the hero.
const PASTELS = [
  { bg: "#FDEDF3", fg: "#E0699A" }, // accent pink
  { bg: "#E7F4FC", fg: "#3E9BD1" }, // brand blue
  { bg: "#FDEDF3", fg: "#E0699A" }, // accent pink
  { bg: "#E7F4FC", fg: "#3E9BD1" }, // brand blue
  { bg: "#FDEDF3", fg: "#E0699A" }, // accent pink
];
function IconBadge({ d, i = 0, size = "md" }: { d: string; i?: number; size?: "md" | "lg" }) {
  const box = size === "lg" ? "h-14 w-14" : "h-12 w-12";
  const ic = size === "lg" ? "h-7 w-7" : "h-6 w-6";
  const c = PASTELS[i % PASTELS.length];
  return (
    <span className={`shrink-0 ${box} rounded-full grid place-items-center`} style={{ background: c.bg, color: c.fg }}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={ic}><path d={d} /></svg>
    </span>
  );
}

function SectionTitle({ kicker, children }: { kicker?: string; children: React.ReactNode }) {
  return (
    <div className="text-center mb-6">
      {kicker && <p className="text-[12px] font-bold tracking-[0.18em] uppercase text-accent-dark/80 mb-2">{kicker}</p>}
      <h2 className="font-display text-3xl md:text-[2.6rem] leading-tight font-extrabold text-gray-900">{children}</h2>
      <span className="mt-4 inline-block h-1 w-16 rounded-full bg-gradient-to-r from-brand to-accent" />
    </div>
  );
}

const HERO_BADGES = [
  { label: "সঠিক ঘুমের\nপজিশন", img: "/hero-badge-bed.png", icon: null },
  { label: "পিঠ-কোমরের\nব্যথা কমায়", img: "/hero-badge-pain.png", icon: null },
  { label: "সঠিক\nসাপোর্ট", img: "/hero-badge-support.png", icon: null },
  { label: "মা ও শিশুর\nনিরাপত্তা", img: "/hero-badge-heart.png", icon: null },
];

const TRUST_BAR = [
  { big: "TOP 1%", small: "বিশ্বস্ত ই-কমার্স স্টোর", icon: (<><path d="M12 2 4 5v6c0 5 3.4 8.5 8 10 4.6-1.5 8-5 8-10V5z" /><path fill="#fff" d="m10.9 14.7-2.4-2.4 1.2-1.2 1.2 1.2 3.2-3.2 1.2 1.2z" /></>) },
  { big: "৫০,০০০+", small: "সন্তুষ্ট মা", icon: (<><circle cx="9" cy="8" r="3.2" /><circle cx="16.6" cy="9" r="2.6" /><path d="M3.4 19.4c0-3.1 2.6-5.4 5.6-5.4s5.6 2.3 5.6 5.4v.2H3.4z" /><path d="M15.4 14.2c2.4.2 4.3 2.1 4.3 4.9v.2h-3z" /></>) },
  { big: "৪.৯/৫", small: "গড় রেটিং", icon: (<path d="m12 2.5 2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.8 6.1 20.5l1.2-6.5L2.5 9.4l6.6-.9z" />) },
  { big: "সারা দেশে ফ্রি ডেলিভারি", small: "(নির্দিষ্ট শর্ত প্রযোজ্য)", icon: (<><path d="M2 4.5A1 1 0 0 1 3 3.5h10a1 1 0 0 1 1 1v9H2z" /><path d="M14 7.5h3.5a1 1 0 0 1 .8.4l2.4 3.2a1 1 0 0 1 .3.6V13a1 1 0 0 1-1 1h-6z" /><circle cx="6" cy="17" r="1.7" /><circle cx="16.5" cy="17" r="1.7" /></>) },
];

const FEATURE_STRIP = [
  { bg: "#E8F2FC", fg: "#5CA99A", filled: false, l1: "সফট ও প্রিমিয়াম", l2: "কটন ফ্যাব্রিক", img: "/feat-cotton.png", icon: null },
  { bg: "#EAF6E4", fg: "#7BB86A", filled: false, l1: "শ্বাস-প্রশ্বাসযোগ্য", l2: "এবং হাইপোঅ্যালার্জেনিক", img: null, icon: (<><path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.5 19 2c1 2 2 4.2 2 8 0 5.5-4.8 10-10 10Z" /><path d="M2 21c0-3 1.9-5.4 5.1-6" /></>) },
  { bg: "#E8F2FC", fg: "#9A8BD0", filled: false, l1: "সহজে ধোয়া যায়", l2: "(ওয়াশেবল কাভার)", img: "/feat-wash.png", icon: null },
  { bg: "#FBE0EC", fg: "#E5479A", filled: true, l1: "টেকসই ও", l2: "দীর্ঘস্থায়ী", img: null, icon: (<><path d="M12 2 4 5v6c0 5 3.4 8.5 8 10 4.6-1.5 8-5 8-10V5z" /><path fill="#fff" d="m10.9 14.7-2.4-2.4 1.2-1.2 1.2 1.2 3.2-3.2 1.2 1.2z" /></>) },
];

const FAQS = [
  { q: "এই পিলো সেট কি সব সাইজের জন্য উপযোগী?", a: "হ্যাঁ, অ্যাডজাস্টেবল ডিজাইনের কারণে গর্ভাবস্থার শুরু থেকে শেষ পর্যন্ত সব মায়ের জন্যই এটি আরামদায়ক।" },
  { q: "কিভাবে পরিষ্কার করবো?", a: "কভারটি জিপার দিয়ে খুলে হাতে বা মেশিনে সহজেই ধুয়ে নিতে পারবেন। ভেতরের ফাইবার শুকনো রাখুন।" },
  { q: "ডেলিভারি কত দিনের মধ্যে হয়?", a: "ঢাকায় ১–২ দিন এবং সারা বাংলাদেশে ২–৩ দিনের মধ্যে হোম ডেলিভারি পৌঁছে যায়।" },
  { q: "কোন পেমেন্ট অপশন আছে?", a: "ক্যাশ অন ডেলিভারি — পণ্য হাতে পেয়ে দেখে-চেক করে তারপর টাকা দিবেন, কোনো অগ্রিম পেমেন্ট লাগবে না।" },
];

const HOW_HELPS = [
  { img: "/help-sleep.png", title: "গভীর আরামের ঘুম", text: "রাতে বারবার ঘুম না ভেঙে সারারাত এক টানা আরামের ঘুম — সকালে উঠবেন সতেজ।" },
  { img: "/help-pain.png", title: "ব্যথা থেকে মুক্তি", text: "পিঠ, কোমর ও ঘাড়ের ব্যথা কমিয়ে শরীর রাখে হালকা ও স্বস্তিতে।" },
  { img: "/help-safety.png", title: "মা ও বেবির সুরক্ষা", text: "সঠিক পাশের ভঙ্গিতে বিশ্রাম — মা ও গর্ভের শিশু দু'জনেই সুস্থ ও নিরাপদ।" },
];

const WHY_DC = [
  "সারারাত নিরবচ্ছিন্ন, গভীর আরামের ঘুম",
  "পিঠ, কোমর ও ঘাড়ের ব্যথা থেকে স্বস্তি",
  "সঠিক পাশের ভঙ্গিতে মা ও শিশুর সুস্থ রক্ত সঞ্চালন",
  "প্রেগনেন্সি থেকে বেবি ফিডিং — বহুমুখী ব্যবহার",
  "১০০% নরম প্রিমিয়াম কটন — ত্বক-বান্ধব ও আরামদায়ক",
  "কেমিক্যাল-মুক্ত, মা ও নবজাতকের জন্য নিরাপদ",
];

export async function LandingScreen({
  config: landing,
  searchParams,
}: {
  config: LandingConfig;
  searchParams?: { [key: string]: string | string[] | undefined };
}) {
  const [featured, shipping] = await Promise.all([
    getFeaturedProducts(landing.productSlugs ?? [], landing.productSlug),
    getShippingSettings(),
  ]);

  let products = featured;
  const colorRaw = searchParams?.color ?? searchParams?.product ?? searchParams?.slug;
  if (colorRaw && !resolvePreselect(products, colorRaw)) {
    const extra = await fetchProductByColor(colorRaw);
    if (extra) products = [extra, ...products.filter((p) => p.id !== extra.id)];
  }

  const initialProductId = resolvePreselect(products, colorRaw);

  const Hero = (
    <section className="relative z-10 mx-auto max-w-6xl px-0 pt-2 sm:px-3 sm:pt-4">
      {/* DESKTOP — exact mockup image */}
      <a href="#order-form" aria-label="এখনই অর্ডার করুন" className="hidden md:block overflow-hidden rounded-[1.4rem] shadow-soft ring-1 ring-black/5">
        <Image src="/hero-full.jpg" alt="ড্রিম কমফোর্ট — প্রিমিয়াম ডাবল লেয়ার প্রেগনেন্সি পিলো সেট" width={2000} height={760} priority sizes="(min-width: 768px) 1152px, 1px" className="w-full h-auto" />
      </a>

      {/* MOBILE — same content, re-laid for readability */}
      <div className="md:hidden overflow-hidden rounded-b-[1.6rem] bg-gradient-to-br from-accent-light/70 via-accent-light/50 to-brand-light/50 px-5 pt-6 pb-6 shadow-sm sm:rounded-[1.4rem] sm:ring-1 sm:ring-black/5">
        <span className="inline-flex items-center gap-2 rounded-full bg-accent/20 px-3.5 py-1.5 text-[12px] font-bold text-accent-dark">
          <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-accent" aria-hidden><path d="M12 21s-6.7-4.4-9.3-8.2C.9 10 1.6 6.5 4.4 5.3c1.9-.8 3.9-.2 5.2 1.3L12 9l2.4-2.4c1.3-1.5 3.3-2.1 5.2-1.3 2.8 1.2 3.5 4.7 1.7 7.5C18.7 16.6 12 21 12 21z"/></svg>
          মায়েদের জন্য বিশেষভাবে ডিজাইন করা
        </span>
        <h1 className="mt-3.5 font-display font-extrabold leading-[1.14]">
          <span className="block text-brand text-[2rem]">ড্রিম কমফোর্ট</span>
          <span className="mt-1.5 block text-lg leading-snug text-accent-dark">প্রিমিয়াম ডাবল লেয়ার প্রেগনেন্সি পিলো সেট</span>
        </h1>
        <p className="mt-2.5 text-[15px] text-gray-600">আরামদায়ক ঘুম, সুস্থ মা ও সুস্থ শিশুর জন্য</p>

        <div className="mt-4 overflow-hidden rounded-[1.1rem] shadow-md">
          <Image src="/hero-pillow.jpg" alt="ড্রিম কমফোর্ট প্রেগনেন্সি পিলো" width={1000} height={760} priority sizes="(min-width: 768px) 1px, 100vw" className="h-auto w-full" />
        </div>

        <div className="mt-5 grid grid-cols-4 gap-2">
          {HERO_BADGES.map((b, i) => (
            <div key={i} className="flex flex-col items-center gap-1.5 text-center">
              {b.img ? (
                <Image src={b.img} alt={b.label.replace("\n", " ")} width={144} height={144} sizes="48px" className="h-12 w-12 object-contain" />
              ) : (
                <span className="grid h-12 w-12 place-items-center rounded-full bg-brand-light/85 text-brand shadow-sm">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6" aria-hidden>{b.icon}</svg>
                </span>
              )}
              <span className="whitespace-pre-line text-[10.5px] font-semibold leading-tight text-gray-700">{b.label}</span>
            </div>
          ))}
        </div>

        <div className="mt-5 flex flex-col gap-2.5">
          <a href="#order-form" className="flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-accent to-accent-dark px-6 py-3.5 text-base font-bold text-white shadow-lg">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5" aria-hidden><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.7 13.4a2 2 0 0 0 2 1.6h9.7a2 2 0 0 0 2-1.6L23 6H6"/></svg>
            এখনই অর্ডার করুন <span aria-hidden>→</span>
          </a>
          <a href="#details" className="flex items-center justify-center gap-2 rounded-full bg-white/90 px-6 py-3 text-[15px] font-semibold text-brand ring-1 ring-brand/25">
            বিস্তারিত দেখুন
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" className="h-[18px] w-[18px]" aria-hidden><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/></svg>
          </a>
        </div>
      </div>
    </section>
  );

  if (products.length === 0) {
    return (
      <>
        <LandingBodyClass />
        <div className="text-center py-16">
          <h1 className="font-display text-2xl font-bold">{landing.headline}</h1>
          <p className="mt-3 text-gray-500 max-w-md mx-auto">ল্যান্ডিং পেজ দেখাতে অ্যাডমিন প্যানেলে পণ্য যোগ করুন ও ল্যান্ডিং সেটিংসে সেগুলো নির্বাচন করুন।</p>
          <a href="/admin" className="mt-6 inline-block rounded-2xl bg-brand text-white px-6 py-3">অ্যাডমিন প্যানেল</a>
        </div>
      </>
    );
  }

  return (
    <div className="-mt-6 relative overflow-x-clip">
      <LandingBodyClass />

      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden -z-10">
        <div className="dc-blob absolute -top-10 -left-10 h-72 w-72 rounded-full bg-brand-light/40" />
        <div className="dc-blob absolute top-40 -right-10 h-80 w-80 rounded-full bg-accent-light/40" style={{ animationDelay: "3s" }} />
        <div className="dc-blob absolute top-[130vh] -left-16 h-80 w-80 rounded-full bg-accent-light/30" style={{ animationDelay: "1.5s" }} />
      </div>

      {Hero}

      <div className="relative z-10 mx-auto max-w-6xl px-2 sm:px-3">
        {/* Trust bar */}
        <Reveal>
          <div className="mt-4 grid grid-cols-4 rounded-[1.5rem] bg-[#FCE9F1] px-1 py-2 sm:px-3 shadow-sm ring-1 ring-pink-100">
            {TRUST_BAR.map((t, i) => (
              <div key={i} className="flex flex-col items-center justify-center gap-1.5 border-l border-white/80 px-1.5 py-2.5 text-center first:border-l-0 sm:flex-row sm:px-3 sm:py-3 sm:text-left">
                <svg viewBox="0 0 24 24" fill="currentColor" className="h-6 w-6 shrink-0 text-pink-500 sm:h-7 sm:w-7" aria-hidden>{t.icon}</svg>
                <div className="leading-tight">
                  <p className="text-[11px] font-bold leading-tight text-gray-800 sm:text-[15px]">{t.big}</p>
                  <p className="text-[9px] text-gray-500 sm:text-[12px]">{t.small}</p>
                </div>
              </div>
            ))}
          </div>
        </Reveal>

        {/* Feature strip */}
        <Reveal delay={80}>
          <div className="mt-5 grid grid-cols-4 gap-x-1 gap-y-6 sm:gap-x-2">
            {FEATURE_STRIP.map((f, i) => (
              <div key={i} className="flex flex-col items-center gap-2 border-l border-black/[0.06] px-0.5 text-center first:border-l-0 sm:gap-3 sm:px-2">
                <span className="grid h-12 w-12 place-items-center rounded-full sm:h-16 sm:w-16" style={{ backgroundColor: f.bg }}>
                  {f.img ? (
                    <Image src={f.img} alt={f.l1} width={200} height={200} sizes="44px" className="h-8 w-8 object-contain sm:h-10 sm:w-10" />
                  ) : (
                    <svg viewBox="0 0 24 24" fill={f.filled ? "currentColor" : "none"} stroke={f.filled ? "none" : "currentColor"} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6 sm:h-7 sm:w-7" style={{ color: f.fg }} aria-hidden>{f.icon}</svg>
                  )}
                </span>
                <div className="leading-tight">
                  <p className="text-[11px] font-bold leading-tight text-gray-800 sm:text-[15px]">{f.l1}</p>
                  <p className="mt-0.5 text-[9px] leading-tight text-gray-500 sm:text-[13px]">{f.l2}</p>
                </div>
              </div>
            ))}
          </div>
        </Reveal>

        {/* WHY DREAM COMFORT — product + checklist */}
        <Reveal delay={120}>
          <section className="mt-6 grid items-center gap-6 rounded-[1.75rem] bg-gradient-to-br from-accent-light/40 to-cream p-4 shadow-sm ring-1 ring-black/5 sm:p-6 md:grid-cols-2">
            <div className="relative">
              <Image src="/dc-why.jpg" alt="ড্রিম কমফোর্ট প্রেগনেন্সি পিলো সেট" width={1024} height={1024} sizes="(max-width: 768px) 100vw, 50vw" className="w-full rounded-[1.4rem] object-cover shadow-md" />
              <div className="absolute right-3 top-3 grid h-16 w-16 place-items-center rounded-full bg-accent text-center text-white shadow-lg ring-2 ring-white/70 sm:h-20 sm:w-20">
                <div>
                  <svg viewBox="0 0 24 24" className="mx-auto h-4 w-4 fill-white sm:h-5 sm:w-5" aria-hidden><path d="M3 7l4 3 5-6 5 6 4-3-1.8 10.5a1 1 0 0 1-1 .8H5.8a1 1 0 0 1-1-.8L3 7z" /></svg>
                  <span className="mt-0.5 block text-[7px] font-extrabold leading-tight tracking-wide sm:text-[8px]">PREMIUM<br />QUALITY</span>
                </div>
              </div>
            </div>
            <div>
              <span className="inline-flex items-center gap-2 rounded-full bg-accent/15 px-4 py-1.5 text-[13px] font-bold text-accent-dark">ড্রিম কমফোর্ট প্রিমিয়াম পণ্য</span>
              <h2 className="mt-3 font-display text-2xl font-extrabold leading-tight text-gray-900 sm:text-[1.9rem]">কেন ড্রিম কমফোর্ট <span className="text-accent-dark">প্রেগনেন্সি পিলো সেট?</span></h2>
              <ul className="mt-5 space-y-3">
                {WHY_DC.map((t, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <svg viewBox="0 0 24 24" className="mt-0.5 h-5 w-5 shrink-0 fill-accent" aria-hidden><path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm-1.2 14.2-4-4 1.4-1.4 2.6 2.6 5.6-5.6 1.4 1.4z" /></svg>
                    <span className="text-[15px] text-gray-700">{t}</span>
                  </li>
                ))}
              </ul>
              <a href="#order-form" className="mt-6 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-accent to-accent-dark px-8 py-3.5 text-base font-bold text-white shadow-lg transition hover:scale-[1.03]">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5" aria-hidden><circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" /><path d="M1 1h4l2.7 13.4a2 2 0 0 0 2 1.6h9.7a2 2 0 0 0 2-1.6L23 6H6" /></svg>
                এখনই অর্ডার করুন <span aria-hidden>→</span>
              </a>
            </div>
          </section>
        </Reveal>

        {/* HOW IT HELPS — 3 up, same SVG icon style */}
        <section className="mt-6 py-2">
          <div className="mb-8 flex items-center justify-center gap-4">
            <span className="h-px w-8 bg-gradient-to-r from-transparent to-accent/60 sm:w-12" />
            <h2 className="font-display text-2xl font-extrabold text-gray-900 sm:text-[1.9rem]">কিভাবে <span className="text-accent-dark">সাহায্য করে?</span></h2>
            <span className="h-px w-8 bg-gradient-to-l from-transparent to-accent/60 sm:w-12" />
          </div>
          <div className="grid grid-cols-3 gap-1 sm:gap-4">
            {HOW_HELPS.map((h, i) => (
              <Reveal key={i} delay={i * 90}>
                <div className="flex h-full flex-col items-center border-l border-black/[0.06] px-1 text-center first:border-l-0 sm:px-4">
                  <div className="flex h-20 w-full items-center justify-center sm:h-32">
                    <Image src={h.img} alt={h.title} width={640} height={460} sizes="(max-width: 640px) 30vw, 220px" className="max-h-full w-auto object-contain" />
                  </div>
                  <h3 className="mt-2 font-display text-[13px] font-bold text-accent-dark sm:mt-3 sm:text-lg">{h.title}</h3>
                  <p className="mt-1 text-[10px] leading-snug text-gray-600 sm:mt-2 sm:text-[15px] sm:leading-relaxed">{h.text}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </section>

        <TestimonialsSection reviews={landing.reviews.map((r, idx) => ({ id: String(idx), name: r.name, rating: r.stars, body: r.text, images: r.image ? [r.image] : null }))} reviewsHref={products[0] ? `/product/${products[0].slug}#reviews` : "#order-form"} />
      </div>

      <div className="relative z-10 mx-auto max-w-6xl px-1">
        {/* PILLOW COLOURS heading */}
        <Reveal>
          <div className="pt-6">
            <SectionTitle kicker="আপনার পছন্দের রঙ বেছে নিন">প্রেগনেন্সি পিলো <span className="dc-gradient-text">কালার সমূহ</span></SectionTitle>
          </div>
        </Reveal>

        {/* ORDER ENGINE — untouched */}
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

        {/* WHY USE — commitment rows with illustration icons */}
        <section id="details" className="scroll-mt-20 py-8">
          <Reveal>
            <div className="mb-6 text-center">
              <div className="flex items-center justify-center gap-3">
                <span aria-hidden className="text-lg text-accent/50">❀</span>
                <h2 className="font-display text-2xl font-extrabold text-gray-900 md:text-[2rem]">আপনার ও আপনার শিশুর জন্য</h2>
                <span aria-hidden className="text-lg text-accent/50">❀</span>
              </div>
              <p className="mt-2 text-gray-500">বিশ্বস্ততা, আরাম এবং যত্নের প্রতিশ্রুতি</p>
            </div>
          </Reveal>
          <div className="mx-auto max-w-3xl space-y-3">
            {USE_REASONS.map((r, i) => (
              <Reveal key={i} delay={i * 70}>
                <div className={`flex items-center gap-4 rounded-[1.4rem] ${r.bg} p-3.5 ring-1 ring-black/5 transition hover:shadow-md sm:p-4`}>
                  <Image src={r.img} alt={r.title} width={200} height={168} sizes="72px" className="h-16 w-16 shrink-0 object-contain sm:h-[72px] sm:w-[72px]" />
                  <div className="min-w-0 flex-1">
                    <h3 className={`font-display text-base font-bold sm:text-lg ${r.tc}`}>{r.title}</h3>
                    <p className="mt-1 text-[13px] leading-relaxed text-gray-600 sm:text-[14px]">{r.text}</p>
                  </div>
                  <span className={`hidden h-8 w-8 shrink-0 place-items-center rounded-full bg-white/70 sm:grid ${r.tc}`} aria-hidden>
                    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6" /></svg>
                  </span>
                </div>
              </Reveal>
            ))}
          </div>
        </section>

        {/* DOUBLE LAYER — premium cards */}
        <section className="py-8">
          <Reveal><SectionTitle kicker="প্রিমিয়াম কোয়ালিটি">যে কারণে এটি <span className="dc-gradient-text">সবচেয়ে আরামদায়ক</span></SectionTitle></Reveal>
          <div className="grid gap-4 md:grid-cols-2">
            {DOUBLE_LAYER.map((d, i) => (
              <Reveal key={i} delay={i * 70}>
                <div className="rounded-[1.6rem] bg-white p-6 h-full shadow-sm ring-1 ring-black/5 hover:shadow-xl hover:-translate-y-0.5 transition-all">
                  <div className="flex items-center gap-4">
                    <IconBadge d={d.d} i={i} />
                    <h3 className="font-display text-lg font-bold">{d.title}</h3>
                  </div>
                  <p className="mt-4 text-[15px] text-gray-600 leading-relaxed">{d.text}</p>
                  <p className="mt-3 text-sm text-green-800 bg-green-50 rounded-xl px-3.5 py-2.5 leading-relaxed"><b>✓ সুবিধা:</b> {d.benefit}</p>
                </div>
              </Reveal>
            ))}
          </div>
          <div className="mt-6 text-center">
            <a href="#order-form" className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-accent to-accent-dark text-white px-9 py-4 text-lg font-bold shadow-[0_14px_30px_-8px_rgba(224,105,154,0.55)] hover:scale-[1.03] transition">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5" aria-hidden><circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" /><path d="M1 1h4l2.7 13.4a2 2 0 0 0 2 1.6h9.7a2 2 0 0 0 2-1.6L23 6H6" /></svg>
              এখনই অর্ডার করুন <span aria-hidden>→</span>
            </a>
          </div>
        </section>

        {/* WHY US — premium 4-up */}
        <section className="py-8">
          <Reveal><SectionTitle kicker="আপনার নিশ্চিন্ততা">কেন <span className="dc-gradient-text">আমাদের কাছ থেকে</span> নেবেন?</SectionTitle></Reveal>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {WHY_US.map((w, i) => (
              <Reveal key={i} delay={i * 80}>
                <div className="rounded-[1.6rem] bg-white p-6 h-full text-center shadow-sm ring-1 ring-black/5 hover:shadow-xl hover:-translate-y-0.5 transition-all">
                  <div className="mx-auto w-max"><IconBadge d={w.d} i={i} size="lg" /></div>
                  <h3 className="mt-4 font-display font-bold text-gray-900">{w.title}</h3>
                  <p className="mt-1.5 text-sm text-gray-600 leading-relaxed">{w.text}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </section>

        {/* GUARANTEE — bold gradient block */}
        <section className="py-8">
          <Reveal>
            <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-accent via-accent-dark to-brand-dark text-white p-9 md:p-12 text-center shadow-xl">
              <div aria-hidden className="pointer-events-none absolute -right-10 -top-10 h-48 w-48 rounded-full bg-white/10" />
              <div aria-hidden className="pointer-events-none absolute -left-10 -bottom-12 h-56 w-56 rounded-full bg-white/10" />
              <div className="relative">
                <span className="mx-auto mb-4 grid place-items-center h-16 w-16 rounded-2xl bg-white/15 backdrop-blur">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="h-8 w-8"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10zM9 12l2 2 4-4" /></svg>
                </span>
                <h2 className="font-display text-2xl md:text-[2.2rem] font-extrabold leading-tight">{landing.guaranteeTitle}</h2>
                <p className="mt-3 text-white/90 max-w-xl mx-auto text-[15px] leading-relaxed">{landing.guaranteeText}</p>
                <a href="#order-form" className="mt-5 inline-flex items-center gap-2 rounded-full bg-white text-accent-dark px-10 py-4 text-lg font-extrabold hover:scale-105 transition shadow-lg">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5" aria-hidden><circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" /><path d="M1 1h4l2.7 13.4a2 2 0 0 0 2 1.6h9.7a2 2 0 0 0 2-1.6L23 6H6" /></svg>
                  {landing.ctaText} <span aria-hidden>→</span>
                </a>
                <p className="mt-4 text-[13px] text-white/80">💵 ক্যাশ অন ডেলিভারি · কোনো অগ্রিম পেমেন্ট নেই</p>
              </div>
            </div>
          </Reveal>
        </section>

        {/* FAQ + SUPPORT */}
        <section className="py-8">
          <div className="grid gap-6 md:grid-cols-5">
            {/* FAQ accordion */}
            <div className="md:col-span-3">
              <h2 className="font-display text-2xl font-extrabold text-gray-900">প্রায়শই জিজ্ঞাসিত <span className="dc-gradient-text">প্রশ্ন</span></h2>
              <div className="mt-5 space-y-3">
                {FAQS.map((f, i) => (
                  <details key={i} className="group rounded-2xl bg-white shadow-sm ring-1 ring-black/5 open:ring-accent/30">
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-4 font-semibold text-gray-800 [&::-webkit-details-marker]:hidden">
                      <span>{f.q}</span>
                      <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full text-accent-dark transition-transform group-open:rotate-45">
                        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden><path d="M12 5v14M5 12h14" /></svg>
                      </span>
                    </summary>
                    <p className="px-5 pb-4 text-[14px] leading-relaxed text-gray-600">{f.a}</p>
                  </details>
                ))}
              </div>
            </div>

            {/* Support card */}
            <div className="md:col-span-2">
              <div className="h-full rounded-[1.5rem] bg-gradient-to-br from-accent-light/40 to-white p-6 text-center ring-1 ring-accent/15 sm:text-left">
                <div className="flex items-center justify-center gap-3 sm:justify-start">
                  <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-gradient-to-br from-accent to-accent-dark text-white shadow-sm">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6" aria-hidden><path d="M3 18v-6a9 9 0 0 1 18 0v6" /><path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z" /></svg>
                  </span>
                  <div>
                    <p className="font-display text-lg font-extrabold text-accent-dark">কোনো প্রশ্ন?</p>
                    <p className="text-sm text-gray-600">আমরা আছি আপনার পাশে!</p>
                  </div>
                </div>
                <p className="mt-5 font-bold text-gray-800">কাস্টমার সাপোর্ট</p>
                <a href={`tel:${STORE.phone}`} className="mt-1 inline-flex items-center gap-2 font-semibold text-accent-dark hover:opacity-80">
                  <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4" aria-hidden><path d="M6.6 10.8a15 15 0 0 0 6.6 6.6l2.2-2.2a1 1 0 0 1 1-.24 11.4 11.4 0 0 0 3.6.58 1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1 11.4 11.4 0 0 0 .58 3.6 1 1 0 0 1-.24 1z" /></svg>
                  +880 {STORE.phone.replace(/^0/, "")}
                </a>
                <p className="text-[12px] text-gray-500">(সকাল ৯টা - রাত ৯টা)</p>
                <a href={`https://wa.me/88${STORE.whatsapp}`} target="_blank" rel="noopener" className="mt-4 flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-accent to-accent-dark px-6 py-3 font-bold text-white shadow-lg transition hover:scale-[1.02]">
                  <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5" aria-hidden><path d="M12 2a10 10 0 0 0-8.6 15l-1.3 4.7 4.8-1.3A10 10 0 1 0 12 2zm5.6 14.2c-.24.66-1.4 1.28-1.9 1.32-.5.04-.98.22-3.3-.7-2.8-1.1-4.5-3.9-4.66-4.1-.14-.2-1.1-1.46-1.1-2.78 0-1.32.7-1.96.94-2.24.24-.28.52-.34.7-.34l.5.01c.16 0 .38-.06.6.46.24.56.8 1.92.86 2.06.06.14.1.3.02.5-.08.2-.12.32-.24.5l-.36.42c-.12.12-.24.26-.1.5.14.24.62 1.02 1.32 1.66.9.8 1.66 1.06 1.9 1.18.24.12.38.1.52-.06.14-.16.6-.7.76-.94.16-.24.32-.2.54-.12.22.08 1.4.66 1.64.78.24.12.4.18.46.28.06.1.06.58-.18 1.24z" /></svg>
                  Whatsapp এ মেসেজ করুন
                </a>
              </div>
            </div>
          </div>
        </section>
      </div>

      <div className="lg:hidden h-24" />
    </div>
  );
}
