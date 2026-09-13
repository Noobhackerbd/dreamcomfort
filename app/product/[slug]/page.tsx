// app/product/[slug]/page.tsx — Super-premium editorial product detail (server component).
import type { Metadata } from "next";
import { getServerSupabase } from "@/lib/supabase/server";
import { Product } from "@/lib/types";
import { notFound } from "next/navigation";
import { BuyButtons } from "@/components/BuyButtons";
import { ViewContentPixel } from "@/components/ViewContentPixel";
import { RecordView } from "@/components/store/RecordView";
import { ProductGallery } from "./ProductGallery";
import { ProductCard } from "@/components/ProductCard";
import { FaqAccordion } from "@/components/store/FaqAccordion";
import { MobileBuyBar } from "@/components/store/MobileBuyBar";
import { RecentViewedStrip } from "@/components/store/RecentViewedStrip";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { ProductReviews } from "@/components/store/ProductReviews";
import { getReviews } from "@/app/product/review-actions";
import { taka } from "@/lib/format";
import { STORE_NAME } from "@/lib/config";

export const dynamic = "force-dynamic";

async function getProduct(slug: string): Promise<Product | null> {
  const supabase = getServerSupabase();
  const { data } = await supabase.from("products").select("*").eq("slug", slug).eq("is_active", true).single();
  return (data as Product) ?? null;
}

async function getRelated(categoryId: string | null, excludeId: string): Promise<Product[]> {
  const supabase = getServerSupabase();
  if (categoryId) {
    const { data } = await supabase.from("products").select("*").eq("is_active", true).eq("category_id", categoryId).neq("id", excludeId).limit(8);
    if (data && data.length) return data as Product[];
  }
  const { data } = await supabase.from("products").select("*").eq("is_active", true).neq("id", excludeId).order("created_at", { ascending: false }).limit(8);
  return (data as Product[]) ?? [];
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const p = await getProduct(params.slug);
  if (!p) return { title: "পণ্য পাওয়া যায়নি" };
  const name = p.name_bn || p.name_en;
  const desc = p.meta_description || p.description_bn || p.description_en || `${name} — ${STORE_NAME}`;
  const image = p.images?.[0];
  return {
    title: p.meta_title || `${name} — ${STORE_NAME}`,
    description: desc.slice(0, 160),
    openGraph: { title: p.meta_title || name, description: desc.slice(0, 160), images: image ? [{ url: image }] : undefined, type: "website" },
  };
}

function Stars({ rating, size = 16 }: { rating: number; size?: number }) {
  return (
    <span className="inline-flex items-center gap-[1px]">
      {[0, 1, 2, 3, 4].map((i) => {
        const fill = Math.max(0, Math.min(1, rating - i));
        const id = `ps${i}-${Math.round(fill * 100)}-${size}`;
        return (
          <svg key={i} width={size} height={size} viewBox="0 0 24 24" aria-hidden>
            <defs><linearGradient id={id}><stop offset={`${fill * 100}%`} stopColor="#f5b301" /><stop offset={`${fill * 100}%`} stopColor="#e5e1d8" /></linearGradient></defs>
            <path d="M12 2l3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1z" fill={`url(#${id})`} />
          </svg>
        );
      })}
    </span>
  );
}

const TRUST = [
  { c: "#3E9BD1", t: "দ্রুত ডেলিভারি", d: "M1 3h15v13H1zM16 8h4l3 3v5h-7M5.5 18.5a2.5 2.5 0 105 0M18.5 18.5a2.5 2.5 0 105 0" },
  { c: "#16a34a", t: "ক্যাশ অন ডেলিভারি", d: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10zM9 12l2 2 4-4" },
  { c: "#E77BA6", t: "সহজ রিটার্ন", d: "M3 12a9 9 0 103-6.7L3 8M3 3v5h5" },
];

// Fallback highlights when a product has none set.
const DEFAULT_HIGHLIGHTS = ["প্রিমিয়াম মানের পণ্য", "মা ও শিশুর জন্য নিরাপদ", "সারা দেশে ক্যাশ অন ডেলিভারি", "৩ দিনের মানিব্যাক গ্যারান্টি"];

export default async function ProductPage({ params }: { params: { slug: string } }) {
  const p = await getProduct(params.slug);
  if (!p) notFound();

  const name = p.name_bn || p.name_en;
  const hasDiscount = p.compare_at_price && p.compare_at_price > p.price;
  const images = p.images?.length ? p.images : [];
  const related = await getRelated(p.category_id, p.id);
  const rev = await getReviews(p.id);
  // Prefer REAL customer reviews for the rating when we have them; else the admin-set value.
  const reviews = rev.count > 0 ? rev.count : (typeof p.review_count === "number" ? p.review_count : 0);
  const rating = rev.count > 0 ? rev.average : (typeof p.rating === "number" && p.rating > 0 ? p.rating : 0);
  // No reviews & no rating → don't show a (fake) rating at all.
  const showRating = reviews > 0 && rating > 0;

  const highlights = Array.isArray(p.highlights) && p.highlights.length ? p.highlights.filter(Boolean) : DEFAULT_HIGHLIGHTS;
  const specs = Array.isArray(p.specs) ? p.specs.filter((s) => s && s.label) : [];
  const faq = Array.isArray(p.faq) ? p.faq.filter((f) => f && f.q) : [];
  const howTo = (p.how_to_use || "").trim();

  const jsonLd = {
    "@context": "https://schema.org", "@type": "Product", name,
    description: p.description_bn || p.description_en || name, image: images, sku: p.sku || undefined,
    brand: { "@type": "Brand", name: STORE_NAME },
    aggregateRating: reviews > 0 ? { "@type": "AggregateRating", ratingValue: rating, reviewCount: Math.max(1, reviews) } : undefined,
    offers: { "@type": "Offer", priceCurrency: "BDT", price: p.price, availability: p.stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock" },
  };

  return (
    <div className="pb-24 md:pb-0">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <ViewContentPixel id={p.id} value={p.price} name={name} />
      <RecordView id={p.id} />

      <Breadcrumbs items={[{ name: "হোম", href: "/" }, { name: "সব পণ্য", href: "/products" }, { name, href: `/product/${p.slug}` }]} />

      {/* Above the fold */}
      <div className="grid md:grid-cols-2 gap-8 lg:gap-12">
        <div className="md:sticky md:top-24 h-max">
          <ProductGallery images={images} name={name} videoUrl={p.video_url} />
        </div>

        <div>
          <h1 className="text-2xl lg:text-3xl font-bold font-display leading-snug">{name}</h1>

          {showRating && (
            <div className="mt-2.5 flex items-center gap-2">
              <Stars rating={rating} />
              <span className="text-sm text-gray-500">{rating.toFixed(1)} · {reviews} রিভিউ</span>
            </div>
          )}

          <div className="mt-4 flex items-center gap-3 flex-wrap">
            <span className="text-3xl font-extrabold text-accent-dark">{taka(p.price)}</span>
            {hasDiscount && (
              <>
                <span className="text-gray-400 line-through text-lg">{taka(p.compare_at_price as number)}</span>
                <span className="rounded-lg bg-accent text-white text-xs font-bold px-2 py-1">{Math.round((1 - p.price / (p.compare_at_price as number)) * 100)}% ছাড়</span>
              </>
            )}
          </div>

          {/* Highlights */}
          <ul className="mt-5 grid sm:grid-cols-2 gap-2">
            {highlights.slice(0, 6).map((h, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                <svg viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.2" className="h-4 w-4 mt-0.5 shrink-0"><path d="M5 13l4 4L19 7" /></svg>
                <span>{h}</span>
              </li>
            ))}
          </ul>

          <p className="mt-5 text-gray-700 leading-relaxed whitespace-pre-line">{p.description_bn || p.description_en || "বিস্তারিত শীঘ্রই যোগ করা হবে।"}</p>

          <div className="mt-6 hidden md:block">
            <BuyButtons product={{ id: p.id, slug: p.slug, name, price: p.price, image: images[0] }} />
            <p className="mt-3 text-xs text-gray-400">স্টক: {p.stock > 0 ? `${p.stock} টি` : "স্টকে নেই"}</p>
          </div>

          <div className="mt-6 grid grid-cols-3 gap-2 text-center">
            {TRUST.map((b, i) => (
              <div key={i} className="rounded-xl border border-black/5 bg-white py-3">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={b.c} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="mx-auto mb-1"><path d={b.d} /></svg>
                <span className="text-[11px] font-medium text-gray-600">{b.t}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Specifications */}
      {specs.length > 0 && (
        <section className="mt-14 max-w-3xl">
          <h2 className="text-xl font-bold font-display mb-4">স্পেসিফিকেশন</h2>
          <div className="rounded-2xl bg-white ring-1 ring-black/5 overflow-hidden divide-y divide-black/5">
            {specs.map((s, i) => (
              <div key={i} className="flex gap-4 px-5 py-3 text-sm">
                <span className="w-40 shrink-0 text-gray-500">{s.label}</span>
                <span className="text-gray-900 font-medium">{s.value}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* How to use */}
      {howTo && (
        <section className="mt-14 max-w-3xl">
          <h2 className="text-xl font-bold font-display mb-4">ব্যবহারের নিয়ম</h2>
          <div className="rounded-2xl bg-brand-soft/50 ring-1 ring-black/5 p-5 text-gray-700 leading-relaxed whitespace-pre-line">{howTo}</div>
        </section>
      )}

      {/* Real customer reviews (with photos) */}
      <ProductReviews productId={p.id} initial={rev.reviews} count={rev.count} average={rev.average} />

      {/* FAQ */}
      {faq.length > 0 && (
        <section className="mt-14 max-w-3xl">
          <h2 className="text-xl font-bold font-display mb-4">সাধারণ প্রশ্ন</h2>
          <FaqAccordion items={faq} />
        </section>
      )}

      {/* Shipping & returns info */}
      <section className="mt-14 grid sm:grid-cols-3 gap-3 max-w-4xl">
        {[
          { t: "ডেলিভারি", d: "ঢাকায় ১–২ দিন, ঢাকার বাইরে ২–৪ দিন।" },
          { t: "পেমেন্ট", d: "ক্যাশ অন ডেলিভারি — পণ্য হাতে পেয়ে টাকা দিন।" },
          { t: "রিটার্ন", d: "পণ্যে সমস্যা থাকলে সহজ রিটার্ন সুবিধা।" },
        ].map((x) => (
          <div key={x.t} className="rounded-2xl bg-white ring-1 ring-black/5 p-4">
            <p className="font-semibold text-sm text-gray-900">{x.t}</p>
            <p className="text-xs text-gray-500 mt-1 leading-relaxed">{x.d}</p>
          </div>
        ))}
      </section>

      {related.length > 0 && (
        <section className="mt-14">
          <h2 className="text-xl font-bold font-display mb-4">সম্পর্কিত পণ্য</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {related.map((r) => <ProductCard key={r.id} p={r} />)}
          </div>
        </section>
      )}

      <RecentViewedStrip excludeId={p.id} />

      <MobileBuyBar product={{ id: p.id, slug: p.slug, name, price: p.price, image: images[0] }} compareAt={p.compare_at_price} />
    </div>
  );
}
