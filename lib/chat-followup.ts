// lib/chat-followup.ts — automatic follow-ups for customers who stop replying.
//
// Every 5 minutes (cron) we look at chats where the customer's last message is between the
// first follow-up time and 23.5 hours old. For each one, the next follow-up step is sent when
//   • the bot is on, follow-ups are on, and the AI is on in that chat (not handed to you),
//   • we answered last (the newest message in the chat is ours, not an unanswered question),
//   • no order was created from this chat,
//   • its time has come (`afterHours` since the customer's last message),
//   • and we're still inside Facebook / WhatsApp's 24-hour window.
// Each step goes once; the count resets when the customer writes again. Nothing goes during the
// quiet hours (Admin → Reminder); an overdue reminder waits for the morning, and if several are
// overdue only the latest goes.
import "server-only";
import { getServerSupabase } from "@/lib/supabase/server";
import { getChatbotSettings, personalize, messengerText, inQuietHours, FOLLOWUP_WINDOW_H, type FollowUpStep, type Gender } from "@/lib/chatbot";
import { sendText } from "@/lib/messenger";
import { waSendText } from "@/lib/whatsapp";

export interface FollowUpConv {
  id: string;
  psid: string;
  last_customer_at: string | null;
  followup_step: number | null;
  gender: string | null;
  name?: string | null;
}

/** Which step (index) is due now, or null. Pure — unit-tested.
 *  When several are overdue (e.g. they waited out the night), only the latest one goes —
 *  the customer never gets two reminders back to back. */
export function dueStep(
  conv: Pick<FollowUpConv, "last_customer_at" | "followup_step">,
  steps: FollowUpStep[],
  nowMs: number,
  lastMessage: { direction: string; sender: string } | null,
  ordered: boolean,
): number | null {
  if (!conv.last_customer_at || ordered) return null;
  if (!lastMessage || lastMessage.direction !== "out") return null; // their question is still unanswered
  const hours = (nowMs - new Date(conv.last_customer_at).getTime()) / 3600000;
  if (hours >= FOLLOWUP_WINDOW_H) return null;
  let due: number | null = null;
  for (let i = Math.max(0, conv.followup_step ?? 0); i < steps.length; i++) {
    const st = steps[i];
    if (!st?.enabled || !st.text?.trim()) continue;
    if (Number(st.afterHours) >= FOLLOWUP_WINDOW_H) continue; // would break the 24h rule
    if (hours >= Number(st.afterHours)) due = i;
  }
  return due;
}

export interface FollowUpLogEntry { at: string; convId: string; name: string | null; step: number; channel: "messenger" | "whatsapp"; ok: boolean; error?: string }

/** The last 60 reminders, kept in settings ("chatbot_followup_log") for Admin → Reminder. */
async function logFollowUps(entries: FollowUpLogEntry[]) {
  if (!entries.length) return;
  try {
    const db = getServerSupabase();
    const { data } = await db.from("settings").select("value").eq("key", "chatbot_followup_log").maybeSingle();
    const old = Array.isArray((data as any)?.value) ? ((data as any).value as FollowUpLogEntry[]) : [];
    await db.from("settings").upsert({ key: "chatbot_followup_log", value: [...entries.reverse(), ...old].slice(0, 60), updated_at: new Date().toISOString() });
  } catch { /* ignore */ }
}

export async function runFollowUps(nowMs = Date.now()) {
  const s = await getChatbotSettings();
  if (!s.autoReply) return { ok: true, skipped: "bot is off" };
  if (!s.followUp?.enabled) return { ok: true, skipped: "follow-ups are off" };
  if (inQuietHours(s.followUp.quiet, nowMs)) return { ok: true, skipped: "quiet hours" };
  const steps = s.followUp.steps ?? [];
  const first = Math.min(...steps.filter((x) => x.enabled && x.text?.trim()).map((x) => Number(x.afterHours) || 0));
  if (!Number.isFinite(first)) return { ok: true, skipped: "no follow-up messages" };

  const db = getServerSupabase();
  const from = new Date(nowMs - FOLLOWUP_WINDOW_H * 3600000).toISOString();
  const to = new Date(nowMs - first * 3600000).toISOString();
  const { data, error } = await db
    .from("chat_conversations")
    .select("id, psid, name, last_customer_at, followup_step, gender")
    .eq("ai_enabled", true)
    .gte("last_customer_at", from)
    .lte("last_customer_at", to)
    .limit(300);
  if (error) {
    const missing = /followup_step|gender/.test(error.message || "");
    return { ok: false, error: missing ? "run supabase-migration-chat-followup.sql" : error.message };
  }

  const sent: string[] = [];
  const failed: string[] = [];
  const log: FollowUpLogEntry[] = [];
  for (const c of (data ?? []) as FollowUpConv[]) {
    // Newest message in the chat, and whether an order came out of it.
    const [{ data: last }, { data: orderNote }] = await Promise.all([
      db.from("chat_messages").select("direction, sender").eq("conversation_id", c.id).order("created_at", { ascending: false }).limit(1).maybeSingle(),
      db.from("chat_messages").select("id").eq("conversation_id", c.id).eq("sender", "admin").like("text", "🧾%").limit(1).maybeSingle(),
    ]);
    const i = dueStep(c, steps, nowMs, last as any, !!orderNote);
    if (i === null) continue;

    const text = messengerText(personalize(steps[i].text, (c.gender as Gender) || undefined));
    const r = c.psid.startsWith("wa:") ? await waSendText(s, c.psid.slice(3), text) : await sendText(s.pageAccessToken, c.psid, text);
    const nowIso = new Date().toISOString();
    const channel = c.psid.startsWith("wa:") ? "whatsapp" as const : "messenger" as const;
    log.push({ at: nowIso, convId: c.id, name: c.name ?? null, step: i + 1, channel, ok: r.ok, ...(r.ok ? {} : { error: String(r.error ?? "") }) });
    if (!r.ok) {
      failed.push(`${c.id}: ${r.error}`);
      // Don't retry the same step forever (e.g. the customer blocked the Page).
      await db.from("chat_conversations").update({ followup_step: i + 1 }).eq("id", c.id);
      continue;
    }
    await db.from("chat_messages").insert({ conversation_id: c.id, direction: "out", sender: "ai", text, mid: r.mid ?? null });
    await db.from("chat_conversations").update({
      followup_step: i + 1,
      followup_at: nowIso,
      last_message: `🔔 ফলো-আপ ${i + 1}: ${text.split("\n")[0]}`.slice(0, 200),
      last_message_at: nowIso,
    }).eq("id", c.id);
    sent.push(`${c.id} → #${i + 1}`);
  }
  await logFollowUps(log);
  return { ok: true, checked: (data ?? []).length, sent, failed };
}
