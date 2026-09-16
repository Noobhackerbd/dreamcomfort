"use server";

// app/admin/live-actions.ts — seed data for the admin live visitor counter.
// The live updates come via Supabase Realtime broadcast (see /api/visit); this
// action only provides the initial numbers + a light drift-correction refetch.
// Admin-only. Nothing here runs on the storefront.

import { requireAdmin } from "@/lib/admin-auth";
import { getServerSupabase } from "@/lib/supabase/server";

export interface LiveInit {
  recent: number[]; // visit timestamps (epoch ms) in the last 60 minutes
  today: number;    // total visits since Dhaka midnight
  ts: number;
}

const DHAKA_OFFSET_MS = 6 * 60 * 60 * 1000;

export async function getLiveStats(): Promise<LiveInit> {
  await requireAdmin();
  const svc = getServerSupabase();
  const now = Date.now();
  const since60 = new Date(now - 60 * 60 * 1000).toISOString();
  const todayKey = new Date(now + DHAKA_OFFSET_MS).toISOString().slice(0, 10);
  const todayStart = new Date(`${todayKey}T00:00:00+06:00`).toISOString();

  const [recentRes, todayRes] = await Promise.all([
    svc.from("page_visits").select("created_at").gte("created_at", since60).order("created_at", { ascending: false }).limit(5000),
    svc.from("page_visits").select("id", { count: "exact", head: true }).gte("created_at", todayStart),
  ]);

  const recent = ((recentRes.data ?? []) as { created_at: string }[]).map((r) => new Date(r.created_at).getTime());
  return { recent, today: todayRes.count ?? 0, ts: now };
}
