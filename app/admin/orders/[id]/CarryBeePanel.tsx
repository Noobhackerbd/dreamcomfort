"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { sendToCarryBee, refreshCarryBeeStatus } from "../actions";

export function CarryBeePanel({
  orderId,
  courier,
  trackingId,
  configured,
}: {
  orderId: string;
  courier: string;
  trackingId: string;
  configured: boolean;
}) {
  const router = useRouter();
  const sent = courier === "CarryBee" && !!trackingId;
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  async function send() {
    setBusy(true);
    setErr(null);
    setMsg(null);
    const res = await sendToCarryBee(orderId);
    setBusy(false);
    if (!res.ok) return setErr(res.error ?? "ব্যর্থ।");
    setMsg(`পাঠানো হয়েছে ✓ কনসাইনমেন্ট: ${res.consignmentId}${res.deliveryFee != null ? ` · ডেলিভারি ফি ৳${res.deliveryFee}` : ""}`);
    router.refresh();
  }

  async function refresh() {
    if (!trackingId) return;
    setBusy(true);
    setErr(null);
    const res = await refreshCarryBeeStatus(trackingId);
    setBusy(false);
    if (!res.ok) return setErr(res.error ?? "স্ট্যাটাস আনতে ব্যর্থ।");
    setStatus(res.status ?? "—");
  }

  return (
    <div className="mt-4 pt-4 border-t">
      <div className="flex items-center gap-2 mb-2">
        <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-amber-100 text-amber-700 text-xs">🐝</span>
        <h3 className="text-sm font-semibold">CarryBee কুরিয়ার</h3>
      </div>

      {!configured && (
        <p className="text-xs text-amber-700 bg-amber-50 rounded-lg px-3 py-2 mb-2">
          CarryBee কনফিগার করা হয়নি — .env এ <code>CARRYBEE_CLIENT_ID</code>, <code>CARRYBEE_CLIENT_SECRET</code>,
          <code> CARRYBEE_CLIENT_CONTEXT</code>, <code>CARRYBEE_STORE_ID</code> যোগ করুন।
        </p>
      )}

      {sent ? (
        <div className="text-sm space-y-2">
          <p>কনসাইনমেন্ট আইডি: <b className="text-brand-dark">{trackingId}</b></p>
          {status && <p>বর্তমান স্ট্যাটাস: <b>{status}</b></p>}
          <button
            onClick={refresh}
            disabled={busy || !configured}
            className="rounded-lg border px-4 py-1.5 text-sm hover:border-brand disabled:opacity-60"
          >
            {busy ? "..." : "🔄 স্ট্যাটাস রিফ্রেশ"}
          </button>
        </div>
      ) : (
        <button
          onClick={send}
          disabled={busy || !configured}
          className="rounded-lg bg-amber-500 text-white px-5 py-2 text-sm font-medium hover:bg-amber-600 disabled:opacity-60"
        >
          {busy ? "পাঠানো হচ্ছে..." : "🐝 CarryBee-তে পাঠান"}
        </button>
      )}

      {msg && <p className="mt-2 text-sm text-green-700">{msg}</p>}
      {err && <p className="mt-2 text-sm text-red-600">{err}</p>}
    </div>
  );
}
