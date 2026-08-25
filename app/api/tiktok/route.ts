// app/api/tiktok/route.ts
// Server-side TikTok Events API endpoint for browser-driven events (ViewContent,
// AddToCart, InitiateCheckout). The client sends { eventName, eventId, url, ttclid?,
// user?, properties? }; the server enriches with ttp/ttclid/ip/ua and forwards to TikTok
// with the SAME event_id → deduplicated with the browser copy.

import { NextRequest, NextResponse } from "next/server";
import { sendTikTokEvent, TikTokEventName, TikTokProps } from "@/lib/tiktok/events";
import { getTikTokSignals } from "@/lib/tiktok/signals";
import { getExternalId } from "@/lib/meta/fb-cookies";
import { RawUserData } from "@/lib/meta/hash";

export const runtime = "nodejs";

interface Body {
  eventName: TikTokEventName;
  eventId: string;
  eventTime?: number;
  url: string;
  ttclid?: string;
  user?: RawUserData;
  properties?: TikTokProps;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Body;
    if (!body?.eventName || !body?.eventId || !body?.url) {
      return NextResponse.json({ ok: false, error: "missing fields" }, { status: 400 });
    }
    const signals = getTikTokSignals(body.ttclid);
    const externalId = body.user?.externalId ?? getExternalId();
    const result = await sendTikTokEvent({
      eventName: body.eventName,
      eventId: body.eventId,
      eventTime: body.eventTime,
      url: body.url,
      user: { ...(body.user ?? {}), externalId },
      signals,
      properties: body.properties,
    });
    return NextResponse.json(result, { status: result.ok ? 200 : 502 });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? "error" }, { status: 500 });
  }
}
