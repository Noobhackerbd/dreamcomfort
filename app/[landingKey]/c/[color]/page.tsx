// app/[landingKey]/c/[color]/page.tsx — /landing2?color=slug (product pre-selected), cached.
// Shoppers never see this path: middleware.ts rewrites /<variant>?color=… here.
import { notFound } from "next/navigation";
import { getLandingConfigForVariant } from "@/lib/landing";
import { LandingScreen } from "@/components/funnel/LandingScreen";

export const revalidate = 60;
export const dynamicParams = true;

export async function generateStaticParams() {
  return []; // built on first visit per color, then served from the cache
}

export default async function LandingVariantColorPage({ params }: { params: { landingKey: string; color: string } }) {
  const config = await getLandingConfigForVariant(params.landingKey);
  if (!config) notFound();
  return <LandingScreen config={config} searchParams={{ color: decodeURIComponent(params.color) }} />;
}
