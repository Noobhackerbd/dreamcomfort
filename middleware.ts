// middleware.ts
// 1) Sets Meta matching cookies at the EDGE on the first request (before any
//    client JS runs), so every browser + server event carries external_id,
//    _fbp, and _fbc → maximum Event Match Quality coverage.
// 2) Protects /admin routes (auth + allow-list).
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

export async function middleware(req: NextRequest) {
  const res = NextResponse.next({ request: req });
  const path = req.nextUrl.pathname;

  // Storefront: just seed the matching cookies (no auth work).
  if (!path.startsWith("/admin")) {
    setMatchingCookies(req, res);
    return res;
  }

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
