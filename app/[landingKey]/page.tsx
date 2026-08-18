// app/[landingKey]/page.tsx — extra landing pages (e.g. /landing2). Same design as
// the homepage; only the featured products differ. Any non-variant path 404s, and
// all real routes (/cart, /admin, /product, …) take precedence over this segment.
import { notFound } from "next/navigation";
import { getLandingConfigForVariant } from "@/lib/landing";
import { LandingScreen } from "@/components/funnel/LandingScreen";

export const dynamic = "force-dynamic";

export default async function LandingVariantPage({
  params,
  searchParams,
}: {
  params: { landingKey: string };
  searchParams?: { [key: string]: string | string[] | undefined };
}) {
  const config = await getLandingConfigForVariant(params.landingKey);
  if (!config) notFound();
  return <LandingScreen config={config} searchParams={searchParams} />;
}
