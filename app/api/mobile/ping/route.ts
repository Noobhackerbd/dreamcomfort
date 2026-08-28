// GET /api/mobile/ping — the mobile app calls this on login to verify the access token.
import { NextRequest } from "next/server";
import { verifyMobileToken, unauthorized } from "@/lib/mobile-auth";
import { getStoreSettings } from "@/lib/settings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  if (!(await verifyMobileToken(req))) return unauthorized();
  const store = await getStoreSettings();
  return Response.json({ ok: true, store: { name: store.name, phone: store.phone } });
}
