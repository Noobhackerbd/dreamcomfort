"use server";

import { requireAdmin } from "@/lib/admin-auth";
import { getServerSupabase } from "@/lib/supabase/server";
import {
  getChatbotSettings, saveChatbotSettings, fbApp, aiReply, extractProductCards, getStoreProductsForTraining,
  CHATBOT_MODEL_DEFAULT, type ChatbotProduct, type ChatbotReplyExample, type ChatTurn, type ChatImage,
} from "@/lib/chatbot";
import { sendText, checkPageToken, fetchPhoto } from "@/lib/messenger";
import { splitPhotos } from "@/lib/chat-media";
import { headers } from "next/headers";
import { readPending, clearPending, connectPage, disconnectPage } from "@/lib/facebook-connect";

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
      appId: fbApp(s).appId,
      fbAppFromEnv: fbApp(s).fromEnv,
      fbConfigId: s.fbConfigId,
      page: s.pageId ? { id: s.pageId, name: s.pageName, by: s.connectedBy, at: s.connectedAt } : null,
      model: s.model || CHATBOT_MODEL_DEFAULT,
      autoReply: s.autoReply,
      pauseAiOnManual: s.pauseAiOnManual,
      photoMatch: s.photoMatch !== false,
      productCards: s.productCards !== false,
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
        .map((p) => ({
          name: clean(p.name, 200), price: clean(p.price, 120), details: clean(p.details, 1200),
          image: /^https:\/\//.test(String(p.image || "")) ? clean(p.image, 600) : "",
          url: /^https:\/\//.test(String(p.url || "")) ? clean(p.url, 600) : "",
        }))
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
  appId?: string; fbConfigId?: string; model: string; autoReply: boolean; pauseAiOnManual: boolean; photoMatch?: boolean; productCards?: boolean; maxReplyTokens: number; usdToBdt: number;
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
  if (input.appId !== undefined) next.appId = String(input.appId).replace(/\D/g, "").slice(0, 30);
  if (input.fbConfigId !== undefined) next.fbConfigId = String(input.fbConfigId).replace(/\D/g, "").slice(0, 30);
  // A token pasted by hand replaces one connected with Facebook login.
  if ((input.pageAccessToken || "").trim()) { next.pageId = ""; next.pageName = ""; next.connectedBy = ""; next.connectedAt = ""; }
  if (input.clear?.includes("pageAccessToken")) { next.pageId = ""; next.pageName = ""; }
  next.model = (input.model || CHATBOT_MODEL_DEFAULT).trim();
  next.autoReply = !!input.autoReply;
  next.pauseAiOnManual = !!input.pauseAiOnManual;
  if (input.photoMatch !== undefined) next.photoMatch = !!input.photoMatch;
  if (input.productCards !== undefined) next.productCards = !!input.productCards;
  next.maxReplyTokens = Math.min(Math.max(Math.round(Number(input.maxReplyTokens) || 350), 80), 1000);
  next.usdToBdt = Math.max(1, Number(input.usdToBdt) || 124);
  try {
    await saveChatbotSettings(next);
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e?.message || "Save failed." };
  }
}

/** The big on/off switch: when off, messages still arrive in the inbox but the AI stays quiet. */
export async function setBotEnabled(on: boolean) {
  await requireAdmin();
  try {
    const s = await getChatbotSettings();
    await saveChatbotSettings({ ...s, autoReply: !!on });
    return { ok: true, on: !!on };
  } catch (e: any) {
    return { ok: false, error: e?.message || "Save failed." };
  }
}

// ------------------------------------------------------ Continue with Facebook --

/** After Facebook login with several Pages: the list to choose from (no tokens). */
export async function listPendingPages() {
  await requireAdmin();
  const p = await readPending();
  if (!p) return { ok: false, error: "The Facebook login expired. Press Continue with Facebook again.", pages: [] as any[] };
  return {
    ok: true,
    user: p.user,
    pages: p.pages.map((x) => ({ id: x.id, name: x.name, picture: x.picture, canMessage: x.canMessage })),
  };
}

function siteOrigin() {
  const h = headers();
  const origin = h.get("origin");
  if (origin) return origin;
  const host = h.get("x-forwarded-host") || h.get("host") || "";
  const proto = h.get("x-forwarded-proto") || (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

export async function choosePage(pageId: string) {
  await requireAdmin();
  const p = await readPending();
  const page = p?.pages.find((x) => x.id === pageId);
  if (!p || !page) return { ok: false, error: "The Facebook login expired. Press Continue with Facebook again." };
  try {
    const { warnings } = await connectPage(page, p.user, siteOrigin());
    await clearPending();
    const s = await getChatbotSettings();
    return {
      ok: true, warnings,
      page: { id: s.pageId, name: s.pageName, by: s.connectedBy, at: s.connectedAt },
      verifyToken: s.verifyToken, pageAccessToken: mask(s.pageAccessToken),
    };
  } catch (e: any) {
    return { ok: false, error: e?.message || "Could not connect the Page." };
  }
}

export async function disconnectFacebook() {
  await requireAdmin();
  try {
    await disconnectPage();
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e?.message || "Could not disconnect." };
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
    appSecret: !!fbApp(s).appSecret,
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
  const OK_TYPES = ["image/jpeg", "image/png", "image/webp"];
  const clean: ChatTurn[] = history.slice(-12).map((t) => ({
    role: t.role === "shop" ? "shop" : "customer",
    text: String(t.text || "").slice(0, 2000),
    images: (t.images ?? [])
      .filter((i) => OK_TYPES.includes(i?.mediaType) && typeof i?.data === "string" && i.data.length < 1_500_000)
      .slice(0, 3),
  }));
  const r = await aiReply(clean, merged);
  if (!r.ok || !r.reply) return { ...r, cards: [] as ReturnType<typeof extractProductCards>["cards"], usdToBdt: s.usdToBdt };
  const { text, cards } = extractProductCards(r.reply, merged);
  return { ...r, reply: text || (cards.length ? "আমাদের পণ্যগুলোর ছবি আর দাম নিচে দিলাম 👇" : r.reply), cards, usdToBdt: s.usdToBdt };
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
    role: r.direction === "in" ? "customer" : "shop", text: splitPhotos(r.text).text,
  }));
  // The newest customer photos, so the draft can name the product.
  const lastIn = (rows ?? []).find((r: any) => r.direction === "in");
  const urls = lastIn ? splitPhotos(lastIn.text).photos : [];
  if (urls.length) {
    const imgs = (await Promise.all(urls.slice(0, 3).map(fetchPhoto))).filter(Boolean) as ChatImage[];
    const lastCustomer = [...history].reverse().find((t) => t.role === "customer");
    if (imgs.length && lastCustomer) lastCustomer.images = imgs;
  }
  // The draft must answer the customer; if the last word was ours, add a nudge.
  if (!history.length || history[history.length - 1].role !== "customer") {
    history.push({ role: "customer", text: "(follow up with the customer politely)" });
  }
  const s = await getChatbotSettings();
  const r = await aiReply(history, s);
  // A draft is plain text you edit and send yourself — no product-photo tag in it.
  return r.ok ? { ok: true, draft: extractProductCards(r.reply!, s).text, costUsd: r.costUsd } : { ok: false, error: r.error };
}
