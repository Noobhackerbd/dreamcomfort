"use server";

import { requireAdmin } from "@/lib/admin-auth";
import { getServerSupabase } from "@/lib/supabase/server";
import {
  getChatbotSettings, saveChatbotSettings, fbApp, aiReply, extractProductCards, extractPriceTag, extractOrderTag, extractNoMatchTag, extractGreetTag, extractMatchTag, extractConfirmTag, extractItemsTag, extractHumanTag, pricePhotos, usePriceReply, messengerText, personalize,
  type PriceReply, type OrderReply, type NoMatchReply, type GreetReply, type MatchReply, type ConfirmReply, type ItemsReply, getStoreProductsForTraining,
  CHATBOT_MODEL_DEFAULT, type ChatbotProduct, type ChatbotReplyExample, type ChatTurn, type ChatImage,
} from "@/lib/chatbot";
import { sendText, checkPageToken, fetchPhoto } from "@/lib/messenger";
import { waSendText, waCheck, waConnect } from "@/lib/whatsapp";
import { splitPhotos } from "@/lib/chat-media";
import { parseConfirmDetails, priceChatOrder } from "@/lib/chat-orders";
import { isAdOpener } from "@/lib/chat-engine";
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
      handoffUnknown: s.handoffUnknown !== false,
      productCards: s.productCards !== false,
      maxReplyTokens: s.maxReplyTokens,
      usdToBdt: s.usdToBdt,
      wa: {
        enabled: s.waEnabled,
        phoneNumberId: s.waPhoneNumberId,
        businessId: s.waBusinessId,
        token: mask(s.waToken),
        display: s.waDisplay,
      },
    },
    training: { botName: s.botName, storeInfo: s.storeInfo, products: s.products, examples: s.examples, priceReply: s.priceReply, orderReply: s.orderReply, noMatchReply: s.noMatchReply, greetReply: s.greetReply, matchReply: s.matchReply, confirmReply: s.confirmReply, itemsReply: s.itemsReply },
  };
}

export async function saveTraining(input: {
  botName: string; storeInfo: string; products: ChatbotProduct[]; examples: ChatbotReplyExample[]; priceReply?: PriceReply; orderReply?: OrderReply; noMatchReply?: NoMatchReply; greetReply?: GreetReply; matchReply?: MatchReply; confirmReply?: ConfirmReply; itemsReply?: ItemsReply;
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
      priceReply: input.priceReply
        ? {
            enabled: !!input.priceReply.enabled,
            photoMode: input.priceReply.photoMode === "picture" ? "picture" : "products",
            text: clean(input.priceReply.text, 1900),
            image: /^https:\/\//.test(String(input.priceReply.image || "")) ? clean(input.priceReply.image, 600) : "",
          }
        : s.priceReply,
      orderReply: input.orderReply
        ? { enabled: !!input.orderReply.enabled, text: clean(input.orderReply.text, 1900) }
        : s.orderReply,
      noMatchReply: input.noMatchReply
        ? { enabled: !!input.noMatchReply.enabled, text: clean(input.noMatchReply.text, 1900) }
        : s.noMatchReply,
      greetReply: input.greetReply
        ? { enabled: !!input.greetReply.enabled, text: clean(input.greetReply.text, 1900) }
        : s.greetReply,
      matchReply: input.matchReply
        ? { enabled: !!input.matchReply.enabled, text: clean(input.matchReply.text, 1900) }
        : s.matchReply,
      confirmReply: input.confirmReply
        ? {
            enabled: !!input.confirmReply.enabled,
            text: clean(input.confirmReply.text, 1900),
            createOrder: input.confirmReply.createOrder !== false,
            productName: clean(input.confirmReply.productName, 200).trim(),
            productPrice: Math.max(0, Number(input.confirmReply.productPrice) || 0),
            shippingInside: Math.max(0, Number(input.confirmReply.shippingInside) || 0),
            shippingOutside: Math.max(0, Number(input.confirmReply.shippingOutside) || 0),
          }
        : s.confirmReply,
      itemsReply: input.itemsReply
        ? { enabled: !!input.itemsReply.enabled, text: clean(input.itemsReply.text, 1900) }
        : s.itemsReply,
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
  appId?: string; fbConfigId?: string; model: string; autoReply: boolean; pauseAiOnManual: boolean; photoMatch?: boolean; productCards?: boolean; handoffUnknown?: boolean; maxReplyTokens: number; usdToBdt: number;
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
  if (input.handoffUnknown !== undefined) next.handoffUnknown = !!input.handoffUnknown;
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

/**
 * WhatsApp: save the number's details (an empty token keeps the saved one), check the
 * number, subscribe the account to the app and register /api/whatsapp.
 */
export async function connectWhatsApp(input: { enabled: boolean; phoneNumberId: string; businessId: string; token?: string }) {
  await requireAdmin();
  const s = await getChatbotSettings();
  const next = { ...s };
  next.waPhoneNumberId = String(input.phoneNumberId || "").replace(/\D/g, "").slice(0, 30);
  next.waBusinessId = String(input.businessId || "").replace(/\D/g, "").slice(0, 30);
  if ((input.token || "").trim()) next.waToken = input.token!.trim();
  next.waEnabled = !!input.enabled;
  if (!next.verifyToken) {
    const a = new Uint8Array(12); crypto.getRandomValues(a);
    next.verifyToken = "dc-" + Array.from(a, (b) => b.toString(16).padStart(2, "0")).join("");
  }
  if (!next.waEnabled) {
    await saveChatbotSettings(next);
    return { ok: true, display: next.waDisplay, warnings: [] as string[], token: mask(next.waToken) };
  }
  const check = await waCheck(next);
  if (!check.ok) {
    await saveChatbotSettings({ ...next, waEnabled: false });
    return { ok: false, error: `WhatsApp didn't accept these details: ${check.error}`, token: mask(next.waToken) };
  }
  next.waDisplay = [check.display, check.name].filter(Boolean).join(" · ");
  await saveChatbotSettings(next); // saved before the webhook check — Facebook verifies it right away
  const warnings = await waConnect(next, siteOrigin());
  return { ok: true, display: next.waDisplay, warnings, token: mask(next.waToken), verifyToken: next.verifyToken };
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
    whatsapp: !s.waEnabled
      ? null
      : await waCheck(s).then((w) => (w.ok ? { ok: true, detail: `Connected: ${[w.display, w.name].filter(Boolean).join(" · ")}` } : { ok: false, detail: w.error || "Failed" })),
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
  botName: string; storeInfo: string; products: ChatbotProduct[]; examples: ChatbotReplyExample[]; priceReply?: PriceReply; orderReply?: OrderReply; noMatchReply?: NoMatchReply; greetReply?: GreetReply; matchReply?: MatchReply; confirmReply?: ConfirmReply; itemsReply?: ItemsReply;
}, customerName?: string) {
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
  let r = await aiReply(clean, merged, String(customerName || "").slice(0, 80));
  // Same as the live bot: the ad's ready-made first message gets the saved price reply.
  const customerTurns = clean.filter((t) => t.role === "customer");
  if (customerTurns.length === 1 && usePriceReply(merged) && isAdOpener(customerTurns[0].text)) {
    r = { ...r, ok: true, reply: "[[PRICE]]" };
  }
  if (!r.ok || !r.reply) return { ...r, cards: [] as ReturnType<typeof extractProductCards>["cards"], priceImage: "", usdToBdt: s.usdToBdt };
  const hu = extractHumanTag(r.reply, merged);
  if (hu.human) {
    return {
      ...r, reply: "", orderPreview: "🙋 AI doesn't know this — on Facebook/WhatsApp it would send NOTHING, pause the AI in that chat and leave it for you in the Inbox.",
      cards: [] as ReturnType<typeof extractProductCards>["cards"], priceImage: "", usdToBdt: s.usdToBdt,
    };
  }
  const gr = extractGreetTag(hu.text, merged);
  const mt = extractMatchTag(gr.text, merged);
  const cf = extractConfirmTag(mt.text, merged);
  const it = extractItemsTag(cf.text, merged);
  if (gr.greet || mt.match || cf.confirm || it.items) {
    const saved = gr.greet ? merged.greetReply.text : mt.match ? merged.matchReply.text : cf.confirm ? merged.confirmReply.text : merged.itemsReply.text;
    // Test only: show the order that WOULD be created — nothing is saved.
    let orderPreview = "";
    if (cf.confirm && merged.confirmReply.createOrder !== false) {
      const d = parseConfirmDetails(cf.json);
      if (!d) orderPreview = "⚠️ Order would NOT be created: name, address or a valid 01… number is missing.";
      else {
        const p = await priceChatOrder(merged, d);
        orderPreview = p.subtotal
          ? `🧾 Order that would be created (test — not saved):\n${d.name} · ${d.phone}\n${d.address} (${d.area === "inside" ? "ঢাকার ভিতরে" : "ঢাকার বাইরে"})\n` +
            p.lines.map((l) => `• ${l.product_name} × ${l.quantity} = ৳${l.line_total}`).join("\n") +
            `\nডেলিভারি ৳${p.shipping} · মোট ৳${p.total}`
          : "⚠️ Order would NOT be created: set the chat order price in Saved replies → Order confirmed.";
      }
    }
    return { ...r, reply: messengerText(personalize(saved, r.gender)), orderPreview, cards: [] as ReturnType<typeof extractProductCards>["cards"], priceImage: "", usdToBdt: s.usdToBdt };
  }
  const nm = extractNoMatchTag(it.text, merged);
  if (nm.noMatch) {
    return {
      ...r, reply: messengerText(personalize(merged.noMatchReply.text, r.gender)), cards: [] as ReturnType<typeof extractProductCards>["cards"],
      priceImage: "", priceImages: nm.similar ? [nm.similar.image] : pricePhotos(merged).map((p) => p.url), pictureAfter: true, usdToBdt: s.usdToBdt,
    };
  }
  const pt = extractPriceTag(nm.text, merged);
  if (pt.price) {
    return { ...r, reply: messengerText(personalize(merged.priceReply.text, r.gender)), cards: [] as ReturnType<typeof extractProductCards>["cards"], priceImage: "", priceImages: pricePhotos(merged).map((p) => p.url), usdToBdt: s.usdToBdt };
  }
  const ot = extractOrderTag(pt.text, merged);
  if (ot.order) {
    return { ...r, reply: messengerText(personalize(merged.orderReply.text, r.gender)), cards: [] as ReturnType<typeof extractProductCards>["cards"], priceImage: "", usdToBdt: s.usdToBdt };
  }
  const { text, cards } = extractProductCards(ot.text, merged);
  return { ...r, reply: text || (cards.length ? "আমাদের পণ্যগুলোর ছবি আর দাম নিচে দিলাম 👇" : r.reply), cards, priceImage: "", usdToBdt: s.usdToBdt };
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
  const isWa = String(conv.psid).startsWith("wa:");
  const sent = isWa
    ? await waSendText(s, String(conv.psid).slice(3), messengerText(body))
    : await sendText(s.pageAccessToken, conv.psid, body, outside24h);
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
  const { data: conv } = await db.from("chat_conversations").select("name").eq("id", id).maybeSingle();
  const r = await aiReply(history, s, conv?.name);
  // A draft is plain text you edit and send yourself — no product-photo tag in it.
  if (!r.ok) return { ok: false, error: r.error };
  const gr = extractGreetTag(extractHumanTag(r.reply!, s).text, s);
  const mt = extractMatchTag(gr.text, s);
  const cf = extractConfirmTag(mt.text, s);
  const it = extractItemsTag(cf.text, s);
  const nm = extractNoMatchTag(it.text, s);
  const pt = extractPriceTag(nm.text, s);
  const ot = extractOrderTag(pt.text, s);
  const g = r.gender;
  const draft = gr.greet ? messengerText(personalize(s.greetReply.text, g)) : mt.match ? messengerText(personalize(s.matchReply.text, g)) : cf.confirm ? messengerText(personalize(s.confirmReply.text, g)) : it.items ? messengerText(personalize(s.itemsReply.text, g)) : nm.noMatch ? messengerText(personalize(s.noMatchReply.text, g)) : pt.price ? messengerText(personalize(s.priceReply.text, g)) : ot.order ? messengerText(personalize(s.orderReply.text, g)) : extractProductCards(ot.text, s).text;
  return { ok: true, draft, costUsd: r.costUsd };
}
