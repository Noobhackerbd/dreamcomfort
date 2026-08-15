// app/api/admin/customers/export/route.ts — PIN-protected CSV export of ALL customers.
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { getServerSupabase } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const EXPORT_PIN = "159357";

function csvCell(v: unknown): string {
  const s = v == null ? "" : String(v);
  return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}

export async function GET(req: NextRequest) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  if ((req.nextUrl.searchParams.get("pin") || "") !== EXPORT_PIN) {
    return NextResponse.json({ ok: false, error: "invalid pin" }, { status: 403 });
  }

  const supabase = getServerSupabase();
  const all: any[] = [];
  const pageSize = 1000;
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabase
      .from("customers")
      .select("name, phone, email, total_orders, total_spent, created_at")
      .order("total_spent", { ascending: false })
      .range(from, from + pageSize - 1);
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    if (!data || data.length === 0) break;
    all.push(...data);
    if (data.length < pageSize) break;
  }

  const header = ["Name", "Phone", "Email", "Total Orders", "Total Spent (BDT)", "First Seen"];
  const lines = all.map((c) => [
    c.name || "",
    c.phone || "",
    c.email || "",
    c.total_orders ?? 0,
    c.total_spent ?? 0,
    c.created_at ? new Date(c.created_at).toISOString().slice(0, 10) : "",
  ]);

  const csv = [header, ...lines].map((r) => r.map(csvCell).join(",")).join("\r\n");
  const bom = "\uFEFF"; // UTF-8 BOM so Excel shows Bangla names correctly
  const filename = `customers-${new Date().toISOString().slice(0, 10)}.csv`;

  return new NextResponse(bom + csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
