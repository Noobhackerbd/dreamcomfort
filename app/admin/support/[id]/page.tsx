import { notFound } from "next/navigation";
import Link from "next/link";
import { getServerSupabase } from "@/lib/supabase/server";
import { AdminTicketThread } from "./AdminTicketThread";

export const dynamic = "force-dynamic";

const CAT: Record<string, string> = { order: "Order", return: "Return/Refund", payment: "Payment", general: "General" };

export default async function AdminTicketPage({ params }: { params: { id: string } }) {
  const supabase = getServerSupabase();
  const { data: ticket } = await supabase.from("support_tickets").select("*").eq("id", params.id).maybeSingle();
  if (!ticket) notFound();
  const { data: messages } = await supabase.from("support_messages").select("*").eq("ticket_id", params.id).order("created_at", { ascending: true });

  return (
    <div className="max-w-3xl">
      <div className="flex items-center gap-3 mb-5">
        <Link href="/admin/support" className="dc-act-sm">← Back</Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold truncate">{(ticket as any).subject}</h1>
          <p className="text-xs dc-muted mt-0.5">
            {(ticket as any).name} · {((ticket as any).phone || "").replace(/^88/, "")} · {CAT[(ticket as any).category] || (ticket as any).category}
            {(ticket as any).order_number ? ` · Order #${(ticket as any).order_number}` : ""}
            {(ticket as any).email ? ` · ${(ticket as any).email}` : ""}
          </p>
        </div>
      </div>

      <div className="dc-card p-4" style={{ background: "var(--a-surface-2)" }}>
        <AdminTicketThread ticketId={(ticket as any).id} status={(ticket as any).status} messages={messages ?? []} />
      </div>
    </div>
  );
}
