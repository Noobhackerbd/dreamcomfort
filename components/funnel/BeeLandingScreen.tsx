// components/funnel/BeeLandingScreen.tsx — the honey-bee landing page for the baby
// head-protector pillow (/baby-pillow). Same funnel engine as the pregnancy-pillow
// landing (ProductFunnel → OrderForm → placeOrder), restyled around the product's own
// colours: honey yellow, chocolate brown and warm cream.
//
// Delivery charge comes from THIS landing's own setting (Admin → Landing page →
// delivery charge). The browser only ever sends the landing key; checkout looks the
// amount up server-side, so it can't be tampered with.
//
// Speed: a server component, cached like every other landing route. Decoration is
// inline SVG + CSS, so the page ships no extra images and no extra JavaScript.
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
import { taka } from "@/lib/format";
import { toSlug } from "@/lib/slug";
import { pickShippingFee, toAreaFees } from "@/lib/shipping-rules";

/* ------------------------------------------------------------------ data ---- */

async function getFeaturedProducts(slugs: string[], legacy: string): Promise<Product[]> {
  const supabase = getServerSupabase();
  const wanted = slugs.length ? slugs : legacy ? [legacy] : [];
  if (!wanted.length) return [];
  const { data } = await supabase.from("products").select("*").in("slug", wanted).eq("is_active", true);
  const bySlug = new Map((data ?? []).map((p: any) => [p.slug, p as Product]));
  return wanted.map((s) => bySlug.get(s)).filter(Boolean) as Product[];
}

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

/* ----------------------------------------------------------- decorations ---- */

/** The bee mascot — drawn inline so it costs no image request. */
function Bee({ className = "", size = 44 }: { className?: string; size?: number }) {
  return (
    <svg viewBox="0 0 64 48" width={size} height={size * 0.75} className={className} aria-hidden>
      {/* wings */}
      <g className="dc-bee-wing">
        <ellipse cx="26" cy="14" rx="11" ry="7" fill="#fff" fillOpacity=".92" stroke="#4A2C17" strokeWidth="1.4" />
        <ellipse cx="39" cy="13" rx="9" ry="6" fill="#fff" fillOpacity=".85" stroke="#4A2C17" strokeWidth="1.4" />
      </g>
      {/* body */}
      <ellipse cx="34" cy="28" rx="17" ry="13" fill="#F7C12B" stroke="#4A2C17" strokeWidth="2" />
      <path d="M28 16.5c3 7 3 16 0 23" stroke="#4A2C17" strokeWidth="4.5" strokeLinecap="round" fill="none" />
      <path d="M38 17.5c2.6 6.5 2.6 14.5 0 21" stroke="#4A2C17" strokeWidth="4.5" strokeLinecap="round" fill="none" />
      {/* head + antennae */}
      <circle cx="51" cy="27" r="8" fill="#4A2C17" />
      <circle cx="54" cy="25" r="1.8" fill="#fff" />
      <path d="M50 19c1-3 3.5-4.5 6-4.5M54 19.5c1.5-2.5 4-3 6.5-2.5" stroke="#4A2C17" strokeWidth="1.8" strokeLinecap="round" fill="none" />
    </svg>
  );
}

/** Rounded honeycomb cell used as an icon frame. */
function Hex({ children, bright = false }: { children: React.ReactNode; bright?: boolean }) {
  return (
    <span
      className={
        "relative grid h-14 w-14 shrink-0 place-items-center sm:h-16 sm:w-16 " +
        (bright ? "text-brand-dark" : "text-accent-dark")
      }
    >
      <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full" aria-hidden>
        <path
          d="M50 3 92 27v46L50 97 8 73V27z"
          fill={bright ? "var(--c-honey, #F7C12B)" : "rgb(var(--c-accent-soft))"}
          stroke={bright ? "rgb(var(--c-brand-dark))" : "rgb(var(--c-accent) / .45)"}
          strokeWidth="4"
          strokeLinejoin="round"
        />
      </svg>
      <span className="relative">{children}</span>
    </span>
  );
}

function Ic({ d, cls = "h-6 w-6 sm:h-7 sm:w-7" }: { d: string; cls?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" className={cls} aria-hidden>
      <path d={d} />
    </svg>
  );
}

function CartIcon({ cls = "h-5 w-5 shrink-0" }: { cls?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={cls} aria-hidden>
      <circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" />
      <path d="M1 1h4l2.7 13.4a2 2 0 0 0 2 1.6h9.7a2 2 0 0 0 2-1.6L23 6H6" />
    </svg>
  );
}

/** Honey-yellow CTA: bright fill, dark cocoa label — 8.8:1, far above the 4.5:1 floor. */
function HoneyCta({ children, className = "", href = "#order-form" }: { children: React.ReactNode; className?: string; href?: string }) {
  return (
    <a
      href={href}
      className={
        "inline-flex items-center justify-center gap-2 rounded-full px-7 py-3.5 text-base font-extrabold text-brand-dark " +
        "shadow-[0_14px_30px_-10px_rgba(74,44,23,0.5)] ring-1 ring-brand-dark/15 transition hover:scale-[1.03] active:scale-[.99] " +
        className
      }
      style={{ background: "linear-gradient(135deg, var(--c-honey, #F7C12B) 0%, var(--c-honey-deep, #E8A317) 100%)" }}
    >
      {children}
    </a>
  );
}

function SectionTitle({ kicker, children }: { kicker?: string; children: React.ReactNode }) {
  return (
    <div className="mb-6 text-center">
      {kicker && (
        <p className="mb-2 text-[12px] font-bold uppercase tracking-[0.18em] text-accent-dark">{kicker}</p>
      )}
      <h2 className="font-display text-[1.7rem] font-extrabold leading-tight text-brand-dark sm:text-3xl md:text-[2.5rem]">
        {children}
      </h2>
      <span className="dc-stripe mt-4 inline-block h-1.5 w-20 rounded-full" />
    </div>
  );
}

/* ----------------------------------------------------------------- copy ---- */

const HERO_BADGES = [
  { d: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10zM9 12l2 2 4-4", label: "মাথার পূর্ণ\nসুরক্ষা" },
  { d: "M3 8h11a3 3 0 1 0-3-3M3 12h15a3 3 0 1 1-3 3M3 16h9a3 3 0 1 1-3 3", label: "শ্বাসযোগ্য\nমেশ কাপড়" },
  { d: "M20.2 3.8c2.3 2.3 2.3 6.1 0 8.4L12 20.4 3.6 12l8.2-8.2c2.3-2.3 6.1-2.3 8.4 0zM16 8 2 22", label: "ওজনে\nখুব হালকা" },
  { d: "M12 2.7 6.9 7.8a7.2 7.2 0 1 0 10.2 0zM9.5 14.5a3 3 0 0 0 3 3", label: "সহজে\nধোয়া যায়" },
];

const TRUST_BAR = [
  { big: "৬–২৪ মাস", small: "বয়সের শিশুদের জন্য" },
  { big: "১০,০০০+", small: "সন্তুষ্ট অভিভাবক" },
  { big: "৪.৯/৫", small: "গড় রেটিং" },
  { big: "মাত্র ১৮০ গ্রাম", small: "শিশু টেরই পাবে না" },
];

const WORRIES = [
  {
    d: "M12 9v4M12 17h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z",
    title: "বসতে শিখেছে, কিন্তু পেছনে পড়ে যায়",
    text: "৬–১০ মাসে শিশু বসা শেখে, তখন ভারসাম্য ঠিক থাকে না। হঠাৎ পেছনে পড়ে গেলে মাথার পেছনে সরাসরি আঘাত লাগে।",
  },
  {
    d: "M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zM8 12h8M12 8v8",
    title: "শক্ত মেঝে, টাইলস বা খাটের কোণা",
    text: "বাসার টাইলস বা পাকা মেঝেতে এক ধাক্কাতেই বড় ব্যথা হয়ে যেতে পারে — মা-বাবার এক মুহূর্তের অন্যমনস্কতাই যথেষ্ট।",
  },
  {
    d: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z",
    title: "শিশুর মাথার হাড় এখনো নরম",
    text: "দুই বছর বয়স পর্যন্ত মাথার খুলি পুরোপুরি শক্ত হয় না। এই সময়ে পেছনের আঘাত সবচেয়ে ঝুঁকিপূর্ণ।",
  },
  {
    d: "M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8z",
    title: "সারাক্ষণ পাহারা দেওয়া সম্ভব না",
    text: "ঘরের কাজ, রান্না বা এক মিনিটের ফোন — শিশুকে ২৪ ঘণ্টা চোখে চোখে রাখা কারও পক্ষেই সম্ভব নয়।",
  },
];

const HOW_HELPS = [
  {
    d: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10zM9 12l2 2 4-4",
    title: "আঘাত শুষে নেয়",
    text: "পিঠ ও মাথার পেছনে বসানো পুরু কুশন পড়ে যাওয়ার ধাক্কা শুষে নেয় — শিশু পড়লেও ব্যথা পায় না।",
  },
  {
    d: "M3 8h11a3 3 0 1 0-3-3M3 12h15a3 3 0 1 1-3 3M3 16h9a3 3 0 1 1-3 3",
    title: "গরমেও আরামদায়ক",
    text: "থ্রিডি এয়ার-মেশ কাপড়ে বাতাস অবাধে চলাচল করে, তাই পিঠ ঘেমে যায় না বা র‍্যাশ হয় না।",
  },
  {
    d: "M5 9 2 12l3 3M9 5l3-3 3 3M15 19l-3 3-3-3M19 9l3 3-3 3M2 12h20M12 2v20",
    title: "নড়াচড়ায় বাধা দেয় না",
    text: "মাত্র ১৮০ গ্রাম ওজন আর নরম স্ট্র্যাপ — শিশু স্বাভাবিকভাবেই হামাগুড়ি দেয়, বসে, হাঁটতে শেখে।",
  },
];

const QUALITY = [
  {
    d: "M12 2l9 5-9 5-9-5 9-5zM3 12l9 5 9-5M3 17l9 5 9-5",
    title: "ডাবল লেয়ার কুশন",
    text: "ভেতরে ঘন পিপি কটন, বাইরে নরম থ্রিডি মেশ — দুই স্তরে মিলে মাথা ও পিঠে পূর্ণ সুরক্ষা।",
    benefit: "বারবার পড়লেও কুশন চুপসে যায় না, প্রথম দিনের মতোই ফুলকো থাকে।",
  },
  {
    d: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10zM9 12l2 2 4-4",
    title: "শিশুর জন্য নিরাপদ উপাদান",
    text: "বিষমুক্ত, গন্ধহীন ও হাইপোঅ্যালার্জেনিক কাপড় — শিশুর কোমল ত্বকে কোনো জ্বালা করে না।",
    benefit: "মুখে দিলেও ক্ষতি নেই — কোনো ক্ষতিকর রাসায়নিক ব্যবহার করা হয়নি।",
  },
  {
    d: "M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6",
    title: "অ্যাডজাস্টেবল স্ট্র্যাপ",
    text: "কাঁধ ও বুকের দুই বেল্টই ছোট-বড় করা যায়, তাই ৬ মাস থেকে ২ বছর পর্যন্ত আরামে ফিট হয়।",
    benefit: "শিশু বড় হলেও নতুন করে কিনতে হবে না — একটিতেই পুরো সময় চলে যায়।",
  },
  {
    d: "M12 2.7 6.9 7.8a7.2 7.2 0 1 0 10.2 0zM9.5 14.5a3 3 0 0 0 3 3",
    title: "ধোয়া যায়, শুকায় দ্রুত",
    text: "হাতে বা মেশিনে ধুয়ে নিন — মেশ কাপড় দ্রুত শুকিয়ে যায়, আকারও নষ্ট হয় না।",
    benefit: "সবসময় পরিষ্কার-পরিচ্ছন্ন রাখা যায়, দুর্গন্ধ বা জীবাণুর ভয় নেই।",
  },
];

const WHY_US = [
  { d: "M2 7h20v10H2zM2 11h20M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z", title: "ক্যাশ অন ডেলিভারি", text: "পণ্য হাতে পেয়ে, খুলে দেখে সন্তুষ্ট হলে তবেই টাকা দিন — এক টাকাও অগ্রিম নয়।" },
  { d: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10zM9 12l2 2 4-4", title: "৩ দিনের মানিব্যাক গ্যারান্টি", text: "৩ দিন ব্যবহার করে ভালো না লাগলে ১০০% টাকা ফেরত — ঝুঁকি পুরোটাই আমাদের।" },
  { d: "M3 12a9 9 0 1 1 3 6.7L3 16M3 21v-5h5", title: "সম্পূর্ণ ফ্রি রিটার্ন", text: "পছন্দ না হলে রিটার্ন একদম ফ্রি — ফেরত পাঠানোর খরচও আমরাই বহন করি।" },
  { d: "M1 3h15v13H1zM16 8h4l3 3v5h-7M5.5 18.5a2.5 2.5 0 1 0 5 0M18.5 18.5a2.5 2.5 0 1 0 5 0", title: "দ্রুত হোম ডেলিভারি", text: "অর্ডারের পর ঢাকায় ১–২ দিন, সারা দেশে ২–৩ দিনেই দরজায় পৌঁছে যাবে।" },
];

const CHECKLIST = [
  "পেছনে পড়ে গেলেও মাথায় আঘাত লাগে না",
  "বসা, হামাগুড়ি ও হাঁটা শেখার পুরো সময়ের সঙ্গী",
  "থ্রিডি এয়ার-মেশ — গরমে পিঠ ঘামে না",
  "মাত্র ১৮০ গ্রাম, শিশুর নড়াচড়ায় বাধা দেয় না",
  "অ্যাডজাস্টেবল বেল্টে ৬ মাস থেকে ২ বছর পর্যন্ত ফিট",
  "বিষমুক্ত ও গন্ধহীন কাপড় — শিশুর ত্বকের জন্য নিরাপদ",
];

const FAQS = [
  { q: "কোন বয়সের শিশুর জন্য এটি উপযোগী?", a: "সাধারণত ৬ মাস থেকে ২ বছর বয়স পর্যন্ত — অর্থাৎ যখন শিশু বসা, হামাগুড়ি দেওয়া ও হাঁটা শিখছে। অ্যাডজাস্টেবল স্ট্র্যাপের কারণে এই পুরো সময়টাতেই আরামে ফিট হয়।" },
  { q: "শিশুর গরম লাগবে না তো?", a: "না। থ্রিডি এয়ার-মেশ কাপড় দিয়ে তৈরি, যার ভেতর দিয়ে বাতাস অবাধে চলাচল করে। তাই বাংলাদেশের গরমেও পিঠ ঘেমে ভিজে যায় না।" },
  { q: "পরলে কি শিশুর নড়াচড়ায় সমস্যা হয়?", a: "একদমই না। ওজন মাত্র ১৮০ গ্রামের মতো এবং স্ট্র্যাপ নরম, তাই শিশু স্বাভাবিকভাবেই হাত-পা নাড়তে ও চলাফেরা করতে পারে।" },
  { q: "কিভাবে পরিষ্কার করবো?", a: "হাতে বা ওয়াশিং মেশিনে হালকা সাবান দিয়ে ধুয়ে নিন, তারপর ছায়ায় শুকাতে দিন। মেশ কাপড় দ্রুত শুকায় এবং আকার নষ্ট হয় না।" },
  { q: "ডেলিভারি কত দিনে পাবো?", a: "ঢাকার ভেতরে ১–২ দিন এবং সারা বাংলাদেশে ২–৩ দিনের মধ্যে হোম ডেলিভারি পৌঁছে যায়।" },
  { q: "পেমেন্ট কিভাবে করতে হবে?", a: "ক্যাশ অন ডেলিভারি — কুরিয়ার থেকে পণ্য হাতে পেয়ে, দেখে-চেক করে তারপর টাকা দিবেন। কোনো অগ্রিম পেমেন্ট লাগবে না।" },
];

/* ------------------------------------------------------------------ page ---- */

export async function BeeLandingScreen({
  config: landing,
  searchParams,
}: {
  config: LandingConfig;
  searchParams?: { [key: string]: string | string[] | undefined };
}) {
  const [featured, globalShipping] = await Promise.all([
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

  // The global Settings → Shipping value — the last fallback. ProductFunnel applies
  // the full rule (landing charge → product charge → this) per selected product, and
  // the server re-computes it independently when the order is placed.
  const shipping = { inside: globalShipping.insideDhaka, outside: globalShipping.outsideDhaka };

  if (products.length === 0) {
    return (
      <>
        <LandingBodyClass theme="bee" />
        <div className="dc-theme-bee py-16 text-center">
          <h1 className="font-display text-2xl font-bold text-brand-dark">বেবি হেড প্রোটেক্টর</h1>
          <p className="mx-auto mt-3 max-w-md text-gray-500">
            এই ল্যান্ডিং পেজ দেখাতে অ্যাডমিন প্যানেল → Landing page → এই পেজের জন্য পণ্য নির্বাচন করুন।
          </p>
          <a href="/admin/landing" className="mt-6 inline-block rounded-2xl bg-brand px-6 py-3 text-white">অ্যাডমিন প্যানেল</a>
        </div>
      </>
    );
  }

  const hero = products[0];
  // What the hero quotes must match what the order form shows for that product.
  const heroFee = (area: "inside" | "outside") =>
    pickShippingFee(area, {
      landing: landing.shippingOverride ?? null,
      products: [toAreaFees(hero.shipping_inside, hero.shipping_outside)],
      global: shipping,
    });
  const feeIn = heroFee("inside");
  const feeOut = heroFee("outside");
  const deliveryLine =
    feeIn === feeOut
      ? feeIn === 0
        ? "ডেলিভারি সম্পূর্ণ ফ্রি"
        : `ডেলিভারি চার্জ ${taka(feeIn)}`
      : `ঢাকায় ${feeIn === 0 ? "ফ্রি" : taka(feeIn)} · ঢাকার বাইরে ${feeOut === 0 ? "ফ্রি" : taka(feeOut)}`;
  const heroImg = hero.images?.[0] ?? null;
  const heroName = hero.name_bn || hero.name_en || "বেবি হেড প্রোটেক্টর";
  const hasDiscount = hero.compare_at_price != null && Number(hero.compare_at_price) > Number(hero.price);
  const off = hasDiscount ? Math.round((1 - Number(hero.price) / Number(hero.compare_at_price)) * 100) : 0;

  return (
    <div className="dc-theme-bee relative -mt-6 overflow-x-clip">
      <LandingBodyClass theme="bee" />

      {/* ambient honey blobs */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="dc-blob absolute -left-10 -top-10 h-72 w-72 rounded-full bg-accent-light/50" />
        <div className="dc-blob absolute -right-10 top-40 h-80 w-80 rounded-full bg-brand-light/40" style={{ animationDelay: "3s" }} />
        <div className="dc-blob absolute -left-16 top-[130vh] h-80 w-80 rounded-full bg-accent-light/40" style={{ animationDelay: "1.5s" }} />
      </div>

      {/* ===================================================== HERO ===== */}
      <section className="relative z-10 mx-auto max-w-6xl px-0 pt-2 sm:px-3 sm:pt-4">
        <div className="relative overflow-hidden rounded-b-[1.8rem] bg-gradient-to-br from-accent-soft via-cream to-brand-soft px-5 pb-7 pt-6 shadow-sm sm:rounded-[1.6rem] sm:px-8 sm:pb-9 sm:pt-8 sm:ring-1 sm:ring-brand-dark/5">
          {/* a bee drifting across the top */}
          <div aria-hidden className="pointer-events-none absolute left-0 top-6 w-full opacity-70">
            <div className="dc-bee-fly w-max"><Bee size={42} /></div>
          </div>

          <div className="relative grid items-center gap-7 md:grid-cols-2">
            <div className="text-center md:text-left">
              <span className="inline-flex items-center gap-2 rounded-full bg-brand-dark px-4 py-1.5 text-[12px] font-bold text-white sm:text-[13px]">
                <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-[var(--c-honey,#F7C12B)]" aria-hidden>
                  <path d="M12 2l9 5v6c0 5.3-3.8 9.6-9 11-5.2-1.4-9-5.7-9-11V7z" />
                </svg>
                বসা ও হাঁটা শেখার সময়ের নিরাপত্তা
              </span>

              <h1 className="mt-4 font-display font-extrabold leading-[1.15] text-brand-dark">
                <span className="block text-[2rem] sm:text-[2.6rem] md:text-[3rem]">শিশুর মাথা থাকুক</span>
                <span className="mt-1 block text-[2rem] sm:text-[2.6rem] md:text-[3rem]">
                  <span className="relative inline-block">
                    <span className="absolute inset-x-0 bottom-1 -z-10 h-4 rounded-full" style={{ background: "var(--c-honey, #F7C12B)" }} />
                    সম্পূর্ণ সুরক্ষিত
                  </span>
                </span>
              </h1>

              <p className="mx-auto mt-3.5 max-w-md text-[15px] leading-relaxed text-brand/90 sm:text-base md:mx-0">
                বসতে, হামাগুড়ি দিতে আর হাঁটতে শেখার সময় শিশু হঠাৎ পেছনে পড়ে যায়। নরম কুশনের এই
                হেড প্রোটেক্টর সেই আঘাত শুষে নেয় — আপনি নিশ্চিন্তে কাজ করতে পারেন।
              </p>

              {/* price */}
              <div className="mt-5 flex flex-wrap items-center justify-center gap-2.5 md:justify-start">
                <span className="font-display text-[2rem] font-extrabold text-accent-dark sm:text-[2.3rem]">{taka(Number(hero.price))}</span>
                {hasDiscount && (
                  <>
                    <span className="text-lg text-gray-400 line-through">{taka(Number(hero.compare_at_price))}</span>
                    <span className="rounded-full bg-brand-dark px-2.5 py-1 text-[12px] font-bold text-white">{off}% ছাড়</span>
                  </>
                )}
              </div>

              <div className="mt-5 flex flex-col gap-2.5 sm:flex-row sm:justify-center md:justify-start">
                <HoneyCta className="w-full sm:w-auto">
                  <CartIcon /> এখনই অর্ডার করুন <span aria-hidden>→</span>
                </HoneyCta>
                <a
                  href="#details"
                  className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-white/90 px-6 py-3 text-[15px] font-semibold text-brand-dark ring-1 ring-brand-dark/15 transition hover:bg-white sm:w-auto"
                >
                  বিস্তারিত দেখুন
                  <Ic d="m6 9 6 6 6-6" cls="h-[18px] w-[18px]" />
                </a>
              </div>

              <p className="mt-3.5 text-[13px] font-semibold text-brand/80">
                💵 ক্যাশ অন ডেলিভারি · {deliveryLine}
              </p>
            </div>

            {/* product photo with a pulsing protective halo */}
            <div className="relative mx-auto w-full max-w-[22rem]">
              <span aria-hidden className="dc-halo absolute inset-0 rounded-full" style={{ background: "radial-gradient(circle, rgb(var(--c-accent) / .35) 0%, transparent 70%)" }} />
              {heroImg ? (
                <div className="dc-bob relative overflow-hidden rounded-[1.6rem] bg-white shadow-[0_24px_50px_-20px_rgba(74,44,23,0.45)] ring-4 ring-white">
                  <Image
                    src={heroImg}
                    alt={heroName}
                    width={900}
                    height={900}
                    priority
                    sizes="(max-width: 768px) 88vw, 360px"
                    className="h-auto w-full object-cover"
                  />
                </div>
              ) : (
                <div className="dc-bob grid aspect-square place-items-center rounded-[1.6rem] bg-white shadow-lg ring-4 ring-white">
                  <Bee size={120} />
                </div>
              )}
              <span className="absolute -right-1 -top-1 grid h-16 w-16 place-items-center rounded-full border-4 border-white bg-brand-dark text-center text-white shadow-lg sm:h-20 sm:w-20">
                <span className="text-[9px] font-extrabold leading-tight sm:text-[10px]">
                  ১০০%<br />নিরাপদ
                </span>
              </span>
            </div>
          </div>

          {/* hero badges */}
          <div className="mt-6 grid grid-cols-4 gap-2 border-t border-brand-dark/10 pt-5">
            {HERO_BADGES.map((b, i) => (
              <div key={i} className="flex flex-col items-center gap-1.5 text-center">
                <Hex bright={i % 2 === 0}><Ic d={b.d} cls="h-5 w-5 sm:h-6 sm:w-6" /></Hex>
                <span className="whitespace-pre-line text-[10.5px] font-semibold leading-tight text-brand-dark sm:text-[13px]">{b.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="relative z-10 mx-auto max-w-6xl px-2 sm:px-3">
        {/* ============================================== TRUST BAR ===== */}
        <Reveal>
          <div className="dc-honeycomb mt-4 grid grid-cols-4 rounded-[1.5rem] px-1 py-2 shadow-sm ring-1 ring-accent/20 sm:px-3">
            {TRUST_BAR.map((t, i) => (
              <div key={i} className="border-l border-white/70 px-1.5 py-2.5 text-center first:border-l-0 sm:px-3 sm:py-3">
                <p className="text-[11px] font-extrabold leading-tight text-brand-dark sm:text-[15px]">{t.big}</p>
                <p className="mt-0.5 text-[9px] leading-tight text-brand/70 sm:text-[12px]">{t.small}</p>
              </div>
            ))}
          </div>
        </Reveal>

        {/* ================================================ WORRIES ===== */}
        <section className="pt-10">
          <Reveal>
            <SectionTitle kicker="যে ভয়টা প্রতিটি মা-বাবার">এই চিন্তাগুলো কি <span className="text-accent-dark">আপনারও?</span></SectionTitle>
          </Reveal>
          <div className="grid gap-3 sm:grid-cols-2">
            {WORRIES.map((w, i) => (
              <Reveal key={i} delay={i * 70}>
                <div className="flex h-full items-start gap-3.5 rounded-[1.3rem] bg-white p-4 shadow-sm ring-1 ring-brand-dark/5 transition hover:shadow-md sm:p-5">
                  <Hex bright={i % 2 === 1}><Ic d={w.d} cls="h-5 w-5 sm:h-6 sm:w-6" /></Hex>
                  <div className="min-w-0">
                    <h3 className="font-display text-[15px] font-bold text-brand-dark sm:text-lg">{w.title}</h3>
                    <p className="mt-1.5 text-[13px] leading-relaxed text-gray-600 sm:text-[14.5px]">{w.text}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
          <Reveal delay={300}>
            <div className="mt-5 rounded-[1.3rem] bg-brand-dark px-5 py-5 text-center text-white sm:px-8">
              <p className="font-display text-lg font-bold sm:text-xl">
                একটি <span style={{ color: "var(--c-honey, #F7C12B)" }}>হেড প্রোটেক্টর</span> — আর এই চিন্তা শেষ।
              </p>
              <p className="mt-1.5 text-[14px] text-white/80">শিশু খেলুক, পড়ুক, উঠুক — মাথা থাকবে নিরাপদ।</p>
            </div>
          </Reveal>
        </section>

        {/* ============================================== HOW HELPS ===== */}
        <section className="pt-10">
          <Reveal><SectionTitle kicker="কিভাবে কাজ করে">কেন এটি <span className="text-accent-dark">সত্যিই কাজে দেয়</span></SectionTitle></Reveal>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
            {HOW_HELPS.map((h, i) => (
              <Reveal key={i} delay={i * 90}>
                <div className="flex h-full flex-col items-center rounded-[1.3rem] bg-white px-4 py-6 text-center shadow-sm ring-1 ring-brand-dark/5">
                  <Hex bright><Ic d={h.d} /></Hex>
                  <h3 className="mt-3 font-display text-base font-bold text-brand-dark sm:text-lg">{h.title}</h3>
                  <p className="mt-1.5 text-[13.5px] leading-relaxed text-gray-600 sm:text-[14.5px]">{h.text}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </section>

        {/* ============================================== CHECKLIST ===== */}
        <Reveal delay={120}>
          <section className="mt-10 grid items-center gap-6 rounded-[1.75rem] bg-gradient-to-br from-accent-soft to-cream p-4 shadow-sm ring-1 ring-brand-dark/5 sm:p-7 md:grid-cols-2">
            <div className="relative order-2 md:order-1">
              <span className="inline-flex items-center gap-2 rounded-full bg-accent/15 px-4 py-1.5 text-[13px] font-bold text-accent-dark">
                ড্রিম কমফোর্ট প্রিমিয়াম পণ্য
              </span>
              <h2 className="mt-3 font-display text-[1.6rem] font-extrabold leading-tight text-brand-dark sm:text-[2rem]">
                কেন এই <span className="text-accent-dark">হেড প্রোটেক্টরটিই</span> বেছে নেবেন?
              </h2>
              <ul className="mt-5 space-y-3">
                {CHECKLIST.map((t, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <svg viewBox="0 0 24 24" className="mt-0.5 h-5 w-5 shrink-0 fill-accent-dark" aria-hidden>
                      <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm-1.2 14.2-4-4 1.4-1.4 2.6 2.6 5.6-5.6 1.4 1.4z" />
                    </svg>
                    <span className="text-[14.5px] text-gray-700 sm:text-[15px]">{t}</span>
                  </li>
                ))}
              </ul>
              <HoneyCta className="mt-6"><CartIcon /> এখনই অর্ডার করুন <span aria-hidden>→</span></HoneyCta>
            </div>
            <div className="relative order-1 md:order-2">
              {hero.images?.[1] || heroImg ? (
                <Image
                  src={(hero.images?.[1] ?? heroImg) as string}
                  alt={heroName}
                  width={900}
                  height={900}
                  sizes="(max-width: 768px) 92vw, 440px"
                  className="w-full rounded-[1.4rem] object-cover shadow-md"
                />
              ) : (
                <div className="grid aspect-square place-items-center rounded-[1.4rem] bg-white shadow-md"><Bee size={110} /></div>
              )}
            </div>
          </section>
        </Reveal>

        <TestimonialsSection
          reviews={landing.reviews.map((r, idx) => ({
            id: String(idx),
            name: r.name,
            rating: r.stars,
            body: r.text,
            images: r.image ? [r.image] : null,
          }))}
          reviewsHref={`/product/${hero.slug}#reviews`}
          title={landing.reviewTitle || undefined}
          stat={landing.reviewStat || undefined}
          hideWhenEmpty
        />
      </div>

      {/* ========================================== ORDER ENGINE ===== */}
      <div className="relative z-10 mx-auto max-w-6xl px-1">
        {/* With a single product there is nothing to choose between, so the
            "pick your design" framing would be misleading. */}
        <Reveal>
          <div className="pt-8">
            {products.length > 1 ? (
              <SectionTitle kicker="আপনার পছন্দের ডিজাইন বেছে নিন">
                হেড প্রোটেক্টর <span className="text-accent-dark">কালেকশন</span>
              </SectionTitle>
            ) : (
              <SectionTitle kicker="ক্যাশ অন ডেলিভারি · সারা দেশে">
                এখনই <span className="text-accent-dark">অর্ডার করুন</span>
              </SectionTitle>
            )}
          </div>
        </Reveal>

        <ProductFunnel
          products={products}
          initialProductId={initialProductId}
          shipping={shipping}
          headline={landing.headline}
          subheadline={landing.subheadline}
          urgencyText={landing.urgencyText}
          statText={landing.statText}
          badges={landing.badges}
          ctaText={landing.ctaText}
          shippingOverride={landing.shippingOverride ?? null}
          landingKey={landing.landingKey}
          theme="bee"
        />

        {/* ============================================== QUALITY ===== */}
        <section id="details" className="scroll-mt-20 py-8">
          <Reveal><SectionTitle kicker="প্রিমিয়াম কোয়ালিটি">ভেতরে-বাইরে <span className="text-accent-dark">যত্নে তৈরি</span></SectionTitle></Reveal>
          <div className="grid gap-4 md:grid-cols-2">
            {QUALITY.map((d, i) => (
              <Reveal key={i} delay={i * 70}>
                <div className="h-full rounded-[1.5rem] bg-white p-5 shadow-sm ring-1 ring-brand-dark/5 transition-[transform,box-shadow] hover:-translate-y-0.5 hover:shadow-xl sm:p-6">
                  <div className="flex items-center gap-4">
                    <Hex bright={i % 2 === 0}><Ic d={d.d} /></Hex>
                    <h3 className="font-display text-base font-bold text-brand-dark sm:text-lg">{d.title}</h3>
                  </div>
                  <p className="mt-4 text-[14.5px] leading-relaxed text-gray-600 sm:text-[15px]">{d.text}</p>
                  <p className="mt-3 rounded-xl bg-accent-soft px-3.5 py-2.5 text-[13.5px] leading-relaxed text-accent-dark">
                    <b>✓ সুবিধা:</b> {d.benefit}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>
          <div className="mt-6 text-center">
            <HoneyCta className="text-lg"><CartIcon cls="h-6 w-6 shrink-0" /> এখনই অর্ডার করুন <span aria-hidden>→</span></HoneyCta>
          </div>
        </section>

        {/* =============================================== WHY US ===== */}
        <section className="py-8">
          <Reveal><SectionTitle kicker="আপনার নিশ্চিন্ততা">কেন <span className="text-accent-dark">আমাদের কাছ থেকে</span> নেবেন?</SectionTitle></Reveal>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {WHY_US.map((w, i) => (
              <Reveal key={i} delay={i * 80}>
                <div className="h-full rounded-[1.5rem] bg-white p-6 text-center shadow-sm ring-1 ring-brand-dark/5 transition-[transform,box-shadow] hover:-translate-y-0.5 hover:shadow-xl">
                  <div className="mx-auto w-max"><Hex bright={i % 2 === 1}><Ic d={w.d} /></Hex></div>
                  <h3 className="mt-4 font-display font-bold text-brand-dark">{w.title}</h3>
                  <p className="mt-1.5 text-[14px] leading-relaxed text-gray-600">{w.text}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </section>

        {/* ============================================ GUARANTEE ===== */}
        <section className="py-8">
          <Reveal>
            <div className="relative overflow-hidden rounded-[2rem] bg-brand-dark p-8 text-center text-white shadow-xl md:p-12">
              <div aria-hidden className="dc-stripe absolute inset-x-0 top-0 h-2 opacity-90" />
              <div aria-hidden className="pointer-events-none absolute -right-10 -top-10 h-48 w-48 rounded-full bg-white/5" />
              <div aria-hidden className="pointer-events-none absolute -bottom-12 -left-10 h-56 w-56 rounded-full bg-white/5" />
              <div className="relative">
                <span className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-2xl" style={{ background: "var(--c-honey, #F7C12B)", color: "#4A2C17" }}>
                  <Ic d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10zM9 12l2 2 4-4" cls="h-8 w-8" />
                </span>
                <h2 className="font-display text-2xl font-extrabold leading-tight md:text-[2.2rem]">{landing.guaranteeTitle}</h2>
                <p className="mx-auto mt-3 max-w-xl text-[15px] leading-relaxed text-white/85">{landing.guaranteeText}</p>
                <HoneyCta className="mt-6 text-lg">
                  <CartIcon cls="h-6 w-6 shrink-0" /> {landing.ctaText} <span aria-hidden>→</span>
                </HoneyCta>
                <p className="mt-4 text-[13px] text-white/75">💵 ক্যাশ অন ডেলিভারি · কোনো অগ্রিম পেমেন্ট নেই</p>
              </div>
            </div>
          </Reveal>
        </section>

        {/* ============================================ FAQ + HELP ===== */}
        <section className="py-8">
          <div className="grid gap-6 md:grid-cols-5">
            <div className="md:col-span-3">
              <h2 className="font-display text-2xl font-extrabold text-brand-dark">
                প্রায়শই জিজ্ঞাসিত <span className="text-accent-dark">প্রশ্ন</span>
              </h2>
              <div className="mt-5 space-y-3">
                {FAQS.map((f, i) => (
                  <details key={i} className="group rounded-2xl bg-white shadow-sm ring-1 ring-brand-dark/5 open:ring-accent/40">
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-4 font-semibold text-brand-dark [&::-webkit-details-marker]:hidden">
                      <span className="text-[14.5px] sm:text-[15px]">{f.q}</span>
                      <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full text-accent-dark transition-transform group-open:rotate-45">
                        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden>
                          <path d="M12 5v14M5 12h14" />
                        </svg>
                      </span>
                    </summary>
                    <p className="px-5 pb-4 text-[14px] leading-relaxed text-gray-600">{f.a}</p>
                  </details>
                ))}
              </div>
            </div>

            <div className="md:col-span-2">
              <div className="h-full rounded-[1.5rem] bg-gradient-to-br from-accent-soft to-white p-6 text-center ring-1 ring-accent/20 sm:text-left">
                <div className="flex items-center justify-center gap-3 sm:justify-start">
                  <Hex bright><Ic d="M3 18v-6a9 9 0 0 1 18 0v6M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z" /></Hex>
                  <div>
                    <p className="font-display text-lg font-extrabold text-brand-dark">কোনো প্রশ্ন?</p>
                    <p className="text-sm text-gray-600">আমরা আছি আপনার পাশে!</p>
                  </div>
                </div>
                <p className="mt-5 font-bold text-brand-dark">কাস্টমার সাপোর্ট</p>
                <a href={`tel:${STORE.phone}`} className="mt-1 inline-flex items-center gap-2 font-semibold text-accent-dark hover:opacity-80">
                  <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4" aria-hidden>
                    <path d="M6.6 10.8a15 15 0 0 0 6.6 6.6l2.2-2.2a1 1 0 0 1 1-.24 11.4 11.4 0 0 0 3.6.58 1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1 11.4 11.4 0 0 0 .58 3.6 1 1 0 0 1-.24 1z" />
                  </svg>
                  +880 {STORE.phone.replace(/^0/, "")}
                </a>
                <p className="text-[12px] text-gray-500">(সকাল ৯টা - রাত ৯টা)</p>
                <a
                  href={`https://wa.me/88${STORE.whatsapp}`}
                  target="_blank"
                  rel="noopener"
                  className="mt-4 flex w-full items-center justify-center gap-2 rounded-full bg-brand-dark px-6 py-3 font-bold text-white shadow-lg transition hover:scale-[1.02]"
                >
                  <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5" aria-hidden>
                    <path d="M12 2a10 10 0 0 0-8.6 15l-1.3 4.7 4.8-1.3A10 10 0 1 0 12 2zm5.6 14.2c-.24.66-1.4 1.28-1.9 1.32-.5.04-.98.22-3.3-.7-2.8-1.1-4.5-3.9-4.66-4.1-.14-.2-1.1-1.46-1.1-2.78 0-1.32.7-1.96.94-2.24.24-.28.52-.34.7-.34l.5.01c.16 0 .38-.06.6.46.24.56.8 1.92.86 2.06.06.14.1.3.02.5-.08.2-.12.32-.24.5l-.36.42c-.12.12-.24.26-.1.5.14.24.62 1.02 1.32 1.66.9.8 1.66 1.06 1.9 1.18.24.12.38.1.52-.06.14-.16.6-.7.76-.94.16-.24.32-.2.54-.12.22.08 1.4.66 1.64.78.24.12.4.18.46.28.06.1.06.58-.18 1.24z" />
                  </svg>
                  Whatsapp এ মেসেজ করুন
                </a>
              </div>
            </div>
          </div>
        </section>
      </div>

      <div className="h-24 lg:hidden" />
    </div>
  );
}
