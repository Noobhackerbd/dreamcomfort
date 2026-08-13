// app/api/admin/push/unsubscribe/route.ts — remove an admin's push subscription.
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { getServerSupabase } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  const body = await req.json().catch(() => null);
  const endpoint = body?.endpoint;
  if (!endpoint) return NextResponse.json({ ok: false, error: "missing endpoint" }, { status: 400 });
  await getServerSupabase().from("push_subscriptions").delete().eq("endpoint", endpoint);
  return NextResponse.json({ ok: true });
}
