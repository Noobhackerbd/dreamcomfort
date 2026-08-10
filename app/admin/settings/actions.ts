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
