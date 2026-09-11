import { redirect, notFound } from "next/navigation";
import { getCustomerSession } from "@/lib/customer-auth";
import { getMyTicket } from "../../support-actions";
import { DashboardShell } from "@/components/account/DashboardShell";
import { TicketThread } from "@/components/account/TicketThread";

export const dynamic = "force-dynamic";
export const metadata = { title: "টিকিট" };

const STATUS: Record<string, { label: string; bg: string; fg: string }> = {
  open: { label: "খোলা", bg: "#fef3e2", fg: "#b45309" },
  answered: { label: "উত্তর দেওয়া হয়েছে", bg: "#e7f6ec", fg: "#16a34a" },
  closed: { label: "বন্ধ", bg: "#f1f5f9", fg: "#475569" },
};

export default async function TicketPage({ params }: { params: { id: string } }) {
  const session = await getCustomerSession();
  if (!session) redirect("/account/login");
  const res = await getMyTicket(params.id);
  if (!res.ok) notFound();
  const { ticket, messages } = res as any;
  const name = session.profile?.name || "";
  const st = STATUS[ticket.status] ?? STATUS.open;

  return (
    <DashboardShell active="support" name={name} email={session.email || ""}>
      <div className="mb-5 flex items-center gap-3">
        <a href="/account/support" className="h-9 w-9 grid place-items-center rounded-xl bg-white ring-1 ring-black/5 hover:bg-gray-50">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4"><path d="M15 18l-6-6 6-6" /></svg>
        </a>
        <div className="flex-1 min-w-0">
          <h1 className="font-display text-lg font-bold text-gray-900 truncate">{ticket.subject}</h1>
          <p className="text-xs text-gray-400 mt-0.5">{ticket.order_number ? `অর্ডার #${ticket.order_number}` : "সাধারণ টিকিট"}</p>
        </div>
        <span className="inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold whitespace-nowrap" style={{ background: st.bg, color: st.fg }}>{st.label}</span>
      </div>

      <div className="rounded-3xl bg-gray-50/60 ring-1 ring-black/5 p-4">
        <TicketThread ticketId={ticket.id} status={ticket.status} messages={messages} />
      </div>
    </DashboardShell>
  );
}
