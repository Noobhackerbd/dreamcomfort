"use client";

// components/SiteChrome.tsx — route-aware chrome for the root layout.
// HideOnAdmin: renders storefront-only UI (header/footer) and trackers on the
// storefront, but NOT under /admin — so the admin is clean AND admin browsing is
// never counted as a store visit or sent to the Meta Pixel (cleaner tracking).

import { usePathname } from "next/navigation";
import { isLandingPath } from "@/lib/landing-routes";

export function HideOnAdmin({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || "";
  if (pathname.startsWith("/admin")) return null;
  return <>{children}</>;
}

// Header gate: no site header on /admin, on the thank-you pages (/order/*), or on any
// landing funnel — including variants like /baby-pillow, whose keys come from the root
// layout. Deciding it here means the header never reaches the HTML, so there is no
// flash of chrome that a client effect then removes.
export function HeaderGate({ children, landingKeys = [] }: { children: React.ReactNode; landingKeys?: string[] }) {
  const pathname = usePathname() || "";
  const hide =
    pathname.startsWith("/admin") ||
    pathname.startsWith("/order") ||
    isLandingPath(pathname, landingKeys);
  if (hide) return null;
  return <>{children}</>;
}

export function SiteMain({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || "";
  const isAdmin = pathname.startsWith("/admin");
  return (
    <main
      id="main"
      className={
        isAdmin
          ? "w-full flex-1 mx-auto max-w-[1400px] px-3 sm:px-5 lg:px-6 py-5"
          : "mx-auto max-w-6xl px-4 py-8 w-full flex-1"
      }
    >
      {children}
    </main>
  );
}
