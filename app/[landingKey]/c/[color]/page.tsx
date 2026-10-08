// app/[landingKey]/c/[color]/page.tsx — /landing2?color=slug (product pre-selected), cached.
// Shoppers never see this path: middleware.ts rewrites /<variant>?color=… here.
import { notFound } from "next/navigation";
import { getLandingVariantPage } from "@/lib/landing";
import { LandingScreen } from "@/components/funnel/LandingScreen";
import { BeeLandingScreen } from "@/components/funnel/BeeLandingScreen";

export const revalidate = 60;
export const dynamicParams = true;

export async function generateStaticParams() {
  return []; // built on first visit per color, then served from the cache
}

export default async function LandingVariantColorPage({ params }: { params: { landingKey: string; color: string } }) {
  const page = await getLandingVariantPage(params.landingKey);
  if (!page) notFound();
  const searchParams = { color: decodeURIComponent(params.color) };
  if (page.variant.theme === "bee") return <BeeLandingScreen config={page.config} searchParams={searchParams} />;
  return <LandingScreen config={page.config} searchParams={searchParams} />;
}
