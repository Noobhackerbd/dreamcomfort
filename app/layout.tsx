import type { Metadata, Viewport } from "next";
import Image from "next/image";
import { Plus_Jakarta_Sans, Hind_Siliguri } from "next/font/google";
import "./globals.css";
import { MetaPixel } from "@/components/MetaPixel";
import { TikTokPixel } from "@/components/TikTokPixel";
import { VisitTracker } from "@/components/VisitTracker";
import { ScrollTracker } from "@/components/ScrollTracker";
import { getMetaSettings, getStoreSettings, getTikTokSettings, getNavIcons } from "@/lib/settings";

// Self-hosted via next/font — no render-blocking Google Fonts request, auto-preloaded.
// Premium, serious type: geometric Jakarta for Latin/numbers, clean Hind Siliguri for
// Bangla (matches the admin panel) — replaces the earlier playful, rounded Fredoka.
const display = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
  variable: "--font-display",
  display: "swap",
});
const notoBengali = Hind_Siliguri({
  subsets: ["bengali", "latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-bengali",
  display: "swap",
});
import { Header } from "@/components/Header";
import { HideOnAdmin, HeaderGate, SiteMain } from "@/components/SiteChrome";
import { STORE, STORE_NAME } from "@/lib/config";
import { getLandingConfig } from "@/lib/landing";
import { StorefrontTabBar } from "@/components/store/StorefrontTabBar";
import { SourceTracker } from "@/components/SourceTracker";
import { SupportFab } from "@/components/store/SupportFab";
import { CartDrawer } from "@/components/store/CartDrawer";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://dreamcomfortbd.com";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  manifest: "/manifest.webmanifest",
  title: {
    default: `${STORE_NAME} — ${STORE.tagline}`,
    template: `%s — ${STORE_NAME}`,
  },
  description:
    "মা ও শিশুর জন্য আরামদায়ক প্রিমিয়াম পণ্য। প্রেগন্যান্সি পিলো, বেবি কেয়ার ও আরও। সারা বাংলাদেশে ক্যাশ অন ডেলিভারি।",
  openGraph: { siteName: STORE_NAME, locale: "bn_BD", type: "website" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#FBF3EA",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [landing, meta, store, tiktok, navIcons] = await Promise.all([getLandingConfig(), getMetaSettings(), getStoreSettings(), getTikTokSettings(), getNavIcons()]);
  const orgJsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        name: STORE_NAME,
        url: SITE_URL,
        logo: `${SITE_URL}${landing.logoUrl || "/logo.png"}`,
        ...(store.phone ? { contactPoint: { "@type": "ContactPoint", telephone: store.phone, contactType: "customer service", areaServed: "BD" } } : {}),
        ...(store.facebook ? { sameAs: [store.facebook] } : {}),
      },
      { "@type": "WebSite", name: STORE_NAME, url: SITE_URL },
    ],
  };
  return (
    <html lang="bn" className={`${display.variable} ${notoBengali.variable}`}>
      <head>
        {/* Connect to Meta Pixel origin early → faster tracking load, better LCP/TBT. */}
        <link rel="preconnect" href="https://connect.facebook.net" crossOrigin="" />
        <link rel="dns-prefetch" href="https://connect.facebook.net" />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(orgJsonLd) }} />
      </head>
      <body className="min-h-screen antialiased flex flex-col">
        <a href="#main" className="dc-skip">মূল কন্টেন্টে যান</a>
        <HeaderGate>
          <Header logoUrl={landing.logoUrl || "/logo.png"} phone={store.phone} />
        </HeaderGate>

        <SiteMain>{children}</SiteMain>

        <HideOnAdmin>
        <footer className="mt-10 border-t border-black/5 bg-white/60">
          <div className="mx-auto max-w-6xl px-4 py-6 grid grid-cols-2 gap-x-4 gap-y-5 md:grid-cols-4 md:gap-8 text-[13px]">
            <div className="col-span-2 md:col-span-1">
              <Image src={landing.logoUrl || "/logo.png"} alt={STORE_NAME} width={180} height={64} sizes="150px" className="h-11 w-auto object-contain" />
              <p className="mt-2 text-gray-500">{STORE.tagline}</p>
            </div>
            <div>
              <p className="font-semibold mb-2">শপ</p>
              <ul className="space-y-1 text-gray-500">
                <li><a href="/" className="hover:text-brand">হোম</a></li>
                <li><a href="/products" className="hover:text-brand">সব পণ্য</a></li>
                <li><a href="/track-order" className="hover:text-brand">অর্ডার ট্র্যাক</a></li>
              </ul>
            </div>
            <div>
              <p className="font-semibold mb-2">সহায়তা</p>
              <ul className="space-y-1 text-gray-500">
                <li><a href="/about" className="hover:text-brand">আমাদের সম্পর্কে</a></li>
                <li><a href="/contact" className="hover:text-brand">যোগাযোগ</a></li>
                <li><a href="/return-policy" className="hover:text-brand">রিটার্ন পলিসি</a></li>
                <li><a href="/privacy" className="hover:text-brand">প্রাইভেসি</a></li>
                <li><a href="/terms" className="hover:text-brand">শর্তাবলী</a></li>
              </ul>
            </div>
            <div>
              <p className="font-semibold mb-2">যোগাযোগ</p>
              <ul className="space-y-1 text-gray-500">
                <li>📞 <a href={`tel:${STORE.phone}`} className="hover:text-brand">{STORE.phone}</a></li>
                <li>🌐 <a href={SITE_URL} className="hover:text-brand">DreamcomfortBD.com</a></li>
                <li>📍 {STORE.address}</li>
                <li><a href={STORE.facebook} className="hover:text-brand" rel="noopener" target="_blank">Facebook</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-black/5">
            <div className="mx-auto max-w-6xl px-4 py-4 text-xs text-gray-400">
              © {STORE_NAME} · সকল অধিকার সংরক্ষিত
            </div>
          </div>
        </footer>
        </HideOnAdmin>

        {/* Mobile bottom tab bar — storefront only (self-hides on admin/order/landing). */}
        <StorefrontTabBar categoryIcon={navIcons.category} />

        {/* Slide-out cart drawer (opens from the header cart icon / add-to-cart). */}
        <CartDrawer />

        {/* Elegant floating support button — storefront only (self-hides elsewhere). */}
        <SupportFab phone={store.phone} facebook={STORE.facebook} />

        {/* Trackers only on the storefront — never on /admin (keeps visitor &
            Pixel data clean, no admin noise). */}
        <HideOnAdmin>
          <MetaPixel pixelId={meta.pixelId || undefined} />
          <TikTokPixel pixelId={tiktok.pixelId || undefined} />
          <VisitTracker />
          <ScrollTracker />
          <SourceTracker />
        </HideOnAdmin>
      </body>
    </html>
  );
}
