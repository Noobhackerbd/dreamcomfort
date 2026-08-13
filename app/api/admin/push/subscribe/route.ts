// app/api/admin/push/subscribe/route.ts — save an admin's Web Push subscription.
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { getServerSupabase } from "@/lib/supabase/server";
import { getSupabaseServerClient } from "@/lib/supabase/ssr-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  let email: string | null = null;
  try {
    const { data } = await getSupabaseServerClient().auth.getUser();
    email = data.user?.email ?? null;
  } catch {
    /* ignore */
  }

  const body = await req.json().catch(() => null);
  const sub = body?.subscription;
  if (!sub?.endpoint || !sub?.keys?.p256dh || !sub?.keys?.auth) {
    return NextResponse.json({ ok: false, error: "invalid subscription" }, { status: 400 });
  }

  const supabase = getServerSupabase();
  const { error } = await supabase.from("push_subscriptions").upsert(
    {
      endpoint: sub.endpoint,
      p256dh: sub.keys.p256dh,
      auth: sub.keys.auth,
      admin_email: email,
      user_agent: req.headers.get("user-agent") ?? null,
    },
    { onConflict: "endpoint" }
  );
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
