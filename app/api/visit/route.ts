// app/api/visit/route.ts — records one lightweight visitor row per session and
// pings the admin "live-visitors" realtime channel so the dashboard updates
// instantly (no polling). The broadcast is fire-and-forget: it never delays or
// blocks the visitor's request.
import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";

export const runtime = "nodejs";

function pingLive() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return;
  // Minimal payload: just a timestamp. Each call is already one unique session
  // (VisitTracker fires once per session), so no visitor id is needed.
  fetch(`${url}/realtime/v1/api/broadcast`, {
    method: "POST",
    headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ messages: [{ topic: "live-visitors", event: "visit", payload: { t: Date.now() } }] }),
    keepalive: true,
  }).catch(() => {});
}

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
    pingLive(); // fire-and-forget realtime ping to the admin counter
    return NextResponse.json({ ok: true });
  } catch {
    // Never surface an error to the visitor (e.g. table not created yet).
    return NextResponse.json({ ok: false });
  }
}
