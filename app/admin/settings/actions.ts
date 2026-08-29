"use server";

import { requireAdmin } from "@/lib/admin-auth";
import { saveSetting } from "@/lib/settings";
import { revalidatePath } from "next/cache";

export async function saveShippingSettings(insideDhaka: number, outsideDhaka: number) {
  await requireAdmin();
  await saveSetting("shipping", {
    insideDhaka: Math.max(0, Math.floor(Number(insideDhaka) || 0)),
    outsideDhaka: Math.max(0, Math.floor(Number(outsideDhaka) || 0)),
  });
  revalidatePath("/admin/settings");
  return { ok: true };
}

export async function saveStoreSettings(store: {
  name: string;
  phone: string;
  email: string;
  facebook: string;
  address: string;
}) {
  await requireAdmin();
  await saveSetting("store", store);
  revalidatePath("/admin/settings");
  return { ok: true };
}

export async function saveSmsTemplates(templates: {
  order_placed: string;
  confirmed: string;
  shipped: string;
  delivered: string;
}) {
  await requireAdmin();
  await saveSetting("sms_templates", templates);
  revalidatePath("/admin/settings");
  return { ok: true };
}

export async function saveMetaSettings(meta: { pixelId: string; capiToken: string; testEventCode: string }) {
  await requireAdmin();
  try {
    await saveSetting("meta", {
      pixelId: (meta.pixelId || "").trim(),
      capiToken: (meta.capiToken || "").trim(),
      testEventCode: (meta.testEventCode || "").trim(),
    });
  } catch (e: any) {
    return { ok: false, error: e?.message ?? "সেভ ব্যর্থ। settings টেবিল আছে কিনা দেখুন (supabase-migration-2.sql)।" };
  }
  revalidatePath("/admin/settings");
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function saveManualSettings(m: { enabled: boolean; sendMeta: boolean; sendTiktok: boolean; mode?: string }) {
  await requireAdmin();
  const allowed = ["on_create", "on_confirm", "on_confirm_or_24h"];
  const mode = allowed.includes(m.mode || "") ? m.mode : "on_create";
  try {
    await saveSetting("manual", { enabled: !!m.enabled, sendMeta: !!m.sendMeta, sendTiktok: !!m.sendTiktok, mode });
  } catch (e: any) {
    return { ok: false, error: e?.message ?? "সেভ ব্যর্থ।" };
  }
  revalidatePath("/admin/settings");
  revalidatePath("/admin/orders");
  return { ok: true };
}

export async function saveMobileSettings(m: { apiKey: string }) {
  await requireAdmin();
  try {
    await saveSetting("mobile", { apiKey: (m.apiKey || "").trim() });
  } catch (e: any) {
    return { ok: false, error: e?.message ?? "সেভ ব্যর্থ।" };
  }
  revalidatePath("/admin/settings");
  return { ok: true };
}

export async function saveTikTokSettings(tt: { pixelId: string; accessToken: string; testEventCode: string }) {
  await requireAdmin();
  try {
    await saveSetting("tiktok", {
      pixelId: (tt.pixelId || "").trim(),
      accessToken: (tt.accessToken || "").trim(),
      testEventCode: (tt.testEventCode || "").trim(),
    });
  } catch (e: any) {
    return { ok: false, error: e?.message ?? "সেভ ব্যর্থ। settings টেবিল আছে কিনা দেখুন।" };
  }
  revalidatePath("/admin/settings");
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function saveAiSettings(ai: { apiKey: string; model: string }) {
  await requireAdmin();
  try {
    await saveSetting("ai", {
      apiKey: (ai.apiKey || "").trim(),
      model: (ai.model || "").trim() || "claude-3-5-sonnet-20241022",
    });
  } catch (e: any) {
    return { ok: false, error: e?.message ?? "সেভ ব্যর্থ। settings টেবিল আছে কিনা দেখুন (supabase-migration-2.sql)।" };
  }
  revalidatePath("/admin/settings");
  return { ok: true };
}

export async function saveCarryBeeSettings(cb: {
  env: string;
  clientId: string;
  clientSecret: string;
  clientContext: string;
  storeId: string;
  autoOnConfirm?: boolean;
  defaultWeight?: number;
}) {
  await requireAdmin();
  try {
    const w = Number(cb.defaultWeight);
    await saveSetting("carrybee", {
      env: cb.env === "sandbox" ? "sandbox" : "production",
      clientId: (cb.clientId || "").trim(),
      clientSecret: (cb.clientSecret || "").trim(),
      clientContext: (cb.clientContext || "").trim(),
      storeId: (cb.storeId || "").trim(),
      autoOnConfirm: !!cb.autoOnConfirm,
      defaultWeight: Number.isFinite(w) && w > 0 ? w : 1.5,
    });
  } catch (e: any) {
    return { ok: false, error: e?.message ?? "সেভ ব্যর্থ। settings টেবিল আছে কিনা দেখুন (supabase-migration-2.sql)।" };
  }
  revalidatePath("/admin/settings");
  revalidatePath("/admin/orders");
  return { ok: true };
}
