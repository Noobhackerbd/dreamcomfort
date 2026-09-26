"use client";

// Cookie-free language state for Client Components.
//
// The active language lives on <html data-lang="en|bn">, set before first paint by
// the inline script in app/layout.tsx (from the `dc_lang` cookie). Visible text uses
// <T/> (CSS-switched, correct from the very first paint). These hooks are for the
// things CSS can't switch — attributes (placeholder, aria-label, alt) and strings
// built in JS (error messages, toasts). During hydration they report the server
// value ("bn"), then immediately update to the real language — no mismatch errors.
import { useCallback, useEffect, useLayoutEffect, useSyncExternalStore } from "react";
import { LANG_COOKIE, pick, type Lang } from "@/lib/i18n";

const useIsoLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

const EVT = "dc:lang";

function subscribe(cb: () => void) {
  window.addEventListener(EVT, cb);
  return () => window.removeEventListener(EVT, cb);
}
function getSnapshot(): Lang {
  return document.documentElement.getAttribute("data-lang") === "en" ? "en" : "bn";
}
function getServerSnapshot(): Lang {
  return "bn"; // default language
}

/**
 * Mounted once in the root layout. The language is chosen by the inline <head>
 * script; this is a safety net: if React ever re-renders <html> (e.g. after a
 * hydration error somewhere on the page), re-apply the language before paint.
 */
export function I18nProvider({ children }: { lang?: Lang; children: React.ReactNode }) {
  useIsoLayoutEffect(() => {
    try {
      const m = document.cookie.match(new RegExp(`(?:^|; )${LANG_COOKIE}=(en|bn)`));
      const want = m ? m[1] : "bn";
      const d = document.documentElement;
      if ((d.getAttribute("data-lang") || "bn") !== want || !d.hasAttribute("data-lang")) {
        d.setAttribute("data-lang", want);
        d.lang = want;
        window.dispatchEvent(new Event(EVT));
      }
    } catch {}
  }, []);
  return <>{children}</>;
}

export function useLang(): Lang {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

/** Client hook: returns { lang, L } where L(en, bn) → the right string. */
export function useL(): { lang: Lang; L: (en: string, bn: string) => string } {
  const lang = useLang();
  const L = useCallback((en: string, bn: string) => pick(lang, en, bn), [lang]);
  return { lang, L };
}

/**
 * Switch language instantly: saves the cookie, flips <html data-lang> (CSS swaps
 * every <T/> immediately) and notifies hooks so attributes/strings update too.
 * No page reload and no server round-trip.
 */
export function useSetLang(): (l: Lang) => void {
  return useCallback((l: Lang) => {
    try { document.cookie = `${LANG_COOKIE}=${l};path=/;max-age=31536000;samesite=lax`; } catch {}
    const d = document.documentElement;
    d.setAttribute("data-lang", l);
    d.lang = l;
    window.dispatchEvent(new Event(EVT));
  }, []);
}
