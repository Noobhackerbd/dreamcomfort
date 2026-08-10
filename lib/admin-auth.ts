// lib/admin-auth.ts — shared admin gate for Server Actions.
import { getSupabaseServerClient } from "@/lib/supabase/ssr-server";

/** Throws if the caller is not a signed-in, allow-listed admin. */
export async function requireAdmin(): Promise<void> {
  const {
    data: { user },
  } = await getSupabaseServerClient().auth.getUser();
  if (!user) throw new Error("অননুমোদিত।");
  const allow = (process.env.ADMIN_ALLOWED_EMAILS || "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  if (allow.length && (!user.email || !allow.includes(user.email.toLowerCase()))) {
    throw new Error("অননুমোদিত।");
  }
}
