// app/api/admin/orders/recent/route.ts — lightweight poll for the foreground
// notifier (in-page sound + toast). Returns orders created after ?since=.
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { getServerSupabase } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const since = req.nextUrl.searchParams.get("since");
  const supabase = getServerSupabase();
  let query = supabase
    .from("orders")
    .select("id, order_number, customer_name, total, area, city, created_at")
    .order("created_at", { ascending: false })
    .limit(15);
  if (since) query = query.gt("created_at", since);

  const { data, error } = await query;
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

  return NextResponse.json({
    ok: true,
    orders: data ?? [],
    serverTime: new Date().toISOString(),
  });
}
