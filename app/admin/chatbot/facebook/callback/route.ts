// GET /admin/chatbot/facebook/callback — Facebook sends the admin back here after login.
import { NextResponse, type NextRequest } from "next/server";
import { timingSafeEqual } from "crypto";
import { requireAdmin } from "@/lib/admin-auth";
import { getChatbotSettings } from "@/lib/chatbot";
import { pagesFromCode, savePending, connectPage, callbackPath } from "@/lib/facebook-connect";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 30;

const same = (a: string, b: string) =>
  a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));

export async function GET(req: NextRequest) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.redirect(new URL("/admin/login", req.url));
  }
  const sp = req.nextUrl.searchParams;
  const back = (fb: string, msg?: string) => {
    const u = new URL("/admin/chatbot", req.url);
    u.searchParams.set("tab", "connect");
    u.searchParams.set("fb", fb);
    if (msg) u.searchParams.set("fbmsg", msg.slice(0, 600));
    const res = NextResponse.redirect(u);
    res.cookies.set("dc_fb_state", "", { path: "/admin/chatbot/facebook", maxAge: 0 });
    return res;
  };

  if (sp.get("error")) return back("denied");
  const state = sp.get("state") || "";
  const expected = req.cookies.get("dc_fb_state")?.value || "";
  if (!state || !expected || !same(state, expected)) return back("state");
  const code = sp.get("code");
  if (!code) return back("denied");

  const s = await getChatbotSettings();
  if (!s.appId || !s.appSecret) return back("noapp");

  try {
    const { user, pages } = await pagesFromCode(s, code, req.nextUrl.origin + callbackPath);
    if (!pages.length) return back("nopages");
    if (pages.length === 1) {
      const { warnings } = await connectPage(pages[0], user, req.nextUrl.origin);
      return back(warnings.length ? "partial" : "connected", warnings.join("\n"));
    }
    await savePending(user, pages);
    return back("pick");
  } catch (e: any) {
    return back("error", e?.message || "Facebook login failed.");
  }
}
