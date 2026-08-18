// app/page.tsx — storefront homepage (default landing funnel).
import { getLandingConfig } from "@/lib/landing";
import { LandingScreen } from "@/components/funnel/LandingScreen";

export const dynamic = "force-dynamic";

export default async function HomePage({
  searchParams,
}: {
  searchParams?: { [key: string]: string | string[] | undefined };
}) {
  const config = await getLandingConfig();
  return <LandingScreen config={config} searchParams={searchParams} />;
}
