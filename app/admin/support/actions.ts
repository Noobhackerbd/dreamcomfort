"use server";

// app/admin/support/actions.ts — admin side of the support ticket system.

import { getServerSupabase } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/admin-auth";
import { revalidatePath } from "next/cache";

export async function adminReplyTicket(ticketId: string, body: string) {
  await requireAdmin();
  const text = (body || "").trim();
  if (!text) return { ok: false, error: "বার্তা লিখুন।" };
  try {
    const svc = getServerSupabase();
    await svc.from("support_messages").insert({ ticket_id: ticketId, sender: "admin", body: text });
    await svc.from("support_tickets").update({ status: "answered", updated_at: new Date().toISOString() }).eq("id", ticketId);
    revalidatePath(`/admin/support/${ticketId}`);
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e?.message ?? "ব্যর্থ।" };
  }
}

export async function setTicketStatus(ticketId: string, status: "open" | "answered" | "closed") {
  await requireAdmin();
  try {
    const svc = getServerSupabase();
    await svc.from("support_tickets").update({ status, updated_at: new Date().toISOString() }).eq("id", ticketId);
    revalidatePath(`/admin/support/${ticketId}`);
    revalidatePath("/admin/support");
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e?.message ?? "ব্যর্থ।" };
  }
}
