// components/i18n/T.tsx — bilingual text that needs NO server cookie read.
//
// Renders both languages; CSS shows the right one based on <html data-lang>, which
// a tiny inline script sets from the `dc_lang` cookie BEFORE first paint (see
// app/layout.tsx). Because the HTML is identical for every visitor, pages can be
// served straight from the edge cache — and switching language is instant (no
// reload, no server round-trip). Works in both Server and Client Components.
//
//   <T en="Add to cart" bn="কার্টে যোগ করুন" />
//
// For attributes (placeholder, aria-label, alt, title) use the useL() hook instead —
// attributes can't be toggled with CSS.
import type { ReactNode } from "react";

export function T({ en, bn }: { en: ReactNode; bn: ReactNode }) {
  return (
    <>
      <span data-l="bn">{bn}</span>
      <span data-l="en">{en}</span>
    </>
  );
}
