// app/auth/callback/route.ts — OAuth (Google/Facebook) + magic-link callback.
// Exchanges the provider code for a Supabase session cookie, then redirects.

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/ssr-server";
import { getServerSupabase } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next") || "/account";
  if (code) {
    try {
      const sb = getSupabaseServerClient();
      const { data } = await sb.auth.exchangeCodeForSession(code);
      const d = data as any;
      const user = d?.user ?? d?.session?.user ?? null;
      // Save the Google/Facebook account's name (and email) into the customer
      // profile so the dashboard greets them by name. Never overwrite a name the
      // customer set themselves; only fill it in when it's empty.
      if (user) {
        try {
          const meta: any = user.user_metadata || {};
          const metaName = String(meta.full_name || meta.name || meta.given_name || "").trim();
          const svc = getServerSupabase();
          const { data: existing } = await svc.from("customer_profiles").select("name, phone").eq("id", user.id).maybeSingle();
          const name = existing?.name && String(existing.name).trim() ? existing.name : (metaName || null);
          await svc.from("customer_profiles").upsert({
            id: user.id,
            name,
            phone: existing?.phone ?? user.phone ?? null,
            email: user.email ?? null,
            updated_at: new Date().toISOString(),
          });
        } catch { /* profile table not migrated — login still works */ }
      }
    } catch { /* fall through to redirect */ }
  }
  return NextResponse.redirect(new URL(next, url.origin));
}
