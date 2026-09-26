"use client";

import { createContext, useContext, useCallback } from "react";
import { useRouter } from "next/navigation";
import { LANG_COOKIE, pick, type Lang } from "@/lib/i18n";

const LangContext = createContext<Lang>("en");

export function I18nProvider({ lang, children }: { lang: Lang; children: React.ReactNode }) {
  return <LangContext.Provider value={lang}>{children}</LangContext.Provider>;
}

export function useLang(): Lang {
  return useContext(LangContext);
}

/** Client hook: returns { lang, L } where L(en, bn) → the right string. */
export function useL(): { lang: Lang; L: (en: string, bn: string) => string } {
  const lang = useContext(LangContext);
  const L = useCallback((en: string, bn: string) => pick(lang, en, bn), [lang]);
  return { lang, L };
}

/** Set the language cookie and re-render the whole app in that language. */
export function useSetLang(): (l: Lang) => void {
  const router = useRouter();
  return useCallback((l: Lang) => {
    try { document.cookie = `${LANG_COOKIE}=${l};path=/;max-age=31536000;samesite=lax`; } catch {}
    router.refresh();
  }, [router]);
}
