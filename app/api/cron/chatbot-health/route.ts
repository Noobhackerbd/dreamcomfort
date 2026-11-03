// app/api/cron/chatbot-health/route.ts — keeps the AI Chat Bot connected, every hour.
//
// If Facebook drops the subscription that sends messages to the bot (it can happen when
// the WhatsApp number is also used in the WhatsApp Business app on a phone), the bot
// silently stops getting messages. This re-subscribes:
//   • the WhatsApp Business Account → DreamComfort Chat app
//   • the Facebook Page → DreamComfort Chat app
// Auth: `Authorization: Bearer <CRON_SECRET>` (sent by Vercel Cron) or `?secret=`.
import { NextRequest, NextResponse } from "next/server";
import { getChatbotSettings, fbApp } from "@/lib/chatbot";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const GRAPH = "https://graph.facebook.com/v23.0";

function authorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  if (req.headers.get("authorization") === `Bearer ${secret}`) return true;
  return req.nextUrl.searchParams.get("secret") === secret;
}

async function graph(method: string, path: string, opts: { bearer?: string; query?: Record<string, string> } = {}) {
  const u = new URL(GRAPH + path);
  for (const [k, v] of Object.entries(opts.query ?? {})) u.searchParams.set(k, v);
  const r = await fetch(u, {
    method,
    headers: opts.bearer ? { authorization: `Bearer ${opts.bearer}` } : {},
    cache: "no-store",
    signal: AbortSignal.timeout(12_000),
  });
  return (await r.json().catch(() => ({}))) as any;
}

export async function GET(req: NextRequest) {
  if (!authorized(req)) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  const s = await getChatbotSettings();
  const appId = fbApp(s).appId;
  const out: Record<string, string> = {};

  if (s.waEnabled && s.waBusinessId && s.waToken) {
    const subs = await graph("GET", `/${s.waBusinessId}/subscribed_apps`, { bearer: s.waToken });
    const ok = (subs?.data ?? []).some((a: any) => String(a?.whatsapp_business_api_data?.id || a?.id || "") === appId
      || a?.whatsapp_business_api_data?.name === "DreamComfort Chat");
    if (ok) out.whatsapp = "subscribed";
    else {
      const r = await graph("POST", `/${s.waBusinessId}/subscribed_apps`, { bearer: s.waToken });
      out.whatsapp = r?.success ? "was missing — re-subscribed" : `re-subscribe failed: ${r?.error?.message || "unknown"}`;
      console.warn("[chatbot-health] WhatsApp:", out.whatsapp);
    }
  }

  if (s.pageId && s.pageAccessToken) {
    const subs = await graph("GET", `/${s.pageId}/subscribed_apps`, { query: { access_token: s.pageAccessToken } });
    const ok = (subs?.data ?? []).some((a: any) => String(a?.id) === appId);
    if (ok) out.messenger = "subscribed";
    else {
      const r = await graph("POST", `/${s.pageId}/subscribed_apps`, {
        query: { subscribed_fields: "messages,messaging_postbacks,message_echoes", access_token: s.pageAccessToken },
      });
      out.messenger = r?.success ? "was missing — re-subscribed" : `re-subscribe failed: ${r?.error?.message || "unknown"}`;
      console.warn("[chatbot-health] Messenger:", out.messenger);
    }
  }

  return NextResponse.json({ ok: true, ...out });
}
