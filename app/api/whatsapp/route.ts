// app/api/whatsapp/route.ts — WhatsApp webhook for the AI Chat Bot.
//
// GET  — Facebook's one-time "verify" handshake (same verify token as Messenger).
// POST — every message to the connected WhatsApp number. Stored in the same inbox as
//        Messenger (conversation key "wa:<number>") and answered by the same engine.
// Signed with the same App Secret as Messenger; retries are deduped by message id.

import { NextResponse, type NextRequest } from "next/server";
import { getChatbotSettings, fbApp, type ChatImage, type ChatbotSettings } from "@/lib/chatbot";
import { verifySignature } from "@/lib/messenger";
import { waSendText, waSendImages, waSendCards, waTyping, waFetchPhoto } from "@/lib/whatsapp";
import { PHOTO_LABEL, withPhotos } from "@/lib/chat-media";
import { getOrCreateConversation, handleCustomerMessage, type ChatChannel } from "@/lib/chat-engine";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 30;

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const s = await getChatbotSettings();
  if (sp.get("hub.mode") === "subscribe" && s.verifyToken && sp.get("hub.verify_token") === s.verifyToken) {
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
  if (body?.object !== "whatsapp_business_account" || !s.waEnabled) return new NextResponse("ok");

  for (const entry of body.entry ?? []) {
    for (const change of entry.changes ?? []) {
      const v = change?.value;
      if (change?.field !== "messages" || !v?.messages?.length) continue; // delivery/read statuses
      if (s.waPhoneNumberId && v.metadata?.phone_number_id && String(v.metadata.phone_number_id) !== s.waPhoneNumberId) continue;
      const names = new Map<string, string>((v.contacts ?? []).map((c: any) => [String(c.wa_id), String(c.profile?.name || "")]));
      for (const m of v.messages) {
        try {
          await handleWaMessage(s, m, names.get(String(m.from)) || null);
        } catch (e) {
          console.error("[whatsapp] message failed", e);
        }
      }
    }
  }
  return new NextResponse("ok"); // always 200, or Facebook retries
}

const OTHER: Record<string, string> = {
  audio: "🎤 ভয়েস মেসেজ", voice: "🎤 ভয়েস মেসেজ", video: "🎬 ভিডিও পাঠিয়েছেন", document: "📎 ফাইল পাঠিয়েছেন",
  sticker: "📎 স্টিকার", location: "📍 লোকেশন পাঠিয়েছেন", contacts: "👤 কন্টাক্ট পাঠিয়েছেন",
};

async function handleWaMessage(s: ChatbotSettings, m: any, profileName: string | null) {
  const from = String(m?.from || "");
  if (!from) return;
  const type = String(m?.type || "");
  const typed: string =
    m?.text?.body ||
    m?.button?.text ||
    m?.interactive?.button_reply?.title ||
    m?.interactive?.list_reply?.title ||
    "";

  // A photo: fetched now so the inbox can show it (kept in Storage) and the AI can see it.
  let photo: { mediaType: string; data: string; url: string | null } | null = null;
  if (type === "image" && m?.image?.id) photo = await waFetchPhoto(s, String(m.image.id));
  const caption: string = m?.image?.caption || "";

  const baseText = typed || (type === "image" ? (caption ? `${PHOTO_LABEL}\n${caption}` : PHOTO_LABEL) : OTHER[type] || (type ? `📎 ${type}` : ""));
  if (!baseText) return;
  const photoUrls = photo?.url ? [photo.url] : [];

  const conv = await getOrCreateConversation(`wa:${from}`, async () => ({ name: profileName, avatar: null }));
  if (!conv) return;

  await handleCustomerMessage(s, whatsappChannel(s), {
    conv,
    to: from,
    text: withPhotos(baseText, photoUrls),
    baseText,
    mid: m?.id ? String(m.id) : null,
    photoUrls: photo ? (photoUrls.length ? photoUrls : ["(photo)"]) : [],
    isPlainText: !!typed || (type === "image" && !!caption),
    loadPhotos: async () => (photo ? [{ mediaType: photo.mediaType, data: photo.data } as ChatImage] : []),
  });
}

/** How the engine sends on WhatsApp. */
function whatsappChannel(s: ChatbotSettings): ChatChannel {
  return {
    name: "whatsapp",
    sendText: (to, body) => waSendText(s, to, body),
    sendImages: (to, urls) => waSendImages(s, to, urls),
    sendCards: (to, cards) => waSendCards(s, to, cards),
    typing: (_to, mid) => { void waTyping(s, mid); },
  };
}
