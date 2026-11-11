// app/api/messenger/route.ts — Facebook Messenger webhook for the AI Chat Bot.
//
// GET  — Facebook's one-time "verify" handshake when you add the webhook in your app.
// POST — every message to your Page. We store it in the inbox, then (if AI is on for
//        that chat) the AI answers. Messages you send by hand from Facebook's own Page
//        inbox arrive here too ("echoes") and are stored, so the admin inbox stays complete.
//
// Facebook retries a POST that doesn't answer 200 within ~20 s. Incoming message ids are
// unique in the database, so a retry is recognised and never answered twice.

import { NextResponse, type NextRequest } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";
import { getChatbotSettings, fbApp, type ChatImage } from "@/lib/chatbot";
import { verifySignature, sendText, sendTyping, getProfile, fetchPhoto, sendProductCards, sendImages } from "@/lib/messenger";
import { PHOTO_LABEL, withPhotos } from "@/lib/chat-media";
import { getOrCreateConversation, handleCustomerMessage, type ChatChannel } from "@/lib/chat-engine";
import { handleCommentChange } from "@/lib/chat-comments";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 30;

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const s = await getChatbotSettings();
  if (
    sp.get("hub.mode") === "subscribe" &&
    s.verifyToken &&
    sp.get("hub.verify_token") === s.verifyToken
  ) {
    return new NextResponse(sp.get("hub.challenge") ?? "", { status: 200, headers: { "content-type": "text/plain" } });
  }
  return new NextResponse("Verification failed", { status: 403 });
}

export async function POST(req: NextRequest) {
  const raw = await req.text();
  const s = await getChatbotSettings();

  if (!verifySignature(raw, req.headers.get("x-hub-signature-256"), fbApp(s).appSecret)) {
    return new NextResponse("Bad signature", { status: 401 });
  }

  let body: any;
  try { body = JSON.parse(raw); } catch { return new NextResponse("Bad JSON", { status: 400 }); }
  if (body?.object !== "page") return new NextResponse("ok");

  const events: any[] = [];
  const changes: any[] = [];
  for (const entry of body.entry ?? []) {
    for (const ev of entry.messaging ?? []) events.push(ev);
    for (const ch of entry.changes ?? []) changes.push(ch); // Page feed: comments on posts / ads
  }
  for (const ch of changes) await handleCommentChange(s, ch);

  for (const ev of events) {
    try {
      await handleEvent(ev, s);
    } catch (e) {
      console.error("[messenger] event failed", e);
    }
  }
  // Always 200 — a non-200 makes Facebook retry and eventually disable the webhook.
  return new NextResponse("ok");
}

async function handleEvent(ev: any, s: Awaited<ReturnType<typeof getChatbotSettings>>) {
  const db = getServerSupabase();
  const msg = ev.message;
  const isEcho = !!msg?.is_echo;
  // For an echo the customer is the recipient; otherwise the sender.
  const psid: string | undefined = isEcho ? ev.recipient?.id : ev.sender?.id;
  if (!psid) return;

  // Our own sends (AI replies, product photos, replies from the admin inbox) come back as
  // echoes carrying our app id. They are stored by the code that sent them — ignore.
  if (isEcho && msg?.app_id && String(msg.app_id) === fbApp(s).appId) return;

  // Photos (not stickers — the 👍 button is a sticker too) can be read by the AI.
  const attachments: any[] = Array.isArray(msg?.attachments) ? msg.attachments : [];
  const photoUrls: string[] = attachments
    .filter((a) => a?.type === "image" && !a?.payload?.sticker_id && typeof a?.payload?.url === "string")
    .map((a) => a.payload.url as string)
    .slice(0, 3);
  const baseText: string =
    (msg?.text as string) ||
    (ev.postback?.title as string) ||
    (photoUrls.length ? PHOTO_LABEL : attachments.length ? "📎 " + (attachments[0]?.payload?.sticker_id ? "স্টিকার" : "ফাইল পাঠিয়েছেন") : "");
  if (!baseText) return;
  const text = withPhotos(baseText, photoUrls);
  const mid: string | null = msg?.mid || ev.postback?.mid || null;

  const conv = await getOrCreateConversation(psid, () => getProfile(s.pageAccessToken, psid));
  if (!conv) return;

  if (isEcho) {
    // Sent from the Page by someone else: a person in Facebook's own inbox, or the Page's
    // automatic greeting. Store it. Pause the AI only for a person — an echo within 20 s of
    // the customer's message (or before we've even seen one) is the automatic greeting.
    const { error } = await db.from("chat_messages").insert({
      conversation_id: conv.id, direction: "out", sender: "admin", text, mid,
    });
    if (!error) {
      const echoAt = Number(ev.timestamp) || Date.now();
      const lastCustomer = conv.last_customer_at ? new Date(conv.last_customer_at).getTime() : 0;
      const automatic = !lastCustomer || Math.abs(echoAt - lastCustomer) < 20_000;
      await db.from("chat_conversations").update({
        last_message: text.slice(0, 200),
        last_message_at: new Date().toISOString(),
        ...(s.pauseAiOnManual && !automatic ? { ai_enabled: false } : {}),
      }).eq("id", conv.id);
    }
    return;
  }

  // Stickers, videos, voice and files wait for a human. Photos go to the AI (if on).
  const isPlainText = !!msg?.text || !!ev.postback;
  await handleCustomerMessage(s, messengerChannel(s), {
    conv, to: psid, text, baseText, mid, photoUrls, isPlainText,
    fromAd: !!(msg?.referral || ev.referral || ev.postback?.referral), // click-to-Messenger ads
    loadPhotos: async () => (await Promise.all(photoUrls.map(fetchPhoto))).filter(Boolean) as ChatImage[],
  });
}

/** How the engine sends on Messenger. */
function messengerChannel(s: Awaited<ReturnType<typeof getChatbotSettings>>): ChatChannel {
  const t = s.pageAccessToken;
  return {
    name: "messenger",
    sendText: (to, body) => sendText(t, to, body),
    sendImages: (to, urls) => sendImages(t, to, urls),
    sendCards: (to, cards) => sendProductCards(t, to, cards),
    typing: (to) => { void sendTyping(t, to); },
  };
}
