// lib/i18n.ts — tiny bilingual (English / Bengali) helper shared by server & client.
// Default language is English. Language is stored in the `dc_lang` cookie ("en" | "bn").
// Usage keeps both strings colocated so nothing is ever left untranslated:
//   L("Add to cart", "কার্টে যোগ করুন")
// Landing pages, the thank-you/order page and the admin panel do NOT use this — they
// stay in their original language regardless of the cookie.

export type Lang = "en" | "bn";

export const LANG_COOKIE = "dc_lang";

export function normalizeLang(v: string | undefined | null): Lang {
  return v === "bn" ? "bn" : "en"; // default English
}

/** Pick the right string for a language. */
export function pick(lang: Lang, en: string, bn: string): string {
  return lang === "bn" ? bn : en;
}
