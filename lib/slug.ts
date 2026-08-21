// lib/slug.ts — URL slug helper. Guarantees an English/ASCII slug even from a Bengali
// product name (transliterates Bengali → Latin), so ?color=<slug> deep links always
// work in Facebook ads and are easy to read/type.

const BN_MAP: Record<string, string> = {
  // independent vowels
  অ: "o", আ: "a", ই: "i", ঈ: "i", উ: "u", ঊ: "u", ঋ: "ri",
  এ: "e", ঐ: "oi", ও: "o", ঔ: "ou",
  // consonants
  ক: "k", খ: "kh", গ: "g", ঘ: "gh", ঙ: "ng",
  চ: "ch", ছ: "chh", জ: "j", ঝ: "jh", ঞ: "n",
  ট: "t", ঠ: "th", ড: "d", ঢ: "dh", ণ: "n",
  ত: "t", থ: "th", দ: "d", ধ: "dh", ন: "n",
  প: "p", ফ: "ph", ব: "b", ভ: "bh", ম: "m",
  য: "j", র: "r", ল: "l", শ: "sh", ষ: "sh", স: "s", হ: "h",
  ড়: "r", ঢ়: "rh", য়: "y", ৎ: "t",
  // vowel signs (matra)
  "া": "a", "ি": "i", "ী": "i", "ু": "u", "ূ": "u", "ৃ": "ri",
  "ে": "e", "ৈ": "oi", "ো": "o", "ৌ": "ou",
  // marks
  "ং": "ng", "ঃ": "h", "ঁ": "", "্": "",
  // digits
  "০": "0", "১": "1", "২": "2", "৩": "3", "৪": "4",
  "৫": "5", "৬": "6", "৭": "7", "৮": "8", "৯": "9",
};

/** Transliterate any Bengali characters in the string to Latin. Non-Bengali chars pass through. */
export function transliterateBnToEn(input: string): string {
  return String(input || "")
    .split("")
    .map((ch) => (ch in BN_MAP ? BN_MAP[ch] : ch))
    .join("");
}

/**
 * Build a clean, English/ASCII-only slug. Bengali is transliterated first, then anything
 * that isn't [a-z0-9] becomes a dash. Returns "" if nothing usable remains (callers add a
 * fallback such as `product-<random>`).
 */
export function toSlug(input: string): string {
  return transliterateBnToEn(input)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
