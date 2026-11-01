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
import { getChatbotSettings, aiReply, type ChatTurn } from "@/lib/chatbot";
import { verifySignature, sendText, sendTyping, getProfile } from "@/lib/messenger";

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

  if (!verifySignature(raw, req.headers.get("x-hub-signature-256"), s.appSecret)) {
    return new NextResponse("Bad signature", { status: 401 });
  }

  let body: any;
  try { body = JSON.parse(raw); } catch { return new NextResponse("Bad JSON", { status: 400 }); }
  if (body?.object !== "page") return new NextResponse("ok");

  const events: any[] = [];
  for (const entry of body.entry ?? []) for (const ev of entry.messaging ?? []) events.push(ev);

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

  const text: string =
    (msg?.text as string) ||
    (ev.postback?.title as string) ||
    (msg?.attachments?.length ? "📎 " + (msg.attachments[0]?.type === "image" ? "ছবি পাঠিয়েছেন" : "ফাইল পাঠিয়েছেন") : "");
  if (!text) return;
  const mid: string | null = msg?.mid || ev.postback?.mid || null;

  const conv = await getOrCreateConversation(psid, s.pageAccessToken);
  if (!conv) return;

  if (isEcho) {
    // Sent from the Page. If we sent it (AI or the admin inbox) it is already stored under
    // the same mid and this insert is a no-op; if a person replied from Facebook's own
    // inbox it is new — store it, and pause the AI so it doesn't talk over them.
    const { error } = await db.from("chat_messages").insert({
      conversation_id: conv.id, direction: "out", sender: "admin", text, mid,
    });
    if (!error) {
      await db.from("chat_conversations").update({
        last_message: text.slice(0, 200),
        last_message_at: new Date().toISOString(),
        ...(s.pauseAiOnManual ? { ai_enabled: false } : {}),
      }).eq("id", conv.id);
    }
    return;
  }

  // Customer message. A duplicate mid means Facebook is retrying — already handled.
  const { error: insErr } = await db.from("chat_messages").insert({
    conversation_id: conv.id, direction: "in", sender: "customer", text, mid,
  });
  if (insErr) return;

  const now = new Date().toISOString();
  await db.from("chat_conversations").update({
    last_message: text.slice(0, 200),
    last_message_at: now,
    last_customer_at: now,
    unread: (conv.unread ?? 0) + 1,
  }).eq("id", conv.id);

  // Attachments (photos, stickers) wait for a human — the AI can't see them.
  const isPlainText = !!msg?.text || !!ev.postback;
  if (!s.autoReply || !conv.ai_enabled || !isPlainText) return;

  void sendTyping(s.pageAccessToken, psid);

  const { data: rows } = await db
    .from("chat_messages")
    .select("direction, text")
    .eq("conversation_id", conv.id)
    .order("created_at", { ascending: false })
    .limit(12);
  const history: ChatTurn[] = (rows ?? []).reverse().map((r: any) => ({
    role: r.direction === "in" ? "customer" : "shop",
    text: r.text,
  }));

  const ai = await aiReply(history, s);
  if (!ai.ok || !ai.reply) {
    console.error("[messenger] AI reply failed:", ai.error);
    return; // leave it unanswered in the inbox for you, rather than send something wrong
  }

  const sent = await sendText(s.pageAccessToken, psid, ai.reply);
  if (!sent.ok) {
    console.error("[messenger] send failed:", sent.error);
    return;
  }
  await db.from("chat_messages").insert({
    conversation_id: conv.id, direction: "out", sender: "ai", text: ai.reply, mid: sent.mid ?? null,
    input_tokens: (ai.usage?.input ?? 0) + (ai.usage?.cacheWrite ?? 0) + (ai.usage?.cacheRead ?? 0),
    output_tokens: ai.usage?.output ?? 0,
    cost_usd: ai.costUsd ?? 0,
  });
  await db.from("chat_conversations").update({
    last_message: ai.reply.slice(0, 200),
    last_message_at: new Date().toISOString(),
  }).eq("id", conv.id);
}

async function getOrCreateConversation(psid: string, token: string) {
  const db = getServerSupabase();
  const { data: found } = await db.from("chat_conversations").select("*").eq("psid", psid).maybeSingle();
  if (found) return found as any;
  const profile = await getProfile(token, psid);
  const { data: created, error } = await db
    .from("chat_conversations")
    .insert({ psid, name: profile.name, avatar: profile.avatar })
    .select("*")
    .single();
  if (error) {
    // Two messages arrived together and the other request created it first.
    const { data: again } = await db.from("chat_conversations").select("*").eq("psid", psid).maybeSingle();
    return (again as any) ?? null;
  }
  return created as any;
}
