// lib/order-access.ts — who may see an order's personal details (name, phone, address)?
//
// Order numbers are sequential (DC-10001, DC-10002 …), so they are NOT a secret: anyone
// could type /order/DC-10050 and read a stranger's name, phone and address. We therefore
// only show the full order to:
//   • the browser that placed it — placeOrder() drops a SIGNED, httpOnly cookie ("dc_ov")
//     proving "this browser created order X" (can't be forged without the server secret), or
//   • the signed-in customer who owns it (orders.user_id, or their SMS-verified phone).
// Everyone else sees a masked version.

import "server-only";
import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";

const COOKIE = "dc_ov";
const KEEP = 6; // remember the last few orders from this browser
const MAX_AGE = 60 * 60 * 24 * 60; // 60 days

function secret(): string {
  return process.env.ORDER_VIEW_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || "";
}

function sign(orderNumber: string): string {
  return createHmac("sha256", secret()).update("order-view:" + orderNumber).digest("base64url").slice(0, 22);
}

function parse(raw: string | undefined): { n: string; s: string }[] {
  return (raw || "")
    .split("|")
    .map((e) => {
      const i = e.lastIndexOf(".");
      return i > 0 ? { n: e.slice(0, i), s: e.slice(i + 1) } : null;
    })
    .filter((x): x is { n: string; s: string } => !!x && !!x.n && !!x.s);
}

/** Call from a Server Action right after an order is created (sets the signed cookie). */
export function grantOrderView(orderNumber: string): void {
  if (!secret() || !orderNumber) return;
  try {
    const jar = cookies();
    const kept = parse(jar.get(COOKIE)?.value).filter((e) => e.n !== orderNumber);
    const next = [...kept, { n: orderNumber, s: sign(orderNumber) }].slice(-KEEP);
    jar.set(COOKIE, next.map((e) => `${e.n}.${e.s}`).join("|"), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: MAX_AGE,
    });
  } catch {
    /* never break checkout over this */
  }
}

/** True if THIS browser placed the order (valid signed cookie). */
export function hasOrderViewGrant(orderNumber: string): boolean {
  if (!secret() || !orderNumber) return false;
  try {
    const want = Buffer.from(sign(orderNumber));
    return parse(cookies().get(COOKIE)?.value).some((e) => {
      if (e.n !== orderNumber) return false;
      const got = Buffer.from(e.s);
      return got.length === want.length && timingSafeEqual(got, want);
    });
  } catch {
    return false;
  }
}

/** "Rahim Uddin" → "R***" ; "01712345678" → "017*****678". */
export function maskName(name?: string | null): string {
  const s = (name || "").trim();
  return s ? Array.from(s)[0] + "***" : "***";
}
export function maskPhone(phone?: string | null): string {
  const d = (phone || "").replace(/\D/g, "").replace(/^88/, "");
  return d.length >= 6 ? d.slice(0, 3) + "*".repeat(Math.max(3, d.length - 6)) + d.slice(-3) : "***";
}
