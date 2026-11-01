// GET /admin/chatbot/facebook — start "Continue with Facebook" (admin only).
import { NextResponse, type NextRequest } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { getChatbotSettings } from "@/lib/chatbot";
import { loginDialogUrl, newState, callbackPath } from "@/lib/facebook-connect";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.redirect(new URL("/admin/login", req.url));
  }
  const s = await getChatbotSettings();
  if (!s.appId || !s.appSecret) {
    return NextResponse.redirect(new URL("/admin/chatbot?tab=connect&fb=noapp", req.url));
  }
  const state = newState();
  const redirectUri = req.nextUrl.origin + callbackPath;
  const res = NextResponse.redirect(loginDialogUrl(s.appId, redirectUri, state, s.fbConfigId));
  // Proves the callback belongs to this login attempt (stops a forged login link).
  res.cookies.set("dc_fb_state", state, {
    httpOnly: true, secure: req.nextUrl.protocol === "https:", sameSite: "lax",
    path: "/admin/chatbot/facebook", maxAge: 600,
  });
  return res;
}
