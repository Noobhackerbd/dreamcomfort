import { getHomeBanners } from "@/lib/settings";
import { BannerManager } from "./BannerManager";

export const dynamic = "force-dynamic";

export default async function AdminHomePage() {
  const banners = await getHomeBanners();
  return (
    <div>
      <h1 className="text-2xl font-bold mb-1">Home page</h1>
      <p className="text-sm dc-muted mb-5">Manage the store homepage (dreamcomfortbd.com) banners. The hero is an auto-slider — upload wide banner images (text baked into the image). The sales funnel lives at <a href="/landing" className="underline" style={{ color: "var(--a-brand)" }}>/landing</a>.</p>
      <BannerManager initial={banners} />
    </div>
  );
}
