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

export async function saveNavIcons(icons: { category: string }) {
  await requireAdmin();
  try {
    let svg = (icons.category || "").trim();
    if (svg) {
      // Hardening (admin-only, but keep it clean): drop scripts and inline event handlers.
      svg = svg
        .replace(/<script[\s\S]*?<\/script>/gi, "")
        .replace(/\son\w+\s*=\s*"[^"]*"/gi, "")
        .replace(/\son\w+\s*=\s*'[^']*'/gi, "");
      if (!/<svg[\s\S]*<\/svg>/i.test(svg)) return { ok: false, error: "সঠিক SVG দিন।" };
      if (svg.length > 100000) return { ok: false, error: "SVG ফাইলটি অনেক বড় (১০০KB এর নিচে দিন)।" };
    }
    await saveSetting("nav_icons", { category: svg });
  } catch (e: any) {
    return { ok: false, error: e?.message ?? "সেভ ব্যর্থ। settings টেবিল আছে কিনা দেখুন।" };
  }
  revalidatePath("/admin/settings");
  revalidatePath("/", "layout");
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

export async function saveGeminiSettings(g: { apiKey: string; model: string }) {
  await requireAdmin();
  try {
    await saveSetting("gemini", {
      apiKey: (g.apiKey || "").trim(),
      model: (g.model || "").trim() || "gemini-2.0-flash",
    });
  } catch (e: any) {
    return { ok: false, error: e?.message ?? "সেভ ব্যর্থ। settings টেবিল আছে কিনা দেখুন (supabase-migration-2.sql)।" };
  }
  revalidatePath("/admin/settings");
  return { ok: true };
}

export async function saveBdCourierSettings(bc: { apiToken: string; suppressBelowRatio?: number }) {
  await requireAdmin();
  try {
    const sup = Math.max(0, Math.min(100, Math.floor(Number(bc.suppressBelowRatio) || 0)));
    await saveSetting("bdcourier", { apiToken: (bc.apiToken || "").trim(), suppressBelowRatio: sup });
  } catch (e: any) {
    return { ok: false, error: e?.message ?? "সেভ ব্যর্থ। settings টেবিল আছে কিনা দেখুন (supabase-migration-2.sql)।" };
  }
  revalidatePath("/admin/settings");
  revalidatePath("/admin/orders");
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
