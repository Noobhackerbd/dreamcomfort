"use server";

// app/admin/dashboard-actions.ts — dashboard actions (PIN-protected daily reset).
import { requireAdmin } from "@/lib/admin-auth";
import { saveSetting } from "@/lib/settings";
import { revalidatePath } from "next/cache";

const RESET_PIN = "103020";

/** Reset the "today" order counters — sets a baseline timestamp = now.
 *  Today's order count / revenue / per-product counts are computed from this
 *  baseline until the next Dhaka midnight (then it auto-clears). */
export async function resetDailyOrders(pin: string): Promise<{ ok: boolean; error?: string }> {
  await requireAdmin();
  if (pin !== RESET_PIN) return { ok: false, error: "ভুল পিন।" };
  try {
    await saveSetting("dashboard_daily_reset", { at: new Date().toISOString() });
  } catch (e: any) {
    return { ok: false, error: e?.message ?? "রিসেট ব্যর্থ হয়েছে।" };
  }
  revalidatePath("/admin");
  return { ok: true };
}
