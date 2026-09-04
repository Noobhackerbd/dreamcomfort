// app/landing/page.tsx — the single-product sales funnel (moved off the root homepage).
// Same design as before; the root "/" is now the store homepage. Use /landing (and
// /landing?color=slug) in ads. Header is auto-hidden via the dc-landing body class.
import { getLandingConfig } from "@/lib/landing";
import { LandingScreen } from "@/components/funnel/LandingScreen";

export const dynamic = "force-dynamic";

export default async function LandingPage({
  searchParams,
}: {
  searchParams?: { [key: string]: string | string[] | undefined };
}) {
  const config = await getLandingConfig();
  return <LandingScreen config={config} searchParams={searchParams} />;
}
