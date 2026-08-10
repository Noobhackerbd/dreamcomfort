import type { Metadata, Viewport } from "next";
import Image from "next/image";
import { Fredoka, Noto_Sans_Bengali } from "next/font/google";
import "./globals.css";
import { MetaPixel } from "@/components/MetaPixel";

// Self-hosted via next/font — no render-blocking Google Fonts request, auto-preloaded.
const fredoka = Fredoka({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-fredoka",
  display: "swap",
});
const notoBengali = Noto_Sans_Bengali({
  subsets: ["bengali"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-bengali",
  display: "swap",
});
import { Header } from "@/components/Header";
import { STORE, STORE_NAME } from "@/lib/config";
import { getLandingConfig } from "@/lib/landing";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://dreamcomfortbd.com";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
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
  const landing = await getLandingConfig();
  return (
    <html lang="bn" className={`${fredoka.variable} ${notoBengali.variable}`}>
      <head>
        <link rel="preconnect" href="https://zsmcmofuiteovgvjaeds.supabase.co" crossOrigin="" />
      </head>
      <body className="min-h-screen antialiased flex flex-col">
        <Header logoUrl={landing.logoUrl || "/logo.png"} />

        <main className="mx-auto max-w-6xl px-4 py-8 w-full flex-1">{children}</main>

        <footer className="mt-16 border-t border-black/5 bg-white/60">
          <div className="mx-auto max-w-6xl px-4 py-10 grid gap-8 md:grid-cols-4 text-sm">
            <div>
              <Image src={landing.logoUrl || "/logo.png"} alt={STORE_NAME} width={180} height={64} sizes="180px" className="h-16 w-auto object-contain" />
              <p className="mt-3 text-gray-500">{STORE.tagline}</p>
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

        <MetaPixel />
      </body>
    </html>
  );
}
