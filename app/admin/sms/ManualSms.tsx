"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { sendManualSms } from "./actions";

export function ManualSms() {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const cls = "w-full rounded-lg border px-4 py-2.5 text-sm outline-none focus:border-brand";

  async function send(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    const res = await sendManualSms(phone, message);
    setBusy(false);
    if (!res.ok) return setMsg(res.error ?? "ব্যর্থ।");
    setMsg("এসএমএস কিউতে পাঠানো হয়েছে ✓");
    setMessage("");
    router.refresh();
  }

  return (
    <form onSubmit={send} className="rounded-xl border bg-white p-4 space-y-3 mb-6">
      <h2 className="font-semibold">ম্যানুয়াল এসএমএস</h2>
      <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="০১XXXXXXXXX" inputMode="numeric" className={cls} />
      <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={3} placeholder="মেসেজ লিখুন..." className={cls} />
      <div className="flex items-center gap-3">
        <button disabled={busy} className="rounded-lg bg-brand text-white px-5 py-2 text-sm disabled:opacity-60">
          {busy ? "পাঠানো হচ্ছে..." : "পাঠান"}
        </button>
        {msg && <span className="text-sm text-gray-500">{msg}</span>}
      </div>
    </form>
  );
}
