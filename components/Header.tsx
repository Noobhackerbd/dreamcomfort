import { HeaderIcons } from "@/components/store/HeaderIcons";
import { PredictiveSearch } from "@/components/store/PredictiveSearch";
import { ImageSearchButton } from "@/components/store/ImageSearchButton";

// Slim storefront header: wordmark + search field + image-search + cart.
export function Header(_props: { logoUrl?: string; phone?: string }) {
  return (
    <header className="site-header sticky top-0 z-40 bg-cream/90 backdrop-blur border-b border-black/5">
      <div className="mx-auto max-w-6xl px-3 sm:px-4 h-14 flex items-center gap-1.5 sm:gap-3">
        <a href="/" className="flex items-center shrink-0">
          <span className="font-display text-[15px] sm:text-xl font-extrabold tracking-wide whitespace-nowrap">
            <span className="text-brand">DREAM</span> <span className="text-accent">COMFORT</span>
          </span>
        </a>

        <PredictiveSearch />

        <ImageSearchButton />

        <HeaderIcons />
      </div>
    </header>
  );
}
