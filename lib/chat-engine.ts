// lib/chat-engine.ts — what happens with a customer's message, for every channel
// (Facebook Messenger, WhatsApp): store it, ask the AI, act on its signal, send, log.
// Each channel only supplies how to send (ChatChannel); the rules live here once.
import "server-only";
import { getServerSupabase } from "@/lib/supabase/server";
import {
  aiReply, extractProductCards, extractPriceTag, extractOrderTag, extractNoMatchTag, extractGreetTag,
  extractMatchTag, extractConfirmTag, extractItemsTag, extractMaterialTag, extractFabricTag, extractBargainTag, extractHumanTag, pricePhotos, messengerText, personalize, usePriceReply, useGreetReply, useBargainReply, isPriceOffer, lowestProductPrice,
  type ChatTurn, type ChatImage, type ChatbotSettings, type ProductCard,
} from "@/lib/chatbot";
import { withPhotos, splitPhotos } from "@/lib/chat-media";
import { parseConfirmDetails, createChatOrder } from "@/lib/chat-orders";

export interface SendResult { ok: boolean; mid?: string; error?: string; code?: number }

export interface ChatChannel {
  name: "messenger" | "whatsapp";
  sendText(to: string, text: string): Promise<SendResult>;
  /** Several photos together (Messenger: one message, shown as a grid; WhatsApp: one by one, shown as an album). */
  sendImages(to: string, urls: string[]): Promise<SendResult>;
  /** Product photos with name + price under each. */
  sendCards(to: string, cards: ProductCard[]): Promise<SendResult>;
  typing?(to: string, mid: string | null): void;
}

export async function getOrCreateConversation(key: string, loadProfile: () => Promise<{ name: string | null; avatar: string | null }>) {
  const db = getServerSupabase();
  const { data: found } = await db.from("chat_conversations").select("*").eq("psid", key).maybeSingle();
  if (found) {
    // No name yet (Facebook refused before)? Try again — the name decides আপু / ভাইয়া.
    if (!(found as any).name) {
      const p = await loadProfile().catch(() => ({ name: null, avatar: null }));
      if (p.name) {
        await db.from("chat_conversations").update({ name: p.name, ...(p.avatar ? { avatar: p.avatar } : {}) }).eq("id", (found as any).id);
        return { ...(found as any), name: p.name, avatar: p.avatar ?? (found as any).avatar };
      }
    }
    return found as any;
  }
  const profile = await loadProfile();
  const { data: created, error } = await db
    .from("chat_conversations")
    .insert({ psid: key, name: profile.name, avatar: profile.avatar })
    .select("*")
    .single();
  if (error) {
    // Two messages arrived together and the other request created it first.
    const { data: again } = await db.from("chat_conversations").select("*").eq("psid", key).maybeSingle();
    return (again as any) ?? null;
  }
  return created as any;
}

/** What the inbox stores for product cards we sent: a short list (+ the photos). */
function cardsSummary(cards: { name: string; price: string }[]): string {
  return ["🛍️ পণ্যের ছবি ও দাম পাঠানো হয়েছে:", ...cards.map((c) => `• ${c.name}${c.price ? ` — ${c.price}` : ""}`)].join("\n");
}

/** What the inbox (and the AI's memory) says about photos we sent: numbered names, so
 *  "the 3rd one" can be understood later. */
function photoCaption(pics: { name: string }[]): string {
  const named = pics.filter((p) => p.name);
  return named.length
    ? ["🖼️ পণ্যের ছবি পাঠানো হয়েছে:", ...named.map((p, i) => `${i + 1}. ${p.name}`)].join("\n")
    : "🖼️ পণ্যের ছবি";
}

/** The ready-made first message of click-to-chat ads, in the ways customers' phones send it. */
export function isAdOpener(text: string): boolean {
  const t = String(text || "").toLowerCase().replace(/\s+/g, " ").trim();
  return /\bi get (more )?(info|information|details)\b/.test(t) ||
    /^(more )?(info|information|details)( please| plz| pls)?[?.!]*$/.test(t) ||
    /^(hello|hi)?[!,. ]*i('m| am) interested in (this|your)/.test(t) ||
    /আরও তথ্য পেতে পারি|আরো তথ্য পেতে পারি/.test(t);
}

/** Only emoji (and spaces / punctuation) — "😍", "👍👍", "❤️ 🥰", "🙂!" — no words or digits. */
export function isEmojiOnly(text: string): boolean {
  const t = String(text || "").trim();
  if (!t || !/[\p{Extended_Pictographic}\p{Regional_Indicator}]/u.test(t)) return false;
  // Remove emoji, their joiners / variation selectors / skin tones, then spaces and punctuation.
  const rest = t
    .replace(/[\p{Extended_Pictographic}\p{Emoji_Modifier}\p{Regional_Indicator}\u{E0020}-\u{E007F}\u200d\ufe0f\ufe0e\u20e3]/gu, "")
    .replace(/[\s\p{P}\p{S}]/gu, "");
  return rest.length === 0;
}

export interface IncomingMessage {
  conv: any;                 // the chat_conversations row
  to: string;                // the id to send replies to (Messenger PSID / WhatsApp number)
  text: string;              // stored text (with [img] lines for photos)
  baseText: string;          // the text without photo lines
  mid: string | null;        // the channel's message id (dedupes retries)
  photoUrls: string[];       // photos in this message (for the inbox)
  loadPhotos: () => Promise<ChatImage[]>; // the photos as data, for the AI
  isPlainText: boolean;      // text or button (not a sticker / file / voice)
  fromAd?: boolean;          // came from a click-to-WhatsApp / click-to-Messenger ad
}

/** Store a customer's message and, if the AI is on for this chat, answer it. */
export async function handleCustomerMessage(s: ChatbotSettings, ch: ChatChannel, m: IncomingMessage) {
  const db = getServerSupabase();
  const { conv, to, text, baseText, mid, photoUrls, loadPhotos, isPlainText, fromAd } = m;

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
  // The customer wrote back: follow-ups start again from the first one. (Separate update —
  // harmless if supabase-migration-chat-followup.sql hasn't been run yet.)
  await db.from("chat_conversations").update({ followup_step: 0 }).eq("id", conv.id);

  // Stickers, videos, voice and files wait for a human. Photos go to the AI (if on).
  const aiCanRead = isPlainText || (photoUrls.length > 0 && s.photoMatch !== false);
  if (!s.autoReply || !conv.ai_enabled || !aiCanRead) return;

  ch.typing?.(to, mid);

  const { data: rows } = await db
    .from("chat_messages")
    .select("direction, text")
    .eq("conversation_id", conv.id)
    .order("created_at", { ascending: false })
    .limit(12);
  // Notes left for you in the inbox (order created / failed) are not part of the chat.
  const history: ChatTurn[] = (rows ?? []).reverse().filter((r: any) => !/^(🧾|⚠️ অর্ডার|🙋)/.test(r.text || "")).map((r: any) => ({
    role: r.direction === "in" ? "customer" : "shop",
    text: splitPhotos(r.text).text,
  }));

  // Attach this message's photos to the newest customer turn.
  if (photoUrls.length) {
    const imgs = await loadPhotos();
    const lastCustomer = [...history].reverse().find((t) => t.role === "customer");
    if (imgs.length && lastCustomer) lastCustomer.images = imgs;
    if (!imgs.length && !isPlainText) {
      console.error(`[${ch.name}] could not download the customer's photo`);
      return; // left for a human
    }
  }

  let ai = await aiReply(history, s, conv.name);
  if (ai.seen) console.log(`[${ch.name}] photo check:`, ai.seen);
  // Remember আপু / ভাইয়া for this chat (follow-ups are sent without asking the AI again).
  if (ai.gender && ai.gender !== conv.gender) await db.from("chat_conversations").update({ gender: ai.gender }).eq("id", conv.id);

  // A customer who tapped one of your ads opens the chat with the ad's ready-made message
  // ("Can I get more info on this?"). As the FIRST message of a chat, that is a price
  // question: send the saved price reply. (The AI call above only decides আপু / ভাইয়া.)
  const firstMessage = history.filter((t) => t.role === "customer").length <= 1;
  if (firstMessage && usePriceReply(s) && (fromAd || isAdOpener(baseText))) {
    ai = { ...ai, ok: true, reply: "[[PRICE]]" };
  } else if (!photoUrls.length && useBargainReply(s) && isPriceOffer(baseText, lowestProductPrice(s))) {
    // "900", "৮৫০ দিবো" — a lower price offer gets the saved "price is fixed" reply, every time
    // (never handed to you, never the AI's own wording).
    ai = { ...ai, ok: true, reply: "[[BARGAIN]]" };
  } else if (!photoUrls.length && isEmojiOnly(baseText) && useGreetReply(s)) {
    // A chat that opens with only an emoji ("😍", "👍", "❤️") is a hello: send the saved
    // greeting. Checked against the whole chat, not just the last 12 messages.
    const { count } = await db.from("chat_messages").select("id", { count: "exact", head: true })
      .eq("conversation_id", conv.id).eq("direction", "in");
    if ((count ?? 0) <= 1) ai = { ...ai, ok: true, reply: "[[GREET]]" };
  }
  if (!ai.ok || !ai.reply) {
    console.error(`[${ch.name}] AI reply failed:`, ai.error);
    return; // leave it unanswered in the inbox for you, rather than send something wrong
  }

  const usage = {
    input_tokens: (ai.usage?.input ?? 0) + (ai.usage?.cacheWrite ?? 0) + (ai.usage?.cacheRead ?? 0),
    output_tokens: ai.usage?.output ?? 0,
    cost_usd: ai.costUsd ?? 0,
  };

  // [[GREET]] → saved greeting; [[MATCH]] → saved "yes, we have it" for a matching photo.
  // [[HUMAN]] → the AI doesn't know. Say nothing, pause the AI in this chat and leave a
  // note so you answer it yourself (turn AI back on from the inbox when done).
  const hu = extractHumanTag(ai.reply, s);
  if (hu.human) {
    await db.from("chat_messages").insert({
      conversation_id: conv.id, direction: "out", sender: "admin", mid: null, ...usage,
      text: "🙋 AI এই প্রশ্নের উত্তর জানে না — কিছু পাঠায়নি। আপনি উত্তর দিন। এই চ্যাটে AI বন্ধ করা হলো। (কাস্টমারকে পাঠানো হয়নি)",
    });
    await db.from("chat_conversations").update({ ai_enabled: false }).eq("id", conv.id);
    return;
  }

  const gr = extractGreetTag(hu.text, s);
  const mt = extractMatchTag(gr.text, s);
  const cf = extractConfirmTag(mt.text, s);
  const it = extractItemsTag(cf.text, s);
  const ma = extractMaterialTag(it.text, s);
  const fb = extractFabricTag(ma.text, s);
  const bg = extractBargainTag(fb.text, s);
  if (gr.greet || mt.match || cf.confirm || it.items || ma.material || fb.fabric || bg.bargain) {
    const saved = gr.greet ? s.greetReply.text : mt.match ? s.matchReply.text : cf.confirm ? s.confirmReply.text : it.items ? s.itemsReply.text : ma.material ? s.materialReply.text : fb.fabric ? s.fabricReply.text : s.bargainReply.text;
    const hello = messengerText(personalize(saved, ai.gender));
    const sentHello = await ch.sendText(to, hello);
    if (!sentHello.ok) {
      console.error(`[${ch.name}] saved reply failed:`, sentHello.error);
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
      if (!res.ok) console.error(`[${ch.name}] chat order failed:`, res.error);
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
  const nm = extractNoMatchTag(bg.text, s);
  if (nm.noMatch) {
    const body = messengerText(personalize(s.noMatchReply.text, ai.gender));
    const sentNm = await ch.sendText(to, body);
    if (!sentNm.ok) {
      console.error(`[${ch.name}] no-match text failed:`, sentNm.error);
      return;
    }
    await db.from("chat_messages").insert({
      conversation_id: conv.id, direction: "out", sender: "ai", text: body, mid: sentNm.mid ?? null, ...usage,
    });
    const pics = nm.similar ? [{ url: nm.similar.image, name: nm.similar.name }] : pricePhotos(s);
    if (pics.length) {
      const shown = await ch.sendImages(to, pics.map((p) => p.url));
      if (shown.ok) {
        await db.from("chat_messages").insert({
          conversation_id: conv.id, direction: "out", sender: "ai",
          text: withPhotos(nm.similar ? `🖼️ ${nm.similar.name}${nm.similar.price ? ` — ${nm.similar.price}` : ""}` : photoCaption(pics), pics.map((p) => p.url)),
          mid: shown.mid ?? null,
        });
      } else {
        console.error(`[${ch.name}] similar product photo failed:`, shown.error);
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
      const pic = await ch.sendImages(to, pics.map((p) => p.url));
      if (pic.ok) {
        await db.from("chat_messages").insert({
          conversation_id: conv.id, direction: "out", sender: "ai",
          text: withPhotos(photoCaption(pics), pics.map((p) => p.url)), mid: pic.mid ?? null, ...usage,
        });
        costLogged = true;
      } else {
        console.error(`[${ch.name}] price picture failed:`, pic.error);
      }
    }
    const body = messengerText(personalize(pr.text, ai.gender));
    const sentPrice = await ch.sendText(to, body);
    if (!sentPrice.ok) {
      console.error(`[${ch.name}] price text failed:`, sentPrice.error);
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
    const sentForm = await ch.sendText(to, form);
    if (!sentForm.ok) {
      console.error(`[${ch.name}] order form failed:`, sentForm.error);
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
  const say = personalize(replyText, ai.gender) || (cards.length ? "আমাদের পণ্যগুলোর ছবি আর দাম নিচে দিলাম 👇" : "");
  if (!say) return;

  const sent = await ch.sendText(to, say);
  if (!sent.ok) {
    console.error(`[${ch.name}] send failed:`, sent.error);
    return;
  }
  await db.from("chat_messages").insert({
    conversation_id: conv.id, direction: "out", sender: "ai", text: say, mid: sent.mid ?? null, ...usage,
  });
  let last = say;

  if (cards.length) {
    const shown = await ch.sendCards(to, cards);
    if (shown.ok) {
      last = cardsSummary(cards);
      await db.from("chat_messages").insert({
        conversation_id: conv.id, direction: "out", sender: "ai",
        text: withPhotos(last, cards.map((c) => c.image)), mid: shown.mid ?? null,
      });
    } else {
      console.error(`[${ch.name}] product photos failed:`, shown.error);
    }
  }
  await db.from("chat_conversations").update({
    last_message: last.split("\n")[0].slice(0, 200),
    last_message_at: new Date().toISOString(),
  }).eq("id", conv.id);
}
