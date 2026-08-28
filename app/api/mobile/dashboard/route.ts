// GET /api/mobile/dashboard — compact stats for the app home screen.
import { NextRequest } from "next/server";
import { verifyMobileToken, unauthorized } from "@/lib/mobile-auth";
import { getServerSupabase } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DHAKA_OFFSET_MS = 6 * 3600 * 1000;

export async function GET(req: NextRequest) {
  if (!(await verifyMobileToken(req))) return unauthorized();
  const supabase = getServerSupabase();

  // Start of "today" in Dhaka (UTC+6) as a UTC instant.
  const nowBd = new Date(Date.now() + DHAKA_OFFSET_MS);
  const todayStartUtc = new Date(
    Date.UTC(nowBd.getUTCFullYear(), nowBd.getUTCMonth(), nowBd.getUTCDate()) - DHAKA_OFFSET_MS
  ).toISOString();

  // Trash-aware helper.
  const del = await supabase.from("orders").select("deleted_at").limit(1);
  const hasTrash = !(del.error && (del.error as any).code === "42703");
  const live = (sel: string, opts?: any) => {
    let q: any = supabase.from("orders").select(sel, opts);
    if (hasTrash) q = q.is("deleted_at", null);
    return q;
  };

  const [totalRes, pendingRes, todayRes] = await Promise.all([
    live("id", { count: "exact", head: true }),
    live("id", { count: "exact", head: true }).eq("status", "pending"),
    live("total, status").gte("created_at", todayStartUtc),
  ]);

  const today = (todayRes.data ?? []) as any[];
  const todayOrders = today.length;
  const todayRevenue = today.reduce((s, o) => s + Number(o.total || 0), 0);

  return Response.json({
    ok: true,
    stats: {
      totalOrders: totalRes.count ?? 0,
      pending: pendingRes.count ?? 0,
      todayOrders,
      todayRevenue,
    },
  });
}
