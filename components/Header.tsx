import Image from "next/image";
import { STORE_NAME } from "@/lib/config";
import { HeaderIcons } from "@/components/store/HeaderIcons";

// Storefront header: logo + call-to-order button + account & cart icons.
export function Header({ logoUrl, phone }: { logoUrl?: string; phone?: string }) {
  const tel = (phone || "").replace(/[^\d+]/g, "");

  return (
    <header className="site-header sticky top-0 z-40 bg-cream/90 backdrop-blur border-b border-black/5">
      <div className="mx-auto max-w-6xl px-3 sm:px-4 h-16 flex items-center justify-between gap-2">
        <a href="/" className="flex items-center gap-2 min-w-0">
          {logoUrl ? (
            <Image
              src={logoUrl}
              alt={STORE_NAME}
              width={160}
              height={40}
              priority
              sizes="160px"
              className="h-9 sm:h-10 w-auto object-contain"
            />
          ) : (
            <span className="font-display text-lg sm:text-xl font-bold whitespace-nowrap">
              <span className="text-brand">DREAM</span> <span className="text-accent">COMFORT</span>
            </span>
          )}
        </a>

        <div className="flex items-center gap-1.5">
          {tel ? (
            <a
              href={`tel:${tel}`}
              className="inline-flex items-center gap-2 rounded-full bg-brand text-white px-3.5 sm:px-4 py-2 text-sm font-medium shadow-sm hover:bg-brand-dark transition-colors whitespace-nowrap"
            >
              <span aria-hidden>📞</span>
              <span className="hidden sm:inline">অর্ডার করতে কল করুন</span>
              <span className="hidden sm:inline tabular-nums font-semibold">{phone}</span>
            </a>
          ) : null}
          <HeaderIcons />
        </div>
      </div>
    </header>
  );
}
