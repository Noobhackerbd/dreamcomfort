// GET /admin/orders/[id]/label — streams the CarryBee print label / POD (PDF/HTML)
// for the order's consignment. Protected by the /admin middleware (admins only).
import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";
import { fetchPrintPod } from "@/lib/carrybee";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = getServerSupabase();
  const { data: order } = await supabase
    .from("orders")
    .select("courier, tracking_id")
    .eq("id", params.id)
    .single();

  if (!order?.tracking_id || order.courier !== "CarryBee") {
    return NextResponse.json({ error: "এই অর্ডারের CarryBee কনসাইনমেন্ট নেই।" }, { status: 400 });
  }

  const pod = await fetchPrintPod(order.tracking_id);
  if (!pod.ok || !pod.body) {
    return NextResponse.json({ error: pod.error ?? "লেবেল আনতে ব্যর্থ।" }, { status: 502 });
  }

  return new NextResponse(Buffer.from(pod.body), {
    status: 200,
    headers: {
      "Content-Type": pod.contentType || "application/pdf",
      "Content-Disposition": `inline; filename="carrybee-${order.tracking_id}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
