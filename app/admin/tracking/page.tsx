// app/admin/tracking/page.tsx — Meta tracking health & dedup audit.
// Reads events_log and pairs browser + server copies by event_id so you can
// confirm each event was received once from each side (deduplicated).
import { getServerSupabase } from "@/lib/supabase/server";
import { getMetaSettings } from "@/lib/settings";
import { Icon } from "@/components/admin/icons";

export const dynamic = "force-dynamic";

interface EventRow {
  id: string;
  event_name: string;
  event_id: string;
  source: "browser" | "server";
  fbtrace_id: string | null;
  created_at: string;
}

interface Grouped {
  event_id: string;
  event_name: string;
  browser: boolean;
  server: boolean;
  created_at: string;
}

export default async function TrackingHealth() {
  const supabase = getServerSupabase();
  const { data } = await supabase
    .from("events_log")
    .select("id, event_name, event_id, source, fbtrace_id, created_at")
    .order("created_at", { ascending: false })
    .limit(300);

  const rows = (data as EventRow[]) ?? [];
  const browserCount = rows.filter((r) => r.source === "browser").length;
  const serverCount = rows.filter((r) => r.source === "server").length;

  const map = new Map<string, Grouped>();
  for (const r of rows) {
    const g = map.get(r.event_id) ?? { event_id: r.event_id, event_name: r.event_name, browser: false, server: false, created_at: r.created_at };
    if (r.source === "browser") g.browser = true;
    if (r.source === "server") g.server = true;
    map.set(r.event_id, g);
  }
  const grouped = Array.from(map.values()).sort((a, b) => (a.created_at < b.created_at ? 1 : -1)).slice(0, 100);
  const deduped = grouped.filter((g) => g.browser && g.server).length;

  const metaCfg = await getMetaSettings();
  const metaConfigured = !!metaCfg.pixelId && !!metaCfg.capiToken;

  const cards = [
    { icon: "eye", label: "Browser events", value: browserCount, bg: "#e8f0fe", fg: "#2563eb" },
    { icon: "tracking", label: "Server events", value: serverCount, bg: "#f3eefc", fg: "#7c3aed" },
    { icon: "check", label: "Deduplicated pairs", value: deduped, bg: "#e7f6ec", fg: "#16a34a" },
    { icon: "target", label: "Unique events", value: grouped.length, bg: "var(--a-violet-soft)", fg: "var(--a-violet)" },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold mb-1">Tracking health</h1>
      <p className="text-sm dc-muted mb-4">Each event is sent from both the browser (Pixel) and the server (CAPI) with the same <code className="px-1 rounded" style={{ background: "var(--a-surface-2)" }}>event_id</code> — Meta deduplicates them into one.</p>

      {!metaConfigured && (
        <p className="mb-4 rounded-xl border px-4 py-3 text-sm" style={{ borderColor: "var(--a-warn-soft)", background: "var(--a-warn-soft)", color: "var(--a-warn)" }}>
          Meta isn&apos;t configured — add your Pixel ID and Access Token in Settings → Meta Pixel + Conversions API. Events are still logged here.
        </p>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 mb-5">
        {cards.map((c) => (
          <div key={c.label} className="dc-card p-3 flex items-center gap-3">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg shrink-0" style={{ background: c.bg, color: c.fg }}>
              <Icon name={c.icon} className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="text-[20px] font-extrabold leading-tight">{c.value}</p>
              <p className="text-[11px] dc-muted truncate">{c.label}</p>
            </div>
          </div>
        ))}
      </div>

      <h2 className="font-bold text-[15px] mb-3">Recent events (by event_id)</h2>
      <div className="dc-card overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead style={{ background: "var(--a-surface-2)", color: "var(--a-muted)" }} className="text-left">
              <tr>
                <th className="px-4 py-3 font-medium">Event</th>
                <th className="px-4 py-3 font-medium">event_id</th>
                <th className="px-4 py-3 font-medium text-center">Browser</th>
                <th className="px-4 py-3 font-medium text-center">Server</th>
                <th className="px-4 py-3 font-medium text-center">Dedup</th>
              </tr>
            </thead>
            <tbody>
              {grouped.map((g) => {
                const dd = g.browser && g.server;
                return (
                  <tr key={g.event_id} style={{ borderTop: "1px solid var(--a-border)" }}>
                    <td className="px-4 py-3 font-medium">{g.event_name}</td>
                    <td className="px-4 py-3 font-mono text-xs" style={{ color: "var(--a-faint)" }}>{g.event_id.slice(0, 8)}…</td>
                    <td className="px-4 py-3 text-center">{g.browser ? "✓" : "—"}</td>
                    <td className="px-4 py-3 text-center">{g.server ? "✓" : "—"}</td>
                    <td className="px-4 py-3 text-center">
                      <span className="rounded-full px-2 py-0.5 text-xs font-semibold" style={dd ? { background: "#e7f6ec", color: "#16a34a" } : { background: "var(--a-surface-2)", color: "var(--a-muted)" }}>
                        {dd ? "Deduplicated" : g.server ? "server only" : "browser only"}
                      </span>
                    </td>
                  </tr>
                );
              })}
              {grouped.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-8 text-center dc-muted">No events logged yet. Browse the site to see events here.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
