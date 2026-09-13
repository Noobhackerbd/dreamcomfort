// app/page.tsx — store homepage (dreamcomfortbd.com). The single-product sales
// funnel now lives at /landing. This is a normal shop home: hero slider, trust
// badges, categories, featured products and an offer banner.
import type { Metadata } from "next";
import Image from "next/image";
import { getServerSupabase } from "@/lib/supabase/server";
import { getHomeBanners, getFlashSale, getHomeStrip, getCategoryImages } from "@/lib/settings";
import { STORE, STORE_NAME } from "@/lib/config";
import type { Product, Category } from "@/lib/types";
import { ProductCard } from "@/components/ProductCard";
import { BannerSlider, type Slide } from "@/components/store/BannerSlider";
import { NewsletterSignup } from "@/components/store/NewsletterSignup";
import { FlashCountdown } from "@/components/store/FlashCountdown";
import { ForYou } from "@/components/store/ForYou";
import { getForYou } from "@/app/for-you-actions";
import { getFeaturedProducts } from "@/lib/featured";

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
  const [{ data: cats }, { data: prods }, banners, reviewsRes, flash, strip, catImages] = await Promise.all([
    supabase.from("categories").select("*").order("sort_order", { ascending: true }),
    supabase.from("products").select("*").eq("is_active", true).order("created_at", { ascending: false }).limit(24),
    getHomeBanners(),
    supabase.from("product_reviews").select("id, name, rating, body, products(name_bn, name_en, slug)").eq("status", "approved").not("body", "is", null).order("created_at", { ascending: false }).limit(9),
    getFlashSale(),
    getHomeStrip(),
    getCategoryImages(),
  ]);

  const categories = (cats as Category[]) ?? [];
  const products = (prods as Product[]) ?? [];

  // Flash sale — products chosen in admin, in the admin-set order.
  let flashProducts: Product[] = [];
  if (flash.productIds.length) {
    const { data: fp } = await supabase.from("products").select("*").in("id", flash.productIds).eq("is_active", true);
    const map = Object.fromEntries(((fp as Product[]) ?? []).map((p) => [p.id, p]));
    flashProducts = flash.productIds.map((id) => map[id]).filter(Boolean) as Product[];
  }
  // Hide the flash sale once its countdown has passed (page is force-dynamic → fresh each request).
  const flashEndsMs = flash.endsAt ? new Date(flash.endsAt).getTime() : 0;
  const flashEnded = flashEndsMs > 0 && flashEndsMs <= Date.now();
  const showFlash = flashProducts.length > 0 && !flashEnded;
  const reviews = ((reviewsRes as any)?.data ?? []) as any[];

  // Featured — admin picks first, then best-sellers, then newest (in-stock only).
  const featured = await getFeaturedProducts(8);

  // "For You" — personalized feed (first page here; client re-ranks by view history).
  const forYou = await getForYou({ offset: 0, limit: 8 });

  // Hero slides: uploaded banners, else fall back to featured product images.
  const heroSlides: Slide[] = banners.hero.length
    ? banners.hero
    : featured.slice(0, 4).filter((p) => p.images?.[0]).map((p) => ({ image: p.images![0], link: `/product/${p.slug}` }));

  return (
    <div>
      {/* Hero */}
      {heroSlides.length > 0 && <BannerSlider slides={heroSlides} aspect="16 / 9" arrows rounded="0" interval={4000} />}

      {/* Slim GIF/image strip below the hero (admin-uploaded) */}
      {strip.gif && (
        strip.link ? (
          <a href={strip.link} className="mt-4 block overflow-hidden rounded-2xl">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={strip.gif} alt="" className="w-full h-auto" />
          </a>
        ) : (
          <div className="mt-4 overflow-hidden rounded-2xl">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={strip.gif} alt="" className="w-full h-auto" />
          </div>
        )
      )}

      {/* Flash sale — single horizontal-scrolling row (PC + mobile) */}
      {showFlash && (
        <section>
          <div className="mb-3 mt-6">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-xl font-bold font-display inline-flex items-center gap-2">
                <span className="inline-grid place-items-center h-7 w-7 rounded-lg text-white" style={{ background: "#F0530E" }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden><path d="M13 2L4.5 13.5H11l-1 8.5L19.5 10H13z" /></svg>
                </span>
                {flash.title || "ফ্ল্যাশ সেল"}
              </h2>
              <a href="/products" className="text-sm font-semibold text-brand-dark inline-flex items-center gap-1 shrink-0">
                সব দেখুন
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6" /></svg>
              </a>
            </div>
            {flash.endsAt && <div className="mt-2"><FlashCountdown endsAt={flash.endsAt} /></div>}
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1" style={{ scrollbarWidth: "none" }}>
            {flashProducts.map((p) => (
              <div key={p.id} className="shrink-0 w-[150px] sm:w-[190px]">
                <ProductCard p={p} />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Categories */}
      {categories.length > 0 && (
        <>
          <SectionHead title="ক্যাটাগরি" href="/products" />
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2.5">
            {categories.map((c, i) => (
              <a key={c.id} href={`/products?category=${c.slug}`} className="group rounded-xl border border-black/5 bg-white overflow-hidden hover:shadow-sm transition">
                <div className="relative aspect-square bg-[#f6f6f6] overflow-hidden">
                  {catImages[c.id] ? (
                    <Image src={catImages[c.id]} alt={c.name_bn || c.name_en} fill sizes="(max-width:768px) 33vw, 140px" className="object-cover group-hover:scale-105 transition-transform duration-300" />
                  ) : (
                    <span className="absolute inset-0 grid place-items-center" style={{ color: CAT_COLORS[i % CAT_COLORS.length] }}>
                      <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20.6 6.6l-8-4a2 2 0 00-1.9 0l-8 4M3 6.6v10.8a2 2 0 001.1 1.8l7 3.4a2 2 0 001.8 0l7-3.4a2 2 0 001.1-1.8V6.6M3 6.6l9 4.4 9-4.4M12 22V11" /></svg>
                    </span>
                  )}
                </div>
                <span className="block px-1.5 py-2 text-center text-[11.5px] font-semibold leading-tight line-clamp-2">{c.name_bn || c.name_en}</span>
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

      {/* Why choose us */}
      <SectionHead title="কেন আমাদের বেছে নেবেন" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { c: "#3E9BD1", t: "১০০% অরিজিনাল পণ্য", s: "যাচাই করা মানসম্পন্ন পণ্য", d: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10zM9 12l2 2 4-4" },
          { c: "#16a34a", t: "ক্যাশ অন ডেলিভারি", s: "হাতে পেয়ে টাকা দিন", d: "M2 7h20v10H2zM2 11h20M6 15h4" },
          { c: "#E77BA6", t: "সারা দেশে ডেলিভারি", s: "৬৪ জেলায় পৌঁছে যাই", d: "M1 3h15v13H1zM16 8h4l3 3v5h-7M5.5 18.5a2.5 2.5 0 105 0M18.5 18.5a2.5 2.5 0 105 0" },
          { c: "#9a7be0", t: "সহজ সাপোর্ট", s: "যেকোনো সময় পাশে আছি", d: "M21 15a2 2 0 0 1-2 2H8l-4 4V5a2 2 0 0 1 2-2h13a2 2 0 0 1 2 2z" },
        ].map((b, i) => (
          <div key={i} className="rounded-2xl bg-white ring-1 ring-black/5 p-4 text-center">
            <span className="mx-auto mb-2 grid place-items-center h-11 w-11 rounded-full" style={{ background: b.c + "1a", color: b.c }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d={b.d} /></svg>
            </span>
            <p className="text-[13px] font-semibold text-gray-900 leading-tight">{b.t}</p>
            <p className="text-[11px] text-gray-400 mt-0.5">{b.s}</p>
          </div>
        ))}
      </div>

      {/* Real customer reviews — social proof */}
      {reviews.length > 0 && (
        <>
          <SectionHead title="গ্রাহকরা যা বলছেন" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {reviews.slice(0, 6).map((r) => (
              <div key={r.id} className="rounded-2xl bg-white ring-1 ring-black/5 p-4">
                <div className="flex items-center gap-1 text-amber-400 text-sm">{"★".repeat(r.rating)}<span className="text-gray-200">{"★".repeat(5 - r.rating)}</span></div>
                <p className="mt-2 text-sm text-gray-700 leading-relaxed line-clamp-4">{r.body}</p>
                <div className="mt-3 flex items-center gap-2">
                  <span className="h-7 w-7 rounded-full bg-brand-soft text-brand-dark grid place-items-center text-xs font-bold">{(r.name || "?").charAt(0).toUpperCase()}</span>
                  <span className="text-xs">
                    <span className="font-semibold text-gray-900 block leading-tight">{r.name || "গ্রাহক"}</span>
                    {r.products?.slug && <a href={`/product/${r.products.slug}`} className="text-gray-400 hover:text-brand">{r.products.name_bn || r.products.name_en}</a>}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* For You — personalized recommendations with load-more */}
      {forYou.products.length > 0 && (
        <>
          <SectionHead title="আপনার জন্য" />
          <ForYou initial={forYou.products} initialHasMore={forYou.hasMore} pageSize={8} />
        </>
      )}

      {/* Newsletter */}
      <div className="mt-10">
        <NewsletterSignup source="home" />
      </div>

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
