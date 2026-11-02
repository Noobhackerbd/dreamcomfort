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
import {
  getChatbotSettings, fbApp, aiReply, extractProductCards, extractPriceTag, extractOrderTag, extractNoMatchTag, extractGreetTag, extractMatchTag, extractConfirmTag, extractItemsTag, pricePhotos, messengerText, personalize,
  type ChatTurn, type ChatImage,
} from "@/lib/chatbot";
import { verifySignature, sendText, sendTyping, getProfile, fetchPhoto, sendProductCards, cardsSummary, sendImage, sendImages } from "@/lib/messenger";
import { PHOTO_LABEL, withPhotos, splitPhotos } from "@/lib/chat-media";
import { parseConfirmDetails, createChatOrder } from "@/lib/chat-orders";

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

  const conv = await getOrCreateConversation(psid, s.pageAccessToken);
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

  // Customer message. A duplicate mid means Facebook is retrying — already handled.
  const { error: insErr } = await db.from("chat_messages").insert({
    conversation_id: conv.id, direction: "in", sender: "customer", text, mid,
  });
  if (insErr) return;

  const now = new Date().toISOString();
  await db.from("chat_conversations").update({
    last_message: baseText.slice(0, 200),
    last_message_at: now,
    last_customer_at: now,
    unread: (conv.unread ?? 0) + 1,
  }).eq("id", conv.id);

  // Stickers, videos, voice and files wait for a human. Photos go to the AI (if on).
  const isPlainText = !!msg?.text || !!ev.postback;
  const aiCanRead = isPlainText || (photoUrls.length > 0 && s.photoMatch !== false);
  if (!s.autoReply || !conv.ai_enabled || !aiCanRead) return;

  void sendTyping(s.pageAccessToken, psid);

  const { data: rows } = await db
    .from("chat_messages")
    .select("direction, text")
    .eq("conversation_id", conv.id)
    .order("created_at", { ascending: false })
    .limit(12);
  // Notes left for you in the inbox (order created / failed) are not part of the chat.
  const history: ChatTurn[] = (rows ?? []).reverse().filter((r: any) => !/^(🧾|⚠️ অর্ডার)/.test(r.text || "")).map((r: any) => ({
    role: r.direction === "in" ? "customer" : "shop",
    text: splitPhotos(r.text).text,
  }));

  // Attach this message's photos to the newest customer turn.
  if (photoUrls.length) {
    const imgs = (await Promise.all(photoUrls.map(fetchPhoto))).filter(Boolean) as ChatImage[];
    const lastCustomer = [...history].reverse().find((t) => t.role === "customer");
    if (imgs.length && lastCustomer) lastCustomer.images = imgs;
    if (!imgs.length && !isPlainText) {
      console.error("[messenger] could not download the customer's photo");
      return; // left for a human
    }
  }

  const ai = await aiReply(history, s, conv.name);
  if (ai.seen) console.log("[messenger] photo check:", ai.seen);
  if (!ai.ok || !ai.reply) {
    console.error("[messenger] AI reply failed:", ai.error);
    return; // leave it unanswered in the inbox for you, rather than send something wrong
  }

  const usage = {
    input_tokens: (ai.usage?.input ?? 0) + (ai.usage?.cacheWrite ?? 0) + (ai.usage?.cacheRead ?? 0),
    output_tokens: ai.usage?.output ?? 0,
    cost_usd: ai.costUsd ?? 0,
  };

  // [[GREET]] → saved greeting; [[MATCH]] → saved "yes, we have it" for a matching photo.
  const gr = extractGreetTag(ai.reply, s);
  const mt = extractMatchTag(gr.text, s);
  const cf = extractConfirmTag(mt.text, s);
  const it = extractItemsTag(cf.text, s);
  if (gr.greet || mt.match || cf.confirm || it.items) {
    const saved = gr.greet ? s.greetReply.text : mt.match ? s.matchReply.text : cf.confirm ? s.confirmReply.text : s.itemsReply.text;
    const hello = messengerText(personalize(saved, ai.gender));
    const sentHello = await sendText(s.pageAccessToken, psid, hello);
    if (!sentHello.ok) {
      console.error("[messenger] saved reply failed:", sentHello.error);
      return;
    }
    await db.from("chat_messages").insert({
      conversation_id: conv.id, direction: "out", sender: "ai", text: hello, mid: sentHello.mid ?? null, ...usage,
    });
    // Order details complete → add it to Admin → Orders, and leave a note in the inbox
    // (the note is for you; it is not sent to the customer).
    if (cf.confirm && s.confirmReply.createOrder !== false) {
      const d = parseConfirmDetails(cf.json);
      const res = d ? await createChatOrder(s, d, conv.name) : { ok: false as const, error: "name, address or a valid mobile number missing" };
      const note = res.ok
        ? `🧾 ${res.duplicate ? "এই নম্বরে আগেই অর্ডার আছে" : "অর্ডার তৈরি হয়েছে"}: ${res.orderNumber} · ৳${res.total} — Admin → Orders (কাস্টমারকে পাঠানো হয়নি)`
        : `⚠️ অর্ডার তৈরি হয়নি: ${res.error}. নিজে অর্ডার তুলুন। (কাস্টমারকে পাঠানো হয়নি)`;
      if (!res.ok) console.error("[messenger] chat order failed:", res.error);
      await db.from("chat_messages").insert({ conversation_id: conv.id, direction: "out", sender: "admin", text: note, mid: null });
    }
    await db.from("chat_conversations").update({
      last_message: hello.split("\n")[0].slice(0, 200),
      last_message_at: new Date().toISOString(),
    }).eq("id", conv.id);
    return;
  }

  // [[NOMATCH:n]] → saved "we don't have that one" message, then the similar product's photo
  // (or the price picture when nothing is similar).
  const nm = extractNoMatchTag(it.text, s);
  if (nm.noMatch) {
    const body = messengerText(personalize(s.noMatchReply.text, ai.gender));
    const sentNm = await sendText(s.pageAccessToken, psid, body);
    if (!sentNm.ok) {
      console.error("[messenger] no-match text failed:", sentNm.error);
      return;
    }
    await db.from("chat_messages").insert({
      conversation_id: conv.id, direction: "out", sender: "ai", text: body, mid: sentNm.mid ?? null, ...usage,
    });
    const pics = nm.similar ? [{ url: nm.similar.image, name: nm.similar.name }] : pricePhotos(s);
    if (pics.length) {
      const shown = await sendImages(s.pageAccessToken, psid, pics.map((p) => p.url));
      if (shown.ok) {
        await db.from("chat_messages").insert({
          conversation_id: conv.id, direction: "out", sender: "ai",
          text: withPhotos(nm.similar ? `🖼️ ${nm.similar.name}${nm.similar.price ? ` — ${nm.similar.price}` : ""}` : photoCaption(pics), pics.map((p) => p.url)),
          mid: shown.mid ?? null,
        });
      } else {
        console.error("[messenger] similar product photo failed:", shown.error);
      }
    }
    await db.from("chat_conversations").update({
      last_message: body.split("\n")[0].slice(0, 200),
      last_message_at: new Date().toISOString(),
    }).eq("id", conv.id);
    return;
  }

  // [[PRICE]] → the shop's saved price message: one picture of all products, then the text.
  const priceTag = extractPriceTag(nm.text, s);
  if (priceTag.price) {
    const pr = s.priceReply;
    let costLogged = false;
    const pics = pricePhotos(s);
    if (pics.length) {
      const pic = await sendImages(s.pageAccessToken, psid, pics.map((p) => p.url));
      if (pic.ok) {
        await db.from("chat_messages").insert({
          conversation_id: conv.id, direction: "out", sender: "ai",
          text: withPhotos(photoCaption(pics), pics.map((p) => p.url)), mid: pic.mid ?? null, ...usage,
        });
        costLogged = true;
      } else {
        console.error("[messenger] price picture failed:", pic.error);
      }
    }
    const body = messengerText(personalize(pr.text, ai.gender));
    const sentPrice = await sendText(s.pageAccessToken, psid, body);
    if (!sentPrice.ok) {
      console.error("[messenger] price text failed:", sentPrice.error);
      return;
    }
    await db.from("chat_messages").insert({
      conversation_id: conv.id, direction: "out", sender: "ai", text: body, mid: sentPrice.mid ?? null,
      ...(costLogged ? {} : usage),
    });
    await db.from("chat_conversations").update({
      last_message: body.split("\n")[0].slice(0, 200),
      last_message_at: new Date().toISOString(),
    }).eq("id", conv.id);
    return;
  }

  // [[ORDER]] → the shop's saved order form, exactly as written.
  const orderTag = extractOrderTag(priceTag.text, s);
  if (orderTag.order) {
    const form = messengerText(personalize(s.orderReply.text, ai.gender));
    const sentForm = await sendText(s.pageAccessToken, psid, form);
    if (!sentForm.ok) {
      console.error("[messenger] order form failed:", sentForm.error);
      return;
    }
    await db.from("chat_messages").insert({
      conversation_id: conv.id, direction: "out", sender: "ai", text: form, mid: sentForm.mid ?? null, ...usage,
    });
    await db.from("chat_conversations").update({
      last_message: form.split("\n")[0].slice(0, 200),
      last_message_at: new Date().toISOString(),
    }).eq("id", conv.id);
    return;
  }

  // [[SHOW:…]] in the reply → product photos with prices after the text.
  const { text: replyText, cards } = extractProductCards(orderTag.text, s);
  const say = replyText || (cards.length ? "আমাদের পণ্যগুলোর ছবি আর দাম নিচে দিলাম 👇" : "");
  if (!say) return;

  const sent = await sendText(s.pageAccessToken, psid, say);
  if (!sent.ok) {
    console.error("[messenger] send failed:", sent.error);
    return;
  }
  await db.from("chat_messages").insert({
    conversation_id: conv.id, direction: "out", sender: "ai", text: say, mid: sent.mid ?? null, ...usage,
  });
  let last = say;

  if (cards.length) {
    const shown = await sendProductCards(s.pageAccessToken, psid, cards);
    if (shown.ok) {
      last = cardsSummary(cards);
      await db.from("chat_messages").insert({
        conversation_id: conv.id, direction: "out", sender: "ai",
        text: withPhotos(last, cards.map((c) => c.image)), mid: shown.mid ?? null,
      });
    } else {
      console.error("[messenger] product photos failed:", shown.error);
    }
  }
  await db.from("chat_conversations").update({
    last_message: last.split("\n")[0].slice(0, 200),
    last_message_at: new Date().toISOString(),
  }).eq("id", conv.id);
}

/** What the inbox (and the AI's memory) says about photos we sent: numbered names, so
 *  "the 3rd one" can be understood later. */
function photoCaption(pics: { name: string }[]): string {
  const named = pics.filter((p) => p.name);
  return named.length
    ? ["🖼️ পণ্যের ছবি পাঠানো হয়েছে:", ...named.map((p, i) => `${i + 1}. ${p.name}`)].join("\n")
    : "🖼️ পণ্যের ছবি";
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
