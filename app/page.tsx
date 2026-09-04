// app/page.tsx — store homepage (dreamcomfortbd.com). The single-product sales
// funnel now lives at /landing. This is a normal shop home: hero slider, trust
// badges, categories, featured products and an offer banner.
import type { Metadata } from "next";
import { getServerSupabase } from "@/lib/supabase/server";
import { getHomeBanners } from "@/lib/settings";
import { STORE, STORE_NAME } from "@/lib/config";
import type { Product, Category } from "@/lib/types";
import { ProductCard } from "@/components/ProductCard";
import { BannerSlider, type Slide } from "@/components/store/BannerSlider";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: `${STORE_NAME} — ${STORE.tagline}`,
  description: "প্রিমিয়াম প্রেগনেন্সি পিলো, বেবি প্রোডাক্ট ও আরামদায়ক বিছানাপত্র — সারা দেশে ক্যাশ অন ডেলিভারি।",
};

const CAT_COLORS = ["#7c8cf0", "#E77BA6", "#f0a53a", "#9a7be0", "#3E9BD1", "#41b98a"];

function SectionHead({ title, href }: { title: string; href?: string }) {
  return (
    <div className="flex items-center justify-between mb-3.5 mt-8">
      <h2 className="text-xl font-bold font-display">{title}</h2>
      {href && (
        <a href={href} className="text-sm font-semibold text-brand-dark inline-flex items-center gap-1">
          সব দেখুন
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6" /></svg>
        </a>
      )}
    </div>
  );
}

export default async function HomePage() {
  const supabase = getServerSupabase();
  const [{ data: cats }, { data: prods }, banners] = await Promise.all([
    supabase.from("categories").select("*").order("sort_order", { ascending: true }),
    supabase.from("products").select("*").eq("is_active", true).order("created_at", { ascending: false }).limit(24),
    getHomeBanners(),
  ]);

  const categories = (cats as Category[]) ?? [];
  const products = (prods as Product[]) ?? [];
  const featured = products.slice(0, 8);
  const rest = products.slice(8, 20);

  // Hero slides: uploaded banners, else fall back to featured product images.
  const heroSlides: Slide[] = banners.hero.length
    ? banners.hero
    : featured.slice(0, 4).filter((p) => p.images?.[0]).map((p) => ({ image: p.images![0], link: `/product/${p.slug}` }));

  return (
    <div>
      {/* Hero */}
      {heroSlides.length > 0 && <BannerSlider slides={heroSlides} aspect="16 / 9" arrows interval={4000} />}

      {/* Trust badges */}
      <div className="mt-4 grid grid-cols-3 rounded-2xl border border-black/5 bg-white overflow-hidden">
        {[
          { c: "#3E9BD1", t: "দ্রুত ডেলিভারি", s: "সারা দেশে ২-৩ দিনে", d: "M1 3h15v13H1zM16 8h4l3 3v5h-7M5.5 18.5a2.5 2.5 0 105 0M18.5 18.5a2.5 2.5 0 105 0" },
          { c: "#16a34a", t: "ক্যাশ অন ডেলিভারি", s: "হাতে পেয়ে টাকা দিন", d: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10zM9 12l2 2 4-4" },
          { c: "#E77BA6", t: "সহজ রিটার্ন", s: "সমস্যা হলে বদলে নিন", d: "M3 12a9 9 0 103-6.7L3 8M3 3v5h5" },
        ].map((b, i) => (
          <div key={i} className={"px-2 py-3.5 text-center " + (i > 0 ? "border-l border-black/5" : "")}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={b.c} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="mx-auto mb-1.5"><path d={b.d} /></svg>
            <p className="text-[12.5px] font-semibold leading-tight">{b.t}</p>
            <p className="text-[10.5px] text-gray-400">{b.s}</p>
          </div>
        ))}
      </div>

      {/* Categories */}
      {categories.length > 0 && (
        <>
          <SectionHead title="ক্যাটাগরি" href="/products" />
          <div className="flex gap-3 overflow-x-auto pb-1 -mx-1 px-1" style={{ scrollbarWidth: "none" }}>
            {categories.map((c, i) => (
              <a key={c.id} href={`/products?category=${c.slug}`} className="shrink-0 w-[80px] text-center">
                <div className="w-[80px] h-[80px] rounded-2xl border border-black/5 bg-white flex items-center justify-center mb-1.5" style={{ color: CAT_COLORS[i % CAT_COLORS.length] }}>
                  <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20.6 6.6l-8-4a2 2 0 00-1.9 0l-8 4M3 6.6v10.8a2 2 0 001.1 1.8l7 3.4a2 2 0 001.8 0l7-3.4a2 2 0 001.1-1.8V6.6M3 6.6l9 4.4 9-4.4M12 22V11" /></svg>
                </div>
                <span className="text-[11.5px] font-semibold leading-tight block line-clamp-2">{c.name_bn || c.name_en}</span>
              </a>
            ))}
          </div>
        </>
      )}

      {/* Featured products */}
      {featured.length > 0 && (
        <>
          <SectionHead title="ফিচার্ড পণ্য" href="/products" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {featured.map((p) => <ProductCard key={p.id} p={p} />)}
          </div>
        </>
      )}

      {/* Offer banner */}
      {banners.offers.length > 0 && (
        <div className="mt-8">
          <SectionHead title="বিশেষ অফার" />
          <BannerSlider slides={banners.offers} aspect="16 / 7" interval={4500} />
        </div>
      )}

      {/* All products */}
      {rest.length > 0 && (
        <>
          <SectionHead title="সব পণ্য" href="/products" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {rest.map((p) => <ProductCard key={p.id} p={p} />)}
          </div>
        </>
      )}

      <div className="text-center mt-8">
        <a href="/products" className="inline-block rounded-xl border border-brand text-brand-dark font-bold text-sm px-7 py-3 hover:bg-brand-soft">
          সব পণ্য দেখুন →
        </a>
      </div>

      {products.length === 0 && (
        <p className="text-center text-gray-400 py-16">এখনও কোনো পণ্য যোগ করা হয়নি। <a href="/admin/products" className="text-brand-dark underline">পণ্য যোগ করুন</a>।</p>
      )}
    </div>
  );
}
