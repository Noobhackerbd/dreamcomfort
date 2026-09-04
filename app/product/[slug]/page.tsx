// app/product/[slug]/page.tsx — Product detail (server component), premium store look.
import type { Metadata } from "next";
import { getServerSupabase } from "@/lib/supabase/server";
import { Product } from "@/lib/types";
import { notFound } from "next/navigation";
import { BuyButtons } from "@/components/BuyButtons";
import { ViewContentPixel } from "@/components/ViewContentPixel";
import { ProductGallery } from "./ProductGallery";
import { ProductCard } from "@/components/ProductCard";
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
  // Fallback: recent products.
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

function Stars({ rating }: { rating: number }) {
  return (
    <span className="inline-flex items-center gap-[1px]">
      {[0, 1, 2, 3, 4].map((i) => {
        const fill = Math.max(0, Math.min(1, rating - i));
        const id = `ps${i}-${Math.round(fill * 100)}`;
        return (
          <svg key={i} width="16" height="16" viewBox="0 0 24 24" aria-hidden>
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

export default async function ProductPage({ params }: { params: { slug: string } }) {
  const p = await getProduct(params.slug);
  if (!p) notFound();

  const name = p.name_bn || p.name_en;
  const hasDiscount = p.compare_at_price && p.compare_at_price > p.price;
  const images = p.images?.length ? p.images : [];
  const related = await getRelated(p.category_id, p.id);
  const rating = typeof p.rating === "number" && p.rating > 0 ? p.rating : 4.9;
  const reviews = typeof p.review_count === "number" ? p.review_count : 0;

  const jsonLd = {
    "@context": "https://schema.org", "@type": "Product", name,
    description: p.description_bn || p.description_en || name, image: images, sku: p.sku || undefined,
    brand: { "@type": "Brand", name: STORE_NAME },
    aggregateRating: { "@type": "AggregateRating", ratingValue: rating, reviewCount: Math.max(1, reviews) },
    offers: { "@type": "Offer", priceCurrency: "BDT", price: p.price, availability: p.stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock" },
  };

  return (
    <div>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <ViewContentPixel id={p.id} value={p.price} name={name} />

      <div className="grid md:grid-cols-2 gap-8">
        <ProductGallery images={images} name={name} />

        <div>
          <h1 className="text-2xl font-bold font-display leading-snug">{name}</h1>

          <div className="mt-2 flex items-center gap-2">
            <Stars rating={rating} />
            <span className="text-sm text-gray-500">{rating.toFixed(1)}{reviews > 0 ? ` · ${reviews} রিভিউ` : ""}</span>
          </div>

          <div className="mt-4 flex items-center gap-3 flex-wrap">
            <span className="text-3xl font-extrabold text-accent-dark">{taka(p.price)}</span>
            {hasDiscount && (
              <>
                <span className="text-gray-400 line-through text-lg">{taka(p.compare_at_price as number)}</span>
                <span className="rounded-lg bg-accent text-white text-xs font-bold px-2 py-1">{Math.round((1 - p.price / (p.compare_at_price as number)) * 100)}% ছাড়</span>
              </>
            )}
          </div>

          <p className="mt-4 text-gray-700 leading-relaxed whitespace-pre-line">{p.description_bn || p.description_en || "বিস্তারিত শীঘ্রই যোগ করা হবে।"}</p>

          <div className="mt-6">
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

      {related.length > 0 && (
        <section className="mt-14">
          <h2 className="text-xl font-bold font-display mb-4">সম্পর্কিত পণ্য</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {related.map((r) => <ProductCard key={r.id} p={r} />)}
          </div>
        </section>
      )}
    </div>
  );
}
