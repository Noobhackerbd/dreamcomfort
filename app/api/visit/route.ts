// app/api/visit/route.ts — records one lightweight visitor row per session.
// Called by <VisitTracker/> once per browser session (non-admin pages only).
import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const { visitorId, path } = (await req.json()) as { visitorId?: string; path?: string };
    if (path && String(path).startsWith("/admin")) {
      return NextResponse.json({ ok: true, skipped: true });
    }
    const supabase = getServerSupabase();
    await supabase.from("page_visits").insert({
      visitor_id: visitorId || null,
      path: path || null,
    });
    return NextResponse.json({ ok: true });
  } catch {
    // Never surface an error to the visitor (e.g. table not created yet).
    return NextResponse.json({ ok: false });
  }
}
