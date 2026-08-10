"use server";

import { requireAdmin } from "@/lib/admin-auth";
import { sendSmsAsync } from "@/lib/sms";
import { revalidatePath } from "next/cache";

export async function sendManualSms(phone: string, message: string) {
  await requireAdmin();
  if (!phone.trim()) return { ok: false, error: "ফোন নম্বর দিন।" };
  if (!message.trim()) return { ok: false, error: "মেসেজ লিখুন।" };
  await sendSmsAsync({ phone, message });
  revalidatePath("/admin/sms");
  return { ok: true };
}
