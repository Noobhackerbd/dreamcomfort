"use server";

// app/newsletter-actions.ts — newsletter / community email signup.

import { getServerSupabase } from "@/lib/supabase/server";

export async function subscribeNewsletter(email: string, source = "home") {
  const e = (email || "").trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e)) return { ok: false, error: "সঠিক ইমেইল দিন।" };
  try {
    const svc = getServerSupabase();
    const { error } = await svc.from("newsletter_subscribers").upsert({ email: e, source }, { onConflict: "email", ignoreDuplicates: true });
    if (error && !/duplicate|conflict/i.test(error.message)) return { ok: false, error: error.message };
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e?.message ?? "ব্যর্থ।" };
  }
}
