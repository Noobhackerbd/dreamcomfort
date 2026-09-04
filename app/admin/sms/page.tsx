import { getServerSupabase } from "@/lib/supabase/server";
import { ManualSms } from "./ManualSms";

export const dynamic = "force-dynamic";

const STATUS_STYLE: Record<string, { bg: string; fg: string }> = {
  sent: { bg: "#e7f6ec", fg: "#16a34a" },
  failed: { bg: "#fdeaea", fg: "#dc2626" },
  skipped: { bg: "var(--a-surface-2)", fg: "var(--a-muted)" },
};

export default async function AdminSms() {
  const supabase = getServerSupabase();
  const { data: logs } = await supabase
    .from("sms_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);

  const configured = !!process.env.SMS_API_KEY && !!process.env.SMS_SENDER_ID;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-1">SMS</h1>
      <p className="text-sm dc-muted mb-4">Send a manual SMS and review everything that went out.</p>

      {!configured && (
        <p className="mb-4 rounded-xl border px-4 py-3 text-sm" style={{ borderColor: "var(--a-warn-soft)", background: "var(--a-warn-soft)", color: "var(--a-warn)" }}>
          SMS gateway isn&apos;t configured. Add <code className="px-1 rounded bg-white/60">SMS_API_KEY</code> and <code className="px-1 rounded bg-white/60">SMS_SENDER_ID</code> to .env — until then messages are logged as &ldquo;skipped&rdquo;.
        </p>
      )}

      <ManualSms />

      <h2 className="font-bold text-[15px] mb-3">Sent message log</h2>
      <div className="dc-card overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead style={{ background: "var(--a-surface-2)", color: "var(--a-muted)" }} className="text-left">
              <tr>
                <th className="px-4 py-3 font-medium">Time</th>
                <th className="px-4 py-3 font-medium">Phone</th>
                <th className="px-4 py-3 font-medium">Message</th>
                <th className="px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {(logs ?? []).map((l: any) => {
                const st = STATUS_STYLE[l.status] ?? STATUS_STYLE.skipped;
                return (
                  <tr key={l.id} className="align-top" style={{ borderTop: "1px solid var(--a-border)" }}>
                    <td className="px-4 py-3 whitespace-nowrap" style={{ color: "var(--a-faint)" }}>{new Date(l.created_at).toLocaleString("en-GB")}</td>
                    <td className="px-4 py-3 whitespace-nowrap tabular-nums">{l.phone}</td>
                    <td className="px-4 py-3 max-w-md dc-muted">{l.message}</td>
                    <td className="px-4 py-3">
                      <span className="rounded-full px-2 py-0.5 text-xs font-semibold" style={{ background: st.bg, color: st.fg }}>{l.status}</span>
                    </td>
                  </tr>
                );
              })}
              {(!logs || logs.length === 0) && (
                <tr><td colSpan={4} className="px-4 py-8 text-center dc-muted">No SMS sent yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
