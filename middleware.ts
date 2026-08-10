// middleware.ts — protects /admin routes. Redirects to login if not signed in,
// and blocks anyone whose email is not in ADMIN_ALLOWED_EMAILS.
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(req: NextRequest) {
  const res = NextResponse.next({ request: req });

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

  const path = req.nextUrl.pathname;
  const isLogin = path.startsWith("/admin/login");

  if (path.startsWith("/admin") && !isLogin) {
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
  matcher: ["/admin/:path*"],
};
