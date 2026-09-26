// app/landing/page.tsx — the single-product sales funnel (moved off the root homepage).
// Same design as before; the root "/" is now the store homepage. Use /landing (and
// /landing?color=slug) in ads. Header is auto-hidden via the dc-landing body class.
//
// Speed: served from the edge cache. /landing?color=slug is rewritten by middleware.ts
// to /landing/c/slug (also cached) — the visible URL, fbclid and Pixel/CAPI are unchanged.
import { getLandingConfig } from "@/lib/landing";
import { LandingScreen } from "@/components/funnel/LandingScreen";

export const revalidate = 60;

export default async function LandingPage() {
  const config = await getLandingConfig();
  return <LandingScreen config={config} />;
}
