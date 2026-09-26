import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans, Anek_Bangla } from "next/font/google";
import "./globals.css";
import { MetaPixel } from "@/components/MetaPixel";
import { TikTokPixel } from "@/components/TikTokPixel";
import { VisitTracker } from "@/components/VisitTracker";
import { ScrollTracker } from "@/components/ScrollTracker";
import { getMetaSettings, getStoreSettings, getTikTokSettings, getNavIcons, getPromoPopup } from "@/lib/settings";

// Self-hosted via next/font — no render-blocking Google Fonts request, auto-preloaded.
// Premium, modern type: geometric Jakarta for Latin/numbers, and Anek Bangla for
// Bangla — a contemporary, clean Bengali face with refined proportions that reads
// warmer and more premium than the earlier Hind Siliguri.
const display = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
  variable: "--font-display",
  display: "swap",
});
const notoBengali = Anek_Bangla({
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
import { CartDrawer } from "@/components/store/CartDrawer";
import { LoginModal } from "@/components/store/LoginModal";
import { PromoPopup } from "@/components/store/PromoPopup";
import { I18nProvider } from "@/components/i18n/I18nProvider";
import { T } from "@/components/i18n/T";
import { LANG_COOKIE } from "@/lib/i18n";

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
  const [landing, meta, store, tiktok, navIcons, promo] = await Promise.all([getLandingConfig(), getMetaSettings(), getStoreSettings(), getTikTokSettings(), getNavIcons(), getPromoPopup()]);
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
    <html lang="bn" suppressHydrationWarning className={`${display.variable} ${notoBengali.variable}`}>
      <head>
        {/* Pick the language BEFORE first paint (no flash, no server cookie read → pages
            stay cacheable at the edge). Default = Bengali. */}
        <script dangerouslySetInnerHTML={{ __html: `(function(){try{var m=document.cookie.match(/(?:^|; )${LANG_COOKIE}=(en|bn)/);var l=m?m[1]:"bn";var d=document.documentElement;d.setAttribute("data-lang",l);d.lang=l;}catch(e){}})();` }} />
        {/* Connect to Meta Pixel origin early → faster tracking load, better LCP/TBT. */}
        <link rel="preconnect" href="https://connect.facebook.net" crossOrigin="" />
        <link rel="dns-prefetch" href="https://connect.facebook.net" />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(orgJsonLd) }} />
      </head>
      <body className="min-h-screen antialiased flex flex-col">
        <I18nProvider>
        <a href="#main" className="dc-skip"><T en="Skip to main content" bn="মূল কন্টেন্টে যান" /></a>
        <HeaderGate>
          <Header logoUrl={landing.logoUrl || "/logo.png"} phone={store.phone} />
        </HeaderGate>

        <SiteMain>{children}</SiteMain>

        <HideOnAdmin>
        <footer className="mt-10 border-t border-black/5 bg-white/60">
          <div className="mx-auto max-w-6xl px-4 py-8 grid grid-cols-2 gap-x-6 gap-y-7 sm:gap-x-8 md:grid-cols-4 md:gap-8 text-[13px]">
            <div className="col-span-2 md:col-span-1">
              <a href="/" className="inline-flex items-center" aria-label={STORE_NAME}>
                <span className="font-display text-lg font-extrabold tracking-wide whitespace-nowrap">
                  <span className="text-brand">DREAM</span> <span className="text-accent">COMFORT</span>
                </span>
              </a>
              <p className="mt-2.5 text-gray-500 leading-relaxed max-w-[260px]">{STORE.tagline}</p>
            </div>
            <div>
              <p className="font-semibold mb-2"><T en="Shop" bn="শপ" /></p>
              <ul className="space-y-1 text-gray-500">
                <li><a href="/" className="hover:text-brand"><T en="Home" bn="হোম" /></a></li>
                <li><a href="/products" className="hover:text-brand"><T en="All Products" bn="সব পণ্য" /></a></li>
                <li><a href="/track-order" className="hover:text-brand"><T en="Track Order" bn="অর্ডার ট্র্যাক" /></a></li>
              </ul>
            </div>
            <div>
              <p className="font-semibold mb-2"><T en="Support" bn="সহায়তা" /></p>
              <ul className="space-y-1 text-gray-500">
                <li><a href="/about" className="hover:text-brand"><T en="About Us" bn="আমাদের সম্পর্কে" /></a></li>
                <li><a href="/contact" className="hover:text-brand"><T en="Contact" bn="যোগাযোগ" /></a></li>
                <li><a href="/return-policy" className="hover:text-brand"><T en="Return Policy" bn="রিটার্ন পলিসি" /></a></li>
                <li><a href="/privacy" className="hover:text-brand"><T en="Privacy" bn="প্রাইভেসি" /></a></li>
                <li><a href="/terms" className="hover:text-brand"><T en="Terms" bn="শর্তাবলী" /></a></li>
              </ul>
            </div>
            <div className="col-span-2 md:col-span-1">
              <p className="font-semibold mb-2"><T en="Contact" bn="যোগাযোগ" /></p>
              <ul className="space-y-1.5 text-gray-500">
                <li>📞 <a href={`tel:${STORE.phone}`} className="hover:text-brand">{STORE.phone}</a></li>
                <li>🌐 <a href={SITE_URL} className="hover:text-brand">DreamcomfortBD.com</a></li>
                <li>📍 {STORE.address}</li>
                <li><a href={STORE.facebook} className="hover:text-brand" rel="noopener" target="_blank">Facebook</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-black/5">
            <div className="mx-auto max-w-6xl px-4 py-4 text-xs text-gray-400">
              © {STORE_NAME} · <T en="All rights reserved" bn="সকল অধিকার সংরক্ষিত" />
            </div>
          </div>
        </footer>
        </HideOnAdmin>

        {/* Mobile bottom tab bar — storefront only (self-hides on admin/order/landing). */}
        <StorefrontTabBar categoryIcon={navIcons.category} />

        {/* Slide-out cart drawer (opens from the header cart icon / add-to-cart). */}
        <CartDrawer />

        {/* Login popup — opens when the account icon/tab is tapped. */}
        <LoginModal />

        {/* First-visit promo banner popup (admin-uploaded). Deferred — never blocks load. */}
        <PromoPopup enabled={promo.enabled} image={promo.image} link={promo.link || undefined} rev={promo.rev} />

        {/* Trackers only on the storefront — never on /admin (keeps visitor &
            Pixel data clean, no admin noise). */}
        <HideOnAdmin>
          <MetaPixel pixelId={meta.pixelId || undefined} />
          <TikTokPixel pixelId={tiktok.pixelId || undefined} />
          <VisitTracker />
          <ScrollTracker />
          <SourceTracker />
        </HideOnAdmin>
        </I18nProvider>
      </body>
    </html>
  );
}
