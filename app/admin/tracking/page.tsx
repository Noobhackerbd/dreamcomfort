// app/admin/tracking/page.tsx — Meta tracking health & dedup audit.
// Reads events_log and pairs browser + server copies by event_id so you can
// confirm each event was received once from each side (deduplicated).
import { getServerSupabase } from "@/lib/supabase/server";
import { getMetaSettings } from "@/lib/settings";

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

  // Group by event_id to determine dedup pairing.
  const map = new Map<string, Grouped>();
  for (const r of rows) {
    const g = map.get(r.event_id) ?? {
      event_id: r.event_id,
      event_name: r.event_name,
      browser: false,
      server: false,
      created_at: r.created_at,
    };
    if (r.source === "browser") g.browser = true;
    if (r.source === "server") g.server = true;
    map.set(r.event_id, g);
  }
  const grouped = Array.from(map.values())
    .sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
    .slice(0, 100);
  const deduped = grouped.filter((g) => g.browser && g.server).length;

  const metaCfg = await getMetaSettings();
  const metaConfigured = !!metaCfg.pixelId && !!metaCfg.capiToken;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-2">ট্র্যাকিং হেলথ</h1>
      <p className="text-sm text-gray-500 mb-6">
        প্রতিটি ইভেন্টের একই <code>event_id</code> দিয়ে ব্রাউজার (Pixel) ও সার্ভার (CAPI) কপি পাঠানো
        হয় — Meta সেগুলো এক ইভেন্টে ডিডুপ্লিকেট করে।
      </p>

      {!metaConfigured && (
        <p className="mb-4 rounded-lg bg-amber-50 border border-amber-200 text-amber-700 px-4 py-2 text-sm">
          Meta কনফিগার করা হয়নি — Settings → Meta Pixel + Conversions API-তে Pixel ID ও Access Token দিন। ইভেন্ট লগ তবুও রেকর্ড হবে।
        </p>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="rounded-xl border bg-white p-5">
          <p className="text-sm text-gray-500">ব্রাউজার ইভেন্ট</p>
          <p className="mt-1 text-2xl font-bold">{browserCount}</p>
        </div>
        <div className="rounded-xl border bg-white p-5">
          <p className="text-sm text-gray-500">সার্ভার ইভেন্ট</p>
          <p className="mt-1 text-2xl font-bold">{serverCount}</p>
        </div>
        <div className="rounded-xl border bg-white p-5">
          <p className="text-sm text-gray-500">ডিডুপ্লিকেটেড জোড়া</p>
          <p className="mt-1 text-2xl font-bold text-brand">{deduped}</p>
        </div>
        <div className="rounded-xl border bg-white p-5">
          <p className="text-sm text-gray-500">মোট ইউনিক ইভেন্ট</p>
          <p className="mt-1 text-2xl font-bold">{grouped.length}</p>
        </div>
      </div>

      <h2 className="font-semibold mb-3">সাম্প্রতিক ইভেন্ট (event_id অনুযায়ী)</h2>
      <div className="overflow-x-auto rounded-xl border bg-white">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-gray-500">
            <tr>
              <th className="px-4 py-3">ইভেন্ট</th>
              <th className="px-4 py-3">event_id</th>
              <th className="px-4 py-3 text-center">ব্রাউজার</th>
              <th className="px-4 py-3 text-center">সার্ভার</th>
              <th className="px-4 py-3 text-center">ডিডুপ</th>
            </tr>
          </thead>
          <tbody>
            {grouped.map((g) => {
              const dd = g.browser && g.server;
              return (
                <tr key={g.event_id} className="border-t">
                  <td className="px-4 py-3 font-medium">{g.event_name}</td>
                  <td className="px-4 py-3 text-gray-400 font-mono text-xs">
                    {g.event_id.slice(0, 8)}…
                  </td>
                  <td className="px-4 py-3 text-center">{g.browser ? "✓" : "—"}</td>
                  <td className="px-4 py-3 text-center">{g.server ? "✓" : "—"}</td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={
                        "rounded-full px-2 py-0.5 text-xs " +
                        (dd ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500")
                      }
                    >
                      {dd ? "Deduplicated" : g.server ? "server only" : "browser only"}
                    </span>
                  </td>
                </tr>
              );
            })}
            {grouped.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-gray-400">
                  এখনও কোনো ইভেন্ট লগ হয়নি। সাইটে ব্রাউজ করলে এখানে ইভেন্ট দেখা যাবে।
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
