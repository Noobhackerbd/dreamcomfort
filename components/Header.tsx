import { HeaderIcons } from "@/components/store/HeaderIcons";
import { PredictiveSearch } from "@/components/store/PredictiveSearch";
import { ImageSearchButton } from "@/components/store/ImageSearchButton";
import { HeaderMenu } from "@/components/store/HeaderMenu";
import { AccountButton } from "@/components/store/AccountButton";
import { HeaderScroll } from "@/components/store/HeaderScroll";

// Slim storefront header: wordmark + search + (desktop) menu & account + image-search + cart.
// Premium sticky behaviour: a light frosted bar at the top of the page that turns
// solid white with a soft lift-shadow once the page scrolls. The scrolled state is a
// plain data-attribute toggled by a passive rAF scroll listener (HeaderScroll) — no
// React re-render per frame — and the bar is promoted to its own compositor layer so
// it isn't repainted as content scrolls beneath it. Fast on mobile, premium at rest.
export function Header(_props: { logoUrl?: string; phone?: string }) {
  return (
    <header
      className="site-header sticky top-0 z-40 h-14 border-b border-transparent bg-cream/70 backdrop-blur-sm
                 [transform:translateZ(0)] transition-[background-color,box-shadow,border-color] duration-300 ease-out
                 data-[scrolled=true]:bg-white/80 data-[scrolled=true]:border-black/[0.06]
                 data-[scrolled=true]:shadow-[0_8px_28px_-16px_rgba(20,40,70,0.35)]"
    >
      <div className="mx-auto max-w-6xl px-3 sm:px-4 h-full flex items-center gap-1.5 sm:gap-3">
        <a href="/" className="flex items-center shrink-0 group" aria-label="DREAM COMFORT">
          <span className="font-display text-[15px] sm:text-xl font-extrabold tracking-wide whitespace-nowrap origin-left transition-transform duration-200 group-hover:scale-[1.03]">
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

      <HeaderScroll />
    </header>
  );
}
