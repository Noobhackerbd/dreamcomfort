// app/api/cron/chatbot-followup/route.ts — every 30 minutes: send the AI Chat Bot's saved
// follow-ups to customers who went quiet (see lib/chat-followup.ts for the rules).
// Auth: `Authorization: Bearer <CRON_SECRET>` (sent by Vercel Cron) or `?secret=`.
import { NextRequest, NextResponse } from "next/server";
import { runFollowUps } from "@/lib/chat-followup";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function authorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  if (req.headers.get("authorization") === `Bearer ${secret}`) return true;
  return req.nextUrl.searchParams.get("secret") === secret;
}

export async function GET(req: NextRequest) {
  if (!authorized(req)) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  try {
    return NextResponse.json(await runFollowUps());
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "failed" }, { status: 500 });
  }
}
