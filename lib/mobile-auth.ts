// lib/mobile-auth.ts — Bearer-token auth for the Android/mobile app API.
// The mobile app never holds the Supabase service-role key; it holds only this access
// token and sends it as `Authorization: Bearer <token>`. Empty token in settings = the
// whole mobile API is disabled (every request 401s).
import { getMobileSettings } from "@/lib/settings";

export async function verifyMobileToken(req: Request): Promise<boolean> {
  const auth = req.headers.get("authorization") || "";
  const token = auth.replace(/^Bearer\s+/i, "").trim();
  if (!token) return false;
  const { apiKey } = await getMobileSettings();
  return !!apiKey && token === apiKey;
}

/** Standard 401 body for the mobile API. */
export function unauthorized() {
  return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });
}
