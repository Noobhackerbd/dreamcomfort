// app/landing/c/[color]/page.tsx — /landing?color=slug (product pre-selected), cached.
// Shoppers never see this path: middleware.ts rewrites /landing?color=… here.
import { getLandingConfig } from "@/lib/landing";
import { LandingScreen } from "@/components/funnel/LandingScreen";

export const revalidate = 60;
export const dynamicParams = true;

export async function generateStaticParams() {
  return []; // built on first visit per color, then served from the cache
}

export default async function LandingColorPage({ params }: { params: { color: string } }) {
  const config = await getLandingConfig();
  return <LandingScreen config={config} searchParams={{ color: decodeURIComponent(params.color) }} />;
}
