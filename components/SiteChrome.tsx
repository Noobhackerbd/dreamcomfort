"use client";

// components/SiteChrome.tsx — route-aware chrome for the root layout.
// HideOnAdmin: renders storefront-only UI (header/footer) and trackers on the
// storefront, but NOT under /admin — so the admin is clean AND admin browsing is
// never counted as a store visit or sent to the Meta Pixel (cleaner tracking).

import { usePathname } from "next/navigation";

export function HideOnAdmin({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || "";
  if (pathname.startsWith("/admin")) return null;
  return <>{children}</>;
}

// Header gate: no site header on /admin, on the thank-you pages (/order/*), or on
// the homepage landing funnel. Landing *variants* (/landing2, …) additionally hide
// it via the `body.dc-landing header.site-header` CSS rule (LandingBodyClass).
export function HeaderGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || "";
  // The store homepage ("/") now shows the header. It's hidden on admin, on the
  // thank-you pages, and on the landing funnel (/landing, /landing2, …) — those also
  // hide it via the body.dc-landing CSS rule (belt and suspenders).
  const hide =
    pathname.startsWith("/admin") ||
    pathname.startsWith("/order") ||
    pathname.startsWith("/landing");
  if (hide) return null;
  return <>{children}</>;
}

export function SiteMain({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || "";
  const isAdmin = pathname.startsWith("/admin");
  return (
    <main
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
