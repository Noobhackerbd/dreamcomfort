// app/api/capi/route.ts
// Generic server-side CAPI endpoint for browser-driven events (ViewContent,
// AddToCart, InitiateCheckout, Lead). The client sends
//   { eventName, eventId, url, fbclid?, user?, customData? }
// The server enriches with fbp/fbc/ip/ua from the request, forwards to Meta,
// and logs the server copy to events_log (shared event_id → deduplicated with
// the browser copy).
//
// IMPORTANT: For Purchase, do NOT rely on this route. The server Purchase is
// fired directly inside the checkout Server Action using the order's stored
// event_id, so it runs even if the browser tab closes.

import { NextRequest, NextResponse } from "next/server";
import { sendServerEvent, MetaEventName, CustomData } from "@/lib/meta/capi";
import { getServerMatchSignals, getExternalId } from "@/lib/meta/fb-cookies";
import { RawUserData } from "@/lib/meta/hash";
import { logEvent } from "@/lib/meta/log";
import { getMetaSettings } from "@/lib/settings";

export const runtime = "nodejs"; // crypto hashing needs the Node runtime

interface Body {
  eventName: MetaEventName;
  eventId: string;
  eventTime?: number;
  url: string;
  fbclid?: string;
  user?: RawUserData;
  customData?: CustomData;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Body;
    if (!body?.eventName || !body?.eventId || !body?.url) {
      return NextResponse.json({ ok: false, error: "missing fields" }, { status: 400 });
    }

    // No-op safely if Meta isn't configured yet.
    const metaCfg = await getMetaSettings();
    if (!metaCfg.capiToken || !metaCfg.pixelId) {
      return NextResponse.json({ ok: false, error: "meta not configured", skipped: true });
    }

    const signals = getServerMatchSignals(body.fbclid);
    const externalId = body.user?.externalId ?? getExternalId();

    const result = await sendServerEvent({
      eventName: body.eventName,
      eventId: body.eventId,
      eventTime: body.eventTime, // use the client's stamp so both copies match
      eventSourceUrl: body.url,
      user: { ...(body.user ?? {}), externalId },
      signals,
      customData: body.customData,
    });

    await logEvent({
      event_name: body.eventName,
      event_id: body.eventId,
      source: "server",
      fbtrace_id: result.fbtrace_id,
      payload: { url: body.url },
    });

    return NextResponse.json(result, { status: result.ok ? 200 : 502 });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? "error" }, { status: 500 });
  }
}
