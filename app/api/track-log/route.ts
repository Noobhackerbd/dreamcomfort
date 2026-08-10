// app/api/track-log/route.ts
// Logs the BROWSER copy of a pixel event to events_log so the Tracking Health
// page can pair it with the server copy (same event_id) and show deduplication.
// The browser can't write to events_log directly (RLS blocks anon writes), so it
// posts here and the server records it with the service-role key.

import { NextRequest, NextResponse } from "next/server";
import { logEvent } from "@/lib/meta/log";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      eventName?: string;
      eventId?: string;
      payload?: Record<string, unknown>;
    };
    if (!body?.eventName || !body?.eventId) {
      return NextResponse.json({ ok: false, error: "missing fields" }, { status: 400 });
    }
    await logEvent({
      event_name: body.eventName,
      event_id: body.eventId,
      source: "browser",
      payload: body.payload ?? null,
    });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? "error" }, { status: 500 });
  }
}
