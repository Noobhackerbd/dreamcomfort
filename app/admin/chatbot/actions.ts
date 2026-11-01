"use server";

import { requireAdmin } from "@/lib/admin-auth";
import { getServerSupabase } from "@/lib/supabase/server";
import {
  getChatbotSettings, saveChatbotSettings, aiReply, getStoreProductsForTraining,
  CHATBOT_MODEL_DEFAULT, type ChatbotProduct, type ChatbotReplyExample, type ChatTurn,
} from "@/lib/chatbot";
import { sendText, checkPageToken } from "@/lib/messenger";

const mask = (v: string) => (v ? "••••" + v.slice(-4) : "");

/** Everything the admin screen needs — with secrets masked, never the real values. */
export async function loadChatbotAdmin() {
  await requireAdmin();
  const s = await getChatbotSettings();
  return {
    connection: {
      pageAccessToken: mask(s.pageAccessToken),
      appSecret: mask(s.appSecret),
      anthropicKey: mask(s.anthropicKey),
      verifyToken: s.verifyToken,
      model: s.model || CHATBOT_MODEL_DEFAULT,
      autoReply: s.autoReply,
      pauseAiOnManual: s.pauseAiOnManual,
      maxReplyTokens: s.maxReplyTokens,
      usdToBdt: s.usdToBdt,
    },
    training: { botName: s.botName, storeInfo: s.storeInfo, products: s.products, examples: s.examples },
  };
}

export async function saveTraining(input: {
  botName: string; storeInfo: string; products: ChatbotProduct[]; examples: ChatbotReplyExample[];
}) {
  await requireAdmin();
  const s = await getChatbotSettings();
  const clean = (v: unknown, n: number) => String(v ?? "").slice(0, n);
  try {
    await saveChatbotSettings({
      ...s,
      botName: clean(input.botName, 80).trim() || s.botName,
      storeInfo: clean(input.storeInfo, 6000),
      products: (input.products || [])
        .map((p) => ({ name: clean(p.name, 200), price: clean(p.price, 120), details: clean(p.details, 1200) }))
        .filter((p) => p.name.trim())
        .slice(0, 150),
      examples: (input.examples || [])
        .map((e) => ({ question: clean(e.question, 400), answer: clean(e.answer, 1500) }))
        .filter((e) => e.question.trim() && e.answer.trim())
        .slice(0, 150),
    });
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e?.message || "Save failed." };
  }
}

/**
 * Secrets are only replaced when a new value is typed; an empty box keeps what is saved.
 * `clear` names a secret to remove on purpose.
 */
export async function saveConnection(input: {
  pageAccessToken?: string; appSecret?: string; anthropicKey?: string; verifyToken: string;
  model: string; autoReply: boolean; pauseAiOnManual: boolean; maxReplyTokens: number; usdToBdt: number;
  clear?: ("pageAccessToken" | "appSecret" | "anthropicKey")[];
}) {
  await requireAdmin();
  const s = await getChatbotSettings();
  const next = { ...s };
  for (const k of ["pageAccessToken", "appSecret", "anthropicKey"] as const) {
    const v = (input[k] || "").trim();
    if (v) next[k] = v;
    if (input.clear?.includes(k)) next[k] = "";
  }
  next.verifyToken = (input.verifyToken || "").trim().slice(0, 120);
  next.model = (input.model || CHATBOT_MODEL_DEFAULT).trim();
  next.autoReply = !!input.autoReply;
  next.pauseAiOnManual = !!input.pauseAiOnManual;
  next.maxReplyTokens = Math.min(Math.max(Math.round(Number(input.maxReplyTokens) || 350), 80), 1000);
  next.usdToBdt = Math.max(1, Number(input.usdToBdt) || 124);
  try {
    await saveChatbotSettings(next);
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e?.message || "Save failed." };
  }
}

export async function testConnection() {
  await requireAdmin();
  const s = await getChatbotSettings();
  const fb = await checkPageToken(s.pageAccessToken);
  const ai = await aiReply([{ role: "customer", text: "আসসালামু আলাইকুম" }], s);
  return {
    facebook: fb.ok ? { ok: true, detail: `Connected to page: ${fb.pageName}` } : { ok: false, detail: fb.error || "Failed" },
    ai: ai.ok
      ? { ok: true, detail: `AI answered (${ai.model}) — cost $${(ai.costUsd ?? 0).toFixed(6)}`, reply: ai.reply }
      : { ok: false, detail: ai.error || "Failed" },
    appSecret: !!s.appSecret,
    verifyToken: !!s.verifyToken,
  };
}

export async function importStoreProducts() {
  await requireAdmin();
  try {
    return { ok: true, products: await getStoreProductsForTraining() };
  } catch (e: any) {
    return { ok: false, error: e?.message || "Could not read products.", products: [] as ChatbotProduct[] };
  }
}

/** Try the bot without Facebook. Uses the training on screen, saved or not. */
export async function testChat(history: ChatTurn[], training?: {
  botName: string; storeInfo: string; products: ChatbotProduct[]; examples: ChatbotReplyExample[];
}) {
  await requireAdmin();
  const s = await getChatbotSettings();
  const merged = training ? { ...s, ...training } : s;
  const r = await aiReply(history.slice(-12), merged);
  return { ...r, usdToBdt: s.usdToBdt };
}

// ------------------------------------------------------------------ inbox --

function missingTable(e: any) {
  return !!e && (e.code === "42P01" || e.code === "PGRST205" || /chat_(conversations|messages)/i.test(e.message || ""));
}

export async function listConversations() {
  await requireAdmin();
  const db = getServerSupabase();
  const { data, error } = await db
    .from("chat_conversations")
    .select("id, psid, name, avatar, ai_enabled, unread, last_message, last_message_at, last_customer_at")
    .order("last_message_at", { ascending: false })
    .limit(200);
  if (error) return { ok: false, missingTable: missingTable(error), error: error.message, rows: [] as any[] };

  // AI spend over the last 30 days, for the header.
  const since = new Date(Date.now() - 30 * 86400000).toISOString();
  const { data: spend } = await db
    .from("chat_messages").select("cost_usd").eq("sender", "ai").gte("created_at", since).limit(20000);
  const costUsd = (spend ?? []).reduce((a: number, r: any) => a + Number(r.cost_usd || 0), 0);
  return { ok: true, rows: data ?? [], spend: { replies: (spend ?? []).length, costUsd } };
}

export async function getThread(id: string) {
  await requireAdmin();
  const db = getServerSupabase();
  const { data: messages, error } = await db
    .from("chat_messages")
    .select("id, direction, sender, text, cost_usd, input_tokens, output_tokens, created_at")
    .eq("conversation_id", id)
    .order("created_at", { ascending: true })
    .limit(500);
  if (error) return { ok: false, error: error.message, messages: [] as any[] };
  await db.from("chat_conversations").update({ unread: 0 }).eq("id", id);
  return { ok: true, messages: messages ?? [] };
}

export async function setConversationAi(id: string, enabled: boolean) {
  await requireAdmin();
  const { error } = await getServerSupabase().from("chat_conversations").update({ ai_enabled: enabled }).eq("id", id);
  return error ? { ok: false, error: error.message } : { ok: true };
}

/** You reply by hand. Sent to the customer on Messenger and stored as "admin". */
export async function sendManualReply(id: string, text: string) {
  await requireAdmin();
  const body = (text || "").trim();
  if (!body) return { ok: false, error: "Write a message first." };
  const db = getServerSupabase();
  const s = await getChatbotSettings();
  const { data: conv } = await db.from("chat_conversations").select("psid, last_customer_at").eq("id", id).maybeSingle();
  if (!conv) return { ok: false, error: "Conversation not found." };

  const last = conv.last_customer_at ? new Date(conv.last_customer_at).getTime() : 0;
  const outside24h = !last || Date.now() - last > 24 * 3600 * 1000;
  const sent = await sendText(s.pageAccessToken, conv.psid, body, outside24h);
  if (!sent.ok) return { ok: false, error: sent.error };

  await db.from("chat_messages").insert({
    conversation_id: id, direction: "out", sender: "admin", text: body, mid: sent.mid ?? null,
  });
  await db.from("chat_conversations").update({
    last_message: body.slice(0, 200),
    last_message_at: new Date().toISOString(),
    ...(s.pauseAiOnManual ? { ai_enabled: false } : {}),
  }).eq("id", id);
  return { ok: true, aiPaused: s.pauseAiOnManual };
}

/** AI drafts a reply for you to check and edit — nothing is sent. */
export async function suggestReply(id: string) {
  await requireAdmin();
  const db = getServerSupabase();
  const { data: rows } = await db
    .from("chat_messages")
    .select("direction, text")
    .eq("conversation_id", id)
    .order("created_at", { ascending: false })
    .limit(12);
  const history: ChatTurn[] = (rows ?? []).reverse().map((r: any) => ({
    role: r.direction === "in" ? "customer" : "shop", text: r.text,
  }));
  // The draft must answer the customer; if the last word was ours, add a nudge.
  if (!history.length || history[history.length - 1].role !== "customer") {
    history.push({ role: "customer", text: "(follow up with the customer politely)" });
  }
  const r = await aiReply(history);
  return r.ok ? { ok: true, draft: r.reply!, costUsd: r.costUsd } : { ok: false, error: r.error };
}
