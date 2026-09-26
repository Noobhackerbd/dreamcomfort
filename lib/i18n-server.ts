// lib/i18n-server.ts — read the current language in Server Components.
import { cookies } from "next/headers";
import { LANG_COOKIE, normalizeLang, pick, type Lang } from "@/lib/i18n";

export function getLang(): Lang {
  try {
    return normalizeLang(cookies().get(LANG_COOKIE)?.value);
  } catch {
    return "en";
  }
}

/** Returns { lang, L } for server components. L(en, bn) → the right string. */
export function getL(): { lang: Lang; L: (en: string, bn: string) => string } {
  const lang = getLang();
  return { lang, L: (en: string, bn: string) => pick(lang, en, bn) };
}
