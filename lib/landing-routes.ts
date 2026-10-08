// lib/landing-routes.ts — which URLs are landing funnels?
//
// Landing pages are single-purpose: no site header, no bottom tab bar, no promo popup.
// Those three used to hardcode `pathname.startsWith("/landing")`, so a landing *variant*
// like /baby-pillow rendered them on the server and a client effect hid them a moment
// later — a visible flash of chrome on every visit. They now share this check, with the
// real variant keys passed down from the root layout, so the chrome is never rendered.
//
// Pure + client-safe: no imports, no server-only code.

/** Routes that are never a landing page, even as a single path segment. */
const NON_LANDING = new Set([
  "about", "account", "admin", "api", "auth", "cart", "checkout", "contact", "help",
  "order", "privacy", "product", "products", "return-policy", "terms", "track-order", "worker",
]);

/**
 * True for `/landing`, `/landing/c/<colour>`, `/<key>` and `/<key>/c/<colour>`.
 * `keys` are the landing variant keys from Admin → Landing page.
 */
export function isLandingPath(pathname: string, keys: readonly string[] = []): boolean {
  const seg = (pathname || "").split("/").filter(Boolean);
  if (!seg.length) return false; // "/" is the store homepage
  const first = seg[0].toLowerCase();
  if (NON_LANDING.has(first)) return false;
  if (first === "landing") return true;
  return keys.some((k) => k.toLowerCase() === first);
}
