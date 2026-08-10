"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateOrderCourier } from "../actions";

export function CourierForm({
  orderId,
  courier,
  trackingId,
}: {
  orderId: string;
  courier: string;
  trackingId: string;
}) {
  const router = useRouter();
  const [c, setC] = useState(courier);
  const [t, setT] = useState(trackingId);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const cls = "w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-brand";

  async function save() {
    setBusy(true);
    setSaved(false);
    await updateOrderCourier(orderId, c, t);
    setBusy(false);
    setSaved(true);
    router.refresh();
  }

  return (
    <div className="grid sm:grid-cols-2 gap-2">
      <input value={c} onChange={(e) => setC(e.target.value)} placeholder="কুরিয়ার (যেমন: Steadfast)" className={cls} />
      <input value={t} onChange={(e) => setT(e.target.value)} placeholder="ট্র্যাকিং আইডি" className={cls} />
      <button onClick={save} disabled={busy} className="rounded-lg bg-brand text-white px-4 py-2 text-sm disabled:opacity-60 sm:col-span-2">
        {busy ? "সেভ হচ্ছে..." : saved ? "সেভ হয়েছে ✓" : "কুরিয়ার তথ্য সেভ করুন"}
      </button>
    </div>
  );
}
