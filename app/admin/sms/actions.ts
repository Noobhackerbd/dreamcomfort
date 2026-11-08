"use server";

import { requireAdmin } from "@/lib/admin-auth";
import { getServerSupabase } from "@/lib/supabase/server";
import { getSmsConfig, sendSmsAsync, DEFAULT_SMS_CONFIG, type SmsConfig } from "@/lib/sms";
import { saveSetting } from "@/lib/settings";
import { revalidatePath } from "next/cache";

/** What the SMS page shows. The API key itself never leaves the server. */
export async function getSmsAdmin() {
  await requireAdmin();
  const cfg = await getSmsConfig();
  const { data: logs } = await getServerSupabase()
    .from("sms_logs")
    .select("id, phone, message, status, provider_response, created_at")
    .order("created_at", { ascending: false })
    .limit(25);
  return {
    enabled: cfg.enabled,
    senderId: cfg.senderId,
    hasKey: !!cfg.apiKey,
    keyHint: cfg.apiKey ? "••••" + cfg.apiKey.slice(-4) : "",
    keyFromEnv: !!process.env.AUTOMAS_API_KEY,
    events: cfg.events,
    logs: (logs ?? []) as { id: string; phone: string; message: string; status: string; provider_response: string | null; created_at: string }[],
  };
}

export async function saveSmsConfig(input: { enabled: boolean; apiKey?: string; senderId: string; events: SmsConfig["events"] }) {
  await requireAdmin();
  const { data } = await getServerSupabase().from("settings").select("value").eq("key", "sms").maybeSingle();
  const prev = { ...DEFAULT_SMS_CONFIG, ...((data?.value as Partial<SmsConfig>) || {}) };
  const apiKey = (input.apiKey ?? "").trim();
  const next: SmsConfig = {
    enabled: !!input.enabled,
    apiKey: apiKey || prev.apiKey, // blank = keep the saved key
    senderId: input.senderId.trim(),
    events: { ...DEFAULT_SMS_CONFIG.events, ...input.events },
  };
  try {
    await saveSetting("sms", next);
  } catch (e: any) {
    return { ok: false, error: e?.message || "সেভ করা যায়নি" };
  }
  revalidatePath("/admin/sms");
  return { ok: true };
}

export async function sendTestSms(phone: string) {
  await requireAdmin();
  if (!phone.trim()) return { ok: false, error: "ফোন নম্বর দিন।" };
  const r = await sendSmsAsync({ phone, message: "Dream Comfort: SMS test সফল হয়েছে। ধন্যবাদ!", event: "test" });
  revalidatePath("/admin/sms");
  return r.ok ? { ok: true } : { ok: false, error: r.error || r.providerResponse || "পাঠানো যায়নি" };
}

export async function sendManualSms(phone: string, message: string) {
  await requireAdmin();
  if (!phone.trim()) return { ok: false, error: "ফোন নম্বর দিন।" };
  if (!message.trim()) return { ok: false, error: "মেসেজ লিখুন।" };
  const r = await sendSmsAsync({ phone, message, event: "manual" });
  revalidatePath("/admin/sms");
  return r.ok ? { ok: true } : { ok: false, error: r.error || r.providerResponse || "পাঠানো যায়নি" };
}
