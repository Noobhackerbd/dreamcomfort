import { HeaderIcons } from "@/components/store/HeaderIcons";
import { PredictiveSearch } from "@/components/store/PredictiveSearch";
import { ImageSearchButton } from "@/components/store/ImageSearchButton";
import { HeaderMenu } from "@/components/store/HeaderMenu";
import { AccountButton } from "@/components/store/AccountButton";

// Slim storefront header: wordmark + search + (desktop) menu & account + image-search + cart.
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

        <div className="flex items-center gap-0.5 sm:gap-1 shrink-0 sm:ml-auto">
          <HeaderMenu />
          <AccountButton className="hidden md:grid place-items-center h-9 w-9 rounded-full text-gray-700 hover:bg-black/5 transition" />
          <ImageSearchButton />
          <HeaderIcons />
        </div>
      </div>
    </header>
  );
}
