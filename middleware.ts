// middleware.ts
// 1) Sets Meta matching cookies at the EDGE on the first request (before any
//    client JS runs), so every browser + server event carries external_id,
//    _fbp, and _fbc → maximum Event Match Quality coverage.
// 2) Protects /admin routes (auth + allow-list).
// 3) Speed: rewrites /products?category=…, /products?q=… and landing ?color=… links to
//    dedicated routes so those pages are served from the edge cache. The visible URL
//    (and everything the Pixel/CAPI sees, e.g. fbclid) is unchanged.
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const YEAR2 = 63072000; // 2 years in seconds
const DAYS90 = 7776000; // 90 days in seconds

function ensureMatchCookie(
  req: NextRequest,
  res: NextResponse,
  name: string,
  makeValue: () => string,
  maxAge: number
) {
  if (req.cookies.get(name)) return;
  const value = makeValue();
  // Make it visible to this request's server code AND persist on the response
  // so the browser (and the Meta Pixel JS) can read/reuse it. Not HttpOnly on
  // purpose — the Pixel needs to read _fbp/_fbc/dc_xid from document.cookie.
  req.cookies.set(name, value);
  res.cookies.set(name, value, { path: "/", maxAge, sameSite: "lax", httpOnly: false });
}

function setMatchingCookies(req: NextRequest, res: NextResponse) {
  // Stable external id.
  ensureMatchCookie(req, res, "dc_xid", () => crypto.randomUUID(), YEAR2);
  // Facebook browser id (self-mint if the Pixel hasn't set one yet).
  ensureMatchCookie(
    req,
    res,
    "_fbp",
    () => `fb.1.${Date.now()}.${Math.floor(1e9 + Math.random() * 9e9)}`,
    DAYS90
  );
  // Facebook click id — only when this visit came from a Meta ad (fbclid present).
  const fbclid = req.nextUrl.searchParams.get("fbclid");
  if (fbclid) {
    ensureMatchCookie(req, res, "_fbc", () => `fb.1.${Date.now()}.${fbclid}`, DAYS90);
  }
}

// Top-level routes that are NOT landing pages (a landing variant is any other
// single-segment path, e.g. /landing2 — see app/[landingKey]).
const NON_LANDING = new Set([
  "about", "account", "admin", "api", "auth", "cart", "checkout", "contact", "help",
  "order", "privacy", "product", "products", "return-policy", "terms", "track-order", "worker",
  "sitemap.xml", "robots.txt", "manifest.webmanifest", "icon.png", "apple-icon.png",
]);

/** /landing?color=slug (and /landing2?color=…) → cached per-color route. */
function landingRewrite(req: NextRequest): NextResponse | null {
  const segs = req.nextUrl.pathname.split("/").filter(Boolean);
  if (segs.length !== 1 || NON_LANDING.has(segs[0])) return null;
  const sp = req.nextUrl.searchParams;
  // Same precedence LandingScreen uses: color → product → slug.
  const v = (sp.get("color") ?? sp.get("product") ?? sp.get("slug") ?? "").trim();
  if (!v) return null;
  const url = req.nextUrl.clone();
  url.pathname = `/${segs[0]}/c/${encodeURIComponent(v)}`;
  for (const k of ["color", "product", "slug"]) url.searchParams.delete(k); // fbclid/utm kept
  return NextResponse.rewrite(url, { request: req });
}

/** Internal rewrites for the product listing (visible URL stays /products?…). */
function storeRewrite(req: NextRequest): NextResponse | null {
  if (req.nextUrl.pathname !== "/products") return landingRewrite(req);
  const sp = req.nextUrl.searchParams;
  const url = req.nextUrl.clone();
  // Text search / custom sort → live search route.
  if ((sp.get("q") || "").trim() || sp.get("sort")) {
    url.pathname = "/products/search";
    return NextResponse.rewrite(url, { request: req });
  }
  // Category → cached per-category page. Other params (fbclid, utm_…) are kept.
  const cat = (sp.get("category") || "").trim();
  if (cat) {
    url.pathname = `/products/c/${encodeURIComponent(cat)}`;
    url.searchParams.delete("category");
    return NextResponse.rewrite(url, { request: req });
  }
  return null;
}

export async function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;

  // Storefront: seed the matching cookies (no auth work) — on rewritten requests too.
  if (!path.startsWith("/admin")) {
    const res = storeRewrite(req) ?? NextResponse.next({ request: req });
    setMatchingCookies(req, res);
    return res;
  }

  const res = NextResponse.next({ request: req });

  // Admin: auth + allow-list.
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            req.cookies.set(name, value);
            res.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isLogin = path.startsWith("/admin/login");
  if (!isLogin) {
    if (!user) {
      return NextResponse.redirect(new URL("/admin/login", req.url));
    }
    const allow = (process.env.ADMIN_ALLOWED_EMAILS || "")
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);
    if (allow.length && (!user.email || !allow.includes(user.email.toLowerCase()))) {
      return NextResponse.redirect(new URL("/admin/login?denied=1", req.url));
    }
  }

  return res;
}

export const config = {
  // Run on all pages + API routes, but skip Next static assets and files.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\.(?:png|jpg|jpeg|gif|webp|avif|svg|ico|css|js|txt|woff|woff2)).*)",
  ],
};
