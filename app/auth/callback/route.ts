// app/auth/callback/route.ts — OAuth (Google/Facebook) + magic-link callback.
// Exchanges the provider code for a Supabase session cookie, then redirects.

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/ssr-server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next") || "/account";
  if (code) {
    try {
      const sb = getSupabaseServerClient();
      await sb.auth.exchangeCodeForSession(code);
    } catch { /* fall through to redirect */ }
  }
  return NextResponse.redirect(new URL(next, url.origin));
}
