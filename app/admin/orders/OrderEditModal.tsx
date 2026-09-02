"use client";

import { useEffect, useState } from "react";
import { getOrderForPanel } from "./actions";
import { OrderPanel, type PanelOrder } from "./[id]/OrderPanel";

/** Opens the full order editor (OrderPanel) inside a popup instead of navigating to a
 *  separate /admin/orders/[id] page. Fetches the order on open. */
export function OrderEditModal({
  orderId,
  cbReady,
  onClose,
}: {
  orderId: string | null;
  cbReady: boolean;
  onClose: () => void;
}) {
  const [order, setOrder] = useState<PanelOrder | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!orderId) { setOrder(null); setErr(null); return; }
    let alive = true;
    setLoading(true); setErr(null); setOrder(null);
    getOrderForPanel(orderId)
      .then((res) => {
        if (!alive) return;
        if (res.ok) setOrder(res.order as PanelOrder);
        else setErr(res.error ?? "অর্ডার লোড হয়নি।");
      })
      .catch(() => alive && setErr("অর্ডার লোড হয়নি।"))
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, [orderId]);

  // Close on Escape.
  useEffect(() => {
    if (!orderId) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [orderId, onClose]);

  if (!orderId) return null;

  return (
    <div className="fixed inset-0 z-[85] bg-black/50 flex items-start justify-center overflow-y-auto p-2 sm:p-4" onClick={onClose}>
      <div
        className="bg-gray-50 rounded-2xl w-full max-w-5xl my-2 sm:my-6 shadow-2xl min-h-[40vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-white/95 backdrop-blur px-4 py-3 rounded-t-2xl">
          <h3 className="font-bold text-base">অর্ডার এডিট</h3>
          <button onClick={onClose} className="rounded-lg border px-3 py-1 text-sm text-gray-500 hover:bg-gray-100" aria-label="বন্ধ করুন">✕ বন্ধ</button>
        </div>
        <div className="p-3 sm:p-5">
          {loading && <p className="py-10 text-center text-gray-400">লোড হচ্ছে…</p>}
          {err && <p className="py-10 text-center text-red-600">{err}</p>}
          {order && <OrderPanel order={order} cbConfigured={cbReady} embedded onClose={onClose} />}
        </div>
      </div>
    </div>
  );
}
