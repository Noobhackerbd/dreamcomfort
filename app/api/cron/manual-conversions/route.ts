// GET /api/cron/manual-conversions?key=<secret>
//
// The 24-hour fallback for the "confirm, else auto after 24h" firing mode
// (Settings → ম্যানুয়াল / চ্যাট অর্ডার → mode = on_confirm_or_24h).
//
// It finds manual/chat orders that have NOT been forwarded yet (is_manual = true,
// capi_sent = false) and are older than 24 hours, and fires each one's server
// Purchase. fireOrderConversion is idempotent, so an order confirmed within 24h
// (already sent) is skipped here — nothing is ever double-counted.
//
// Runs no-op unless the firing mode is on_confirm_or_24h, so it's harmless to
// schedule permanently. Auth: ?key= must match CRON_SECRET, or the mobile API key
// (Settings → Android app টোকেন) as a convenient shared secret.
//
// --- How to schedule (pick ONE) ---
// Vercel Cron (vercel.json):
//   { "crons": [{ "path": "/api/cron/manual-conversions?key=YOUR_SECRET", "schedule": "0 * * * *" }] }
// or a free external pinger (cron-job.org / EasyCron): GET this URL every hour.

import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";
import { getManualSettings, getMobileSettings } from "@/lib/settings";
import { fireOrderConversion } from "@/lib/manual-conversion";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const WINDOW_HOURS = 24;
const MAX_PER_RUN = 100; // safety cap per invocation

export async function GET(req: NextRequest) {
  // --- auth ---
  const key = req.nextUrl.searchParams.get("key") || "";
  const cronSecret = process.env.CRON_SECRET || "";
  let ok = cronSecret && key === cronSecret;
  if (!ok) {
    try {
      const mobile = await getMobileSettings();
      ok = !!mobile.apiKey && key === mobile.apiKey;
    } catch {
      /* ignore */
    }
  }
  if (!ok) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });

  // --- only active in the 24h-fallback mode ---
  const manual = await getManualSettings();
  if (manual.mode !== "on_confirm_or_24h") {
    return NextResponse.json({ ok: true, skipped: "mode", mode: manual.mode, processed: 0 });
  }
  if (!manual.sendMeta && !manual.sendTiktok) {
    return NextResponse.json({ ok: true, skipped: "disabled", processed: 0 });
  }

  const supabase = getServerSupabase();
  const cutoff = new Date(Date.now() - WINDOW_HOURS * 3600 * 1000).toISOString();

  const { data, error } = await supabase
    .from("orders")
    .select("id, created_at")
    .eq("is_manual", true)
    .eq("capi_sent", false)
    .lt("created_at", cutoff)
    .neq("status", "cancelled")
    .neq("status", "returned")
    .order("created_at", { ascending: true })
    .limit(MAX_PER_RUN);

  if (error) {
    const missingCol = (error as any).code === "42703" || /is_manual|capi_sent/i.test(error.message || "");
    if (missingCol) {
      return NextResponse.json(
        { ok: false, needsMigration: true, error: "is_manual/capi_sent কলাম নেই — supabase-migration-manual-tracking.sql চালান।" },
        { status: 200 }
      );
    }
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  const orders = data ?? [];
  const host = req.headers.get("host");
  const origin = process.env.NEXT_PUBLIC_SITE_URL || (host ? `https://${host}` : "");

  let sent = 0;
  for (const o of orders) {
    const r = await fireOrderConversion(o.id, { origin });
    if (r.sent) sent++;
  }

  return NextResponse.json({ ok: true, found: orders.length, sent });
}
