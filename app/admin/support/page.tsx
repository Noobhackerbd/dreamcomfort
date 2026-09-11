import Link from "next/link";
import { getServerSupabase } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const FILTERS = [
  { value: "", label: "All" },
  { value: "open", label: "Open" },
  { value: "answered", label: "Answered" },
  { value: "closed", label: "Closed" },
];
const STATUS: Record<string, { label: string; bg: string; fg: string }> = {
  open: { label: "Open", bg: "#fef3e2", fg: "#b45309" },
  answered: { label: "Answered", bg: "#e7f6ec", fg: "#16a34a" },
  closed: { label: "Closed", bg: "#f1f5f9", fg: "#475569" },
};
const CAT: Record<string, string> = { order: "Order", return: "Return/Refund", payment: "Payment", general: "General" };

export default async function AdminSupport({ searchParams }: { searchParams: { status?: string } }) {
  const supabase = getServerSupabase();
  const status = searchParams.status || "";
  let q: any = supabase.from("support_tickets").select("id, name, phone, subject, category, status, order_number, updated_at").order("updated_at", { ascending: false }).limit(200);
  if (status) q = q.eq("status", status);
  const { data, error } = await q;
  const tickets = (data ?? []) as any[];
  const missing = error && ((error as any).code === "42P01" || /support_tickets/i.test(error.message || ""));

  return (
    <div>
      <div className="flex items-center justify-between gap-3 mb-5">
        <h1 className="text-2xl font-bold">Support</h1>
      </div>

      {missing ? (
        <p className="rounded-xl border px-4 py-3 text-sm" style={{ borderColor: "var(--a-warn-soft)", background: "var(--a-warn-soft)", color: "var(--a-warn)" }}>
          Run <code className="px-1 rounded bg-white/60">supabase-migration-support-tickets.sql</code> to enable support tickets.
        </p>
      ) : (
        <>
          <div className="dc-scroll-x flex items-center gap-1.5 overflow-x-auto pb-1 mb-4">
            {FILTERS.map((f) => (
              <Link key={f.value} href={f.value ? `/admin/support?status=${f.value}` : "/admin/support"}
                className={"shrink-0 whitespace-nowrap rounded-full border px-3.5 py-1.5 text-[13px] font-medium " + (status === f.value ? "dc-pill-active" : "dc-pill")}>
                {f.label}
              </Link>
            ))}
          </div>

          <p className="text-xs dc-muted mb-3">{tickets.length} tickets</p>

          {tickets.length === 0 ? (
            <div className="dc-card p-8 text-center dc-muted">No tickets.</div>
          ) : (
            <div className="space-y-2">
              {tickets.map((t) => {
                const st = STATUS[t.status] ?? STATUS.open;
                return (
                  <Link key={t.id} href={`/admin/support/${t.id}`} className="dc-card flex items-center gap-3 px-4 py-3 hover:shadow-sm transition">
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-sm truncate">{t.subject}</p>
                      <p className="text-xs dc-muted mt-0.5">{t.name} · {(t.phone || "").replace(/^88/, "")} · {CAT[t.category] || t.category}{t.order_number ? ` · #${t.order_number}` : ""}</p>
                    </div>
                    <span className="inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold whitespace-nowrap" style={{ background: st.bg, color: st.fg }}>{st.label}</span>
                  </Link>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
