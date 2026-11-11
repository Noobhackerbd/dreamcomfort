// lib/chat-comments.ts — the AI Chat Bot answers comments on the Page's posts and ads.
//
// A new comment arrives on the Page "feed" webhook. The AI reads it like a chat message:
//   • it needs a human ([[HUMAN]]) or it's just a greeting / compliment → we do nothing;
//   • otherwise the matching saved reply (price, what's included, filling, fabric, order
//     form…) or the AI's own short answer goes to the commenter's Messenger as a
//     "private reply" (Facebook allows ONE per comment, within 7 days), and
//   • a short public reply goes under the comment ("আপু, ইনবক্সে বিস্তারিত পাঠিয়েছি 💗").
// The commenter then appears in Admin → AI Chat Bot → Inbox; when they write back, the
// normal chat (AI replies, follow-ups) takes over.
import "server-only";
import { getServerSupabase } from "@/lib/supabase/server";
import {
  aiReply, extractHumanTag, extractGreetTag, extractMatchTag, extractConfirmTag, extractItemsTag, extractMaterialTag,
  extractFabricTag, extractNoMatchTag, extractPriceTag, extractOrderTag, extractProductCards, messengerText, personalize,
  type ChatbotSettings,
} from "@/lib/chatbot";
import { getOrCreateConversation } from "@/lib/chat-engine";

const GRAPH = "https://graph.facebook.com/v23.0";

/** What to send privately for an AI reply, or null to stay quiet. Pure — unit-testable. */
export function privateTextFor(reply: string, s: ChatbotSettings, gender?: "F" | "M" | "U"): string | null {
  const hu = extractHumanTag(reply, s);
  if (hu.human) return null;                       // the AI doesn't know → leave it for you
  const gr = extractGreetTag(hu.text, s);
  if (gr.greet) return null;                       // "nice", "😍", "hi" — no need to DM them
  const mt = extractMatchTag(gr.text, s);
  const cf = extractConfirmTag(mt.text, s);
  const it = extractItemsTag(cf.text, s);
  const ma = extractMaterialTag(it.text, s);
  const fb = extractFabricTag(ma.text, s);
  const nm = extractNoMatchTag(fb.text, s);
  const pt = extractPriceTag(nm.text, s);
  const ot = extractOrderTag(pt.text, s);
  const saved =
    it.items ? s.itemsReply.text :
    ma.material ? s.materialReply.text :
    fb.fabric ? s.fabricReply.text :
    pt.price ? s.priceReply.text :
    ot.order ? s.orderReply.text :
    cf.confirm ? s.orderReply.text : // details typed in a comment → ask again privately
    null;
  const text = saved ?? extractProductCards(ot.text, s).text;
  const out = messengerText(personalize(text, gender)).trim();
  return out || null;
}

async function graphPost(path: string, token: string, body: Record<string, unknown>) {
  const r = await fetch(`${GRAPH}${path}?access_token=${encodeURIComponent(token)}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(12_000),
  });
  const j: any = await r.json().catch(() => ({}));
  return { ok: r.ok && !j?.error, j, error: j?.error?.message as string | undefined };
}

/** The last 30 comment events, kept in settings ("chatbot_comment_log") so problems can be
 *  seen without the hosting logs. Best-effort, never throws. */
async function logComment(entry: Record<string, unknown>) {
  try {
    const db = getServerSupabase();
    const { data } = await db.from("settings").select("value").eq("key", "chatbot_comment_log").maybeSingle();
    const list = Array.isArray((data as any)?.value) ? ((data as any).value as unknown[]) : [];
    const next = [{ at: new Date().toISOString(), ...entry }, ...list].slice(0, 30);
    await db.from("settings").upsert({ key: "chatbot_comment_log", value: next, updated_at: new Date().toISOString() });
  } catch { /* ignore */ }
}

/** One "feed" webhook change. Never throws. */
export async function handleCommentChange(s: ChatbotSettings, change: any) {
  const v = change?.value;
  if (change?.field !== "feed" || v?.item !== "comment" || v?.verb !== "add") return;
  const commentId = String(v?.comment_id ?? "");
  const text = String(v?.message ?? "").trim();
  const fromId = String(v?.from?.id ?? "");
  // Our own replies come back on the same webhook — never answer them.
  if (fromId && fromId === String(s.pageId)) return;
  const log = (step: string, extra: Record<string, unknown> = {}) =>
    logComment({ step, commentId, text: text.slice(0, 120), from: v?.from?.name ?? null, ...extra });
  try {
    if (!s.autoReply) return void (await log("skipped: bot is off"));
    if (!s.commentReply?.enabled) return void (await log("skipped: comment replies are off"));
    if (!s.pageAccessToken) return void (await log("skipped: Page not connected"));
    if (!commentId || !text) return void (await log("skipped: no text (photo / sticker)"));
    const name = String(v?.from?.name ?? "").trim() || null;

    const ai = await aiReply([{ role: "customer", text: `(Facebook কমেন্ট) ${text}` }], s, name);
    if (!ai.ok || !ai.reply) return void (await log("AI failed", { error: (ai as any).error ?? null }));
    const priv = privateTextFor(ai.reply, s, ai.gender);
    if (!priv) return void (await log("skipped: greeting or needs you", { ai: ai.reply.slice(0, 160) }));

    // 1) Private reply → their Messenger. Facebook allows one per comment, so a retried
    //    webhook fails here and nothing is sent twice.
    const pr = await graphPost("/me/messages", s.pageAccessToken, { recipient: { comment_id: commentId }, message: { text: priv.slice(0, 1990) } });
    if (!pr.ok) { console.error("[comments] private reply failed:", pr.error); return void (await log("private reply failed", { error: pr.error })); }

    // 2) Short public reply under the comment.
    const pub = messengerText(personalize(s.commentReply.text || "", ai.gender)).trim();
    let publicError: string | null = null;
    if (pub) {
      const cr = await graphPost(`/${encodeURIComponent(commentId)}/comments`, s.pageAccessToken, { message: pub });
      if (!cr.ok) { publicError = cr.error || "failed"; console.error("[comments] public reply failed:", cr.error); }
    }
    await log(publicError ? "sent privately, public reply failed" : "sent", { publicError, reply: priv.slice(0, 120) });

    // 3) Inbox: the commenter becomes a chat, so their reply continues normally.
    const psid = String(pr.j?.recipient_id ?? "");
    if (!psid) return;
    const db = getServerSupabase();
    const conv = await getOrCreateConversation(psid, async () => ({ name, avatar: null }));
    if (!conv) return;
    const nowIso = new Date().toISOString();
    await db.from("chat_messages").insert({ conversation_id: conv.id, direction: "in", sender: "customer", text: `💬 কমেন্ট: ${text}`, mid: `comment:${commentId}` });
    await db.from("chat_messages").insert({ conversation_id: conv.id, direction: "out", sender: "ai", text: priv, mid: pr.j?.message_id ?? null });
    await db.from("chat_conversations").update({
      last_message: `💬 ${text}`.slice(0, 200),
      last_message_at: nowIso,
      unread: (conv.unread ?? 0) + 1,
    }).eq("id", conv.id);
    if (ai.gender) await db.from("chat_conversations").update({ gender: ai.gender }).eq("id", conv.id);
  } catch (e: any) {
    console.error("[comments] failed", e);
    await log("error", { error: String(e?.message ?? e) });
  }
}
