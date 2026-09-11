"use server";

// app/account/support-actions.ts — customer support tickets.

import { getServerSupabase } from "@/lib/supabase/server";
import { getCustomerSession } from "@/lib/customer-auth";

export interface TicketRow {
  id: string; subject: string; category: string; status: string; order_number: string | null; created_at: string; updated_at: string;
}

/** Create a ticket. Works for a logged-in customer OR a guest (contact form). */
export async function createTicket(input: {
  name: string; phone: string; email?: string; subject: string; message: string; category?: string; order_number?: string;
}) {
  const name = (input.name || "").trim();
  const phone = (input.phone || "").trim();
  const subject = (input.subject || "").trim();
  const message = (input.message || "").trim();
  if (!name) return { ok: false, error: "নাম দিন।" };
  if (!phone) return { ok: false, error: "মোবাইল নম্বর দিন।" };
  if (!subject) return { ok: false, error: "বিষয় দিন।" };
  if (message.length < 3) return { ok: false, error: "আপনার বার্তা লিখুন।" };

  const session = await getCustomerSession();
  try {
    const svc = getServerSupabase();
    const { data: ticket, error } = await svc.from("support_tickets").insert({
      user_id: session?.userId ?? null,
      name, phone, email: (input.email || session?.email || "").trim() || null,
      subject, category: (input.category || "general").trim(),
      order_number: (input.order_number || "").trim() || null,
      status: "open",
    }).select("id").single();
    if (error || !ticket) return { ok: false, error: error?.message ?? "টিকিট তৈরি ব্যর্থ।" };
    await svc.from("support_messages").insert({ ticket_id: ticket.id, sender: "customer", body: message });
    return { ok: true, id: ticket.id as string };
  } catch (e: any) {
    return { ok: false, error: e?.message ?? "ব্যর্থ।" };
  }
}

export async function listMyTickets(): Promise<{ ok: boolean; tickets: TicketRow[] }> {
  const session = await getCustomerSession();
  if (!session) return { ok: false, tickets: [] };
  try {
    const svc = getServerSupabase();
    const { data } = await svc.from("support_tickets")
      .select("id, subject, category, status, order_number, created_at, updated_at")
      .eq("user_id", session.userId).order("updated_at", { ascending: false });
    return { ok: true, tickets: (data ?? []) as TicketRow[] };
  } catch {
    return { ok: true, tickets: [] };
  }
}

export async function getMyTicket(id: string) {
  const session = await getCustomerSession();
  if (!session) return { ok: false as const, error: "unauthorized" };
  try {
    const svc = getServerSupabase();
    const { data: ticket } = await svc.from("support_tickets").select("*").eq("id", id).maybeSingle();
    if (!ticket || (ticket as any).user_id !== session.userId) return { ok: false as const, error: "not-found" };
    const { data: messages } = await svc.from("support_messages").select("*").eq("ticket_id", id).order("created_at", { ascending: true });
    return { ok: true as const, ticket, messages: messages ?? [] };
  } catch (e: any) {
    return { ok: false as const, error: e?.message ?? "error" };
  }
}

export async function replyToTicket(id: string, body: string) {
  const session = await getCustomerSession();
  if (!session) return { ok: false, error: "লগইন করুন।" };
  const text = (body || "").trim();
  if (!text) return { ok: false, error: "বার্তা লিখুন।" };
  try {
    const svc = getServerSupabase();
    const { data: ticket } = await svc.from("support_tickets").select("id, user_id").eq("id", id).maybeSingle();
    if (!ticket || (ticket as any).user_id !== session.userId) return { ok: false, error: "not-found" };
    await svc.from("support_messages").insert({ ticket_id: id, sender: "customer", body: text });
    await svc.from("support_tickets").update({ status: "open", updated_at: new Date().toISOString() }).eq("id", id);
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e?.message ?? "ব্যর্থ।" };
  }
}
