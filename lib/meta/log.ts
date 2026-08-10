// lib/meta/log.ts — write a row to events_log for the Tracking Health page.
// Browser events and server events both log here, sharing event_id so the health
// page can confirm each event was received once from each side (deduplicated).

import { getServerSupabase } from "@/lib/supabase/server";

export interface EventLogRow {
  event_name: string;
  event_id: string;
  source: "browser" | "server";
  fbtrace_id?: string | null;
  payload?: Record<string, unknown> | null;
}

export async function logEvent(row: EventLogRow): Promise<void> {
  try {
    const supabase = getServerSupabase();
    await supabase.from("events_log").insert({
      event_name: row.event_name,
      event_id: row.event_id,
      source: row.source,
      fbtrace_id: row.fbtrace_id ?? null,
      payload: row.payload ?? null,
    });
  } catch {
    // never let tracking logging break a request
  }
}
