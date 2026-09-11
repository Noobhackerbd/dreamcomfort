import { getServerSupabase } from "@/lib/supabase/server";
import { CopyEmails } from "./CopyEmails";

export const dynamic = "force-dynamic";

export default async function AdminSubscribers() {
  const supabase = getServerSupabase();
  const { data, error } = await supabase
    .from("newsletter_subscribers")
    .select("email, source, created_at")
    .order("created_at", { ascending: false })
    .limit(2000);
  const subs = (data ?? []) as any[];
  const missing = error && ((error as any).code === "42P01" || /newsletter_subscribers/i.test(error.message || ""));
  const emails = subs.map((s) => s.email);

  return (
    <div>
      <div className="flex items-center justify-between gap-3 mb-5">
        <h1 className="text-2xl font-bold">Subscribers</h1>
        {emails.length > 0 && <CopyEmails emails={emails} />}
      </div>

      {missing ? (
        <p className="rounded-xl border px-4 py-3 text-sm" style={{ borderColor: "var(--a-warn-soft)", background: "var(--a-warn-soft)", color: "var(--a-warn)" }}>
          Run <code className="px-1 rounded bg-white/60">supabase-migration-newsletter.sql</code> to enable newsletter signups.
        </p>
      ) : subs.length === 0 ? (
        <div className="dc-card p-8 text-center dc-muted">No subscribers yet.</div>
      ) : (
        <>
          <p className="text-xs dc-muted mb-3">{subs.length} subscribers</p>
          <div className="dc-card divide-y" style={{ borderColor: "var(--a-border)" }}>
            {subs.map((s, i) => (
              <div key={i} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
                <span className="font-medium truncate">{s.email}</span>
                <span className="text-xs dc-muted shrink-0">{s.source || "—"} · {new Date(s.created_at).toISOString().slice(0, 10)}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
