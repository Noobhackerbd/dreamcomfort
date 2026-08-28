// GET /api/mobile/orders?status=&q=&page= — paginated orders list for the app.
import { NextRequest } from "next/server";
import { verifyMobileToken, unauthorized } from "@/lib/mobile-auth";
import { getServerSupabase } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PAGE_SIZE = 20;
const COLS =
  "id, order_number, customer_name, customer_phone, address_line, area, city, district, total, status, notes, created_at, order_items(product_name, quantity, products(images))";

export async function GET(req: NextRequest) {
  if (!(await verifyMobileToken(req))) return unauthorized();
  const supabase = getServerSupabase();
  const sp = req.nextUrl.searchParams;
  const status = sp.get("status") || "";
  const q = (sp.get("q") || "").trim();
  const page = Math.max(1, Number(sp.get("page")) || 1);
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  // Detect optional columns so filters don't 42703 on un-migrated DBs.
  const probe = await supabase.from("orders").select("deleted_at, call_attempts").limit(1);
  const hasTrash = !(probe.error && (probe.error as any).code === "42703");
  const hasCA = hasTrash; // both live in the same probe; if it failed, treat as absent

  function build(withDeleted: boolean) {
    let query: any = supabase.from("orders").select(COLS, { count: "exact" }).order("created_at", { ascending: false }).range(from, to);
    if (withDeleted && hasTrash) query = query.is("deleted_at", null);
    if (status === "pending") {
      query = query.eq("status", "pending");
      if (hasCA) query = query.lt("call_attempts", 3);
    } else if (status === "call_attempt") {
      query = query.eq("status", "pending");
      query = hasCA ? query.gte("call_attempts", 3) : query.eq("id", "00000000-0000-0000-0000-000000000000");
    } else if (status) {
      query = query.eq("status", status);
    }
    if (q) query = query.or(`order_number.ilike.%${q}%,customer_phone.ilike.%${q}%,customer_name.ilike.%${q}%`);
    return query;
  }

  let { data, count, error } = await build(true);
  if (error && (error as any).code === "42703") ({ data, count } = await build(false));
  if (error && (error as any).code !== "42703") return Response.json({ ok: false, error: error.message }, { status: 500 });

  const orders = (data ?? []).map((o: any) => ({
    id: o.id,
    orderNumber: o.order_number,
    name: o.customer_name ?? "",
    phone: o.customer_phone ?? "",
    address: [o.address_line, o.area, o.city || o.district].filter(Boolean).join(", "),
    total: Number(o.total ?? 0),
    status: o.status,
    notes: o.notes ?? "",
    createdAt: o.created_at,
    image: o.order_items?.[0]?.products?.images?.[0] ?? null,
    items: (o.order_items ?? []).map((it: any) => ({ name: it.product_name, qty: Number(it.quantity || 0) })),
  }));

  return Response.json({
    ok: true,
    orders,
    total: count ?? 0,
    page,
    pageSize: PAGE_SIZE,
    totalPages: Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE)),
  });
}
