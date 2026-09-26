import { getHomeBanners, getFlashSale, getHomeStrip, getFeatured, getPromoPopup } from "@/lib/settings";
import { getServerSupabase } from "@/lib/supabase/server";
import type { Product } from "@/lib/types";
import { BannerManager } from "./BannerManager";
import { FlashSaleManager } from "./FlashSaleManager";
import { StripManager } from "./StripManager";
import { PromoPopupManager } from "./PromoPopupManager";
import { FeaturedManager } from "./FeaturedManager";

export const dynamic = "force-dynamic";

export default async function AdminHomePage() {
  const supabase = getServerSupabase();
  const [banners, flash, strip, featured, promo, { data: prods }] = await Promise.all([
    getHomeBanners(),
    getFlashSale(),
    getHomeStrip(),
    getFeatured(),
    getPromoPopup(),
    supabase.from("products").select("id, name_bn, name_en, images, price").eq("is_active", true).order("created_at", { ascending: false }),
  ]);
  const products = ((prods as Product[]) ?? []).map((p) => ({
    id: p.id,
    name: p.name_bn || p.name_en,
    image: p.images?.[0],
    price: p.price,
  }));

  return (
    <div>
      <h1 className="text-2xl font-bold mb-1">Home page</h1>
      <p className="text-sm dc-muted mb-5">Manage the store homepage (dreamcomfortbd.com) banners &amp; flash sale. The hero is an auto-slider — upload wide banner images (text baked into the image). The sales funnel lives at <a href="/landing" className="underline" style={{ color: "var(--a-brand)" }}>/landing</a>.</p>
      <BannerManager initial={banners} />
      <PromoPopupManager initial={promo} />
      <StripManager initial={strip} />
      <FeaturedManager initial={featured} products={products} />
      <FlashSaleManager initial={flash} products={products} />
    </div>
  );
}
