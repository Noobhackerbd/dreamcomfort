// app/[landingKey]/page.tsx — extra landing pages (e.g. /landing2, /baby-pillow).
// Each variant picks its own products, its own delivery charge and its own design
// theme in Admin → Landing page. Any non-variant path 404s, and all real routes
// (/cart, /admin, /product, …) take precedence over this segment.
//
// Speed: served from the edge cache and pre-built at deploy. /landing2?color=slug is
// rewritten by middleware.ts to /landing2/c/slug (also cached); visible URL unchanged.
import { notFound } from "next/navigation";
import { getLandingVariantPage, getLandingVariants } from "@/lib/landing";
import { LandingScreen } from "@/components/funnel/LandingScreen";
import { BeeLandingScreen } from "@/components/funnel/BeeLandingScreen";

export const revalidate = 60;
export const dynamicParams = true;

export async function generateStaticParams() {
  try {
    const variants = await getLandingVariants();
    return variants.map((v) => ({ landingKey: v.key }));
  } catch {
    return [];
  }
}

export default async function LandingVariantPage({ params }: { params: { landingKey: string } }) {
  const page = await getLandingVariantPage(params.landingKey);
  if (!page) notFound();
  if (page.variant.theme === "bee") return <BeeLandingScreen config={page.config} />;
  return <LandingScreen config={page.config} />;
}
