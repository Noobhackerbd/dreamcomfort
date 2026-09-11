"use server";

import { cookies } from "next/headers";
import { getWorkerPin } from "@/lib/settings";

const COOKIE = "dc_wpin";

/** Is the current request allowed into the worker panel? Open when no PIN is set. */
export async function workerAccess(): Promise<{ allowed: boolean; pinSet: boolean }> {
  const pin = await getWorkerPin();
  if (!pin) return { allowed: true, pinSet: false };
  const c = cookies().get(COOKIE)?.value;
  return { allowed: c === pin, pinSet: true };
}

/** Verify a submitted PIN; on success set a 30-day cookie. */
export async function verifyWorkerPin(pin: string) {
  const real = await getWorkerPin();
  if (!real) return { ok: true }; // no PIN configured — open
  if ((pin || "").trim() !== real) return { ok: false, error: "ভুল পিন।" };
  cookies().set(COOKIE, real, { path: "/worker", httpOnly: true, sameSite: "lax", maxAge: 30 * 86400 });
  return { ok: true };
}
