"use server";

import { requireAdmin } from "@/lib/admin-auth";
import { getServerSupabase } from "@/lib/supabase/server";
import { getChatbotSettings, saveChatbotSettings, FOLLOWUP_MAX_STEPS, type FollowUp } from "@/lib/chatbot";
import type { FollowUpLogEntry } from "@/lib/chat-followup";

const clean = (v: unknown, max: number) => String(v ?? "").replace(/\r\n/g, "\n").trim().slice(0, max);

/** Everything Admin → Reminder shows: the settings, and what was sent lately. */
export async function getReminderAdmin() {
  await requireAdmin();
  const s = await getChatbotSettings();
  const db = getServerSupabase();
  const { data } = await db.from("settings").select("value").eq("key", "chatbot_followup_log").maybeSingle();
  const log = (Array.isArray((data as any)?.value) ? (data as any).value : []) as FollowUpLogEntry[];

  // Did the customer write back after the reminder?
  const ids = Array.from(new Set(log.map((e) => e.convId))).slice(0, 60);
  const lastCustomer = new Map<string, string | null>();
  if (ids.length) {
    const { data: convs } = await db.from("chat_conversations").select("id, last_customer_at").in("id", ids);
    for (const c of (convs ?? []) as any[]) lastCustomer.set(c.id, c.last_customer_at);
  }
  const rows = log.map((e) => {
    const lc = lastCustomer.get(e.convId);
    return { ...e, replied: !!(e.ok && lc && new Date(lc).getTime() > new Date(e.at).getTime()) };
  });

  const dayBd = (iso: string) => new Date(new Date(iso).getTime() + 6 * 3600000).toISOString().slice(0, 10);
  const today = dayBd(new Date().toISOString());
  const weekAgo = Date.now() - 7 * 86400000;
  const ok = rows.filter((r) => r.ok);
  const week = ok.filter((r) => new Date(r.at).getTime() >= weekAgo);
  return {
    followUp: s.followUp,
    botOn: !!s.autoReply,
    stats: {
      today: ok.filter((r) => dayBd(r.at) === today).length,
      week: week.length,
      repliedWeek: week.filter((r) => r.replied).length,
      failedWeek: rows.filter((r) => !r.ok && new Date(r.at).getTime() >= weekAgo).length,
    },
    log: rows.slice(0, 30),
  };
}

export async function saveReminderSettings(input: FollowUp) {
  await requireAdmin();
  try {
    const s = await getChatbotSettings();
    const hour = (n: unknown, d: number) => { const h = Math.round(Number(n)); return Number.isFinite(h) && h >= 0 && h <= 23 ? h : d; };
    const steps = (input.steps ?? []).slice(0, FOLLOWUP_MAX_STEPS).map((st) => ({
      enabled: !!st.enabled,
      afterHours: Math.max(3 / 60, Math.min(23, Number(st.afterHours) || 1)),
      text: clean(st.text, 1900),
    }));
    if (steps.some((st) => st.enabled && !st.text)) return { ok: false, error: "চালু করা রিমাইন্ডারের লেখা খালি রাখা যাবে না।" };
    steps.sort((a, b) => a.afterHours - b.afterHours); // always in time order
    await saveChatbotSettings({
      ...s,
      followUp: {
        enabled: !!input.enabled,
        steps,
        quiet: { enabled: !!input.quiet?.enabled, from: hour(input.quiet?.from, 23), to: hour(input.quiet?.to, 8) },
      },
    });
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e?.message || "সেভ হয়নি" };
  }
}
