"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/admin/icons";
import { sendManualSms } from "./actions";

export function ManualSms() {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    const res = await sendManualSms(phone, message);
    setBusy(false);
    if (!res.ok) return setMsg(res.error ?? "Failed.");
    setMsg("Queued ✓");
    setMessage("");
    router.refresh();
  }

  return (
    <form onSubmit={send} className="dc-card p-4 space-y-3 mb-6">
      <div className="flex items-center gap-2">
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-base" style={{ background: "#eaf4fb", color: "#3E9BD1" }}>💬</span>
        <h2 className="font-bold text-[15px]">Manual SMS</h2>
      </div>
      <div>
        <label className="block text-[13px] font-medium dc-muted mb-1">Phone</label>
        <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="01XXXXXXXXX" inputMode="numeric" className="dc-input" />
      </div>
      <div>
        <label className="block text-[13px] font-medium dc-muted mb-1">Message</label>
        <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={3} placeholder="Write a message…" className="dc-input" />
      </div>
      <div className="flex items-center gap-3">
        <button disabled={busy} className="dc-btn dc-btn-solid disabled:opacity-60" style={{ background: "var(--a-violet)", borderColor: "var(--a-violet)" }}>
          <Icon name="chat" className="h-4 w-4" /> {busy ? "Sending…" : "Send"}
        </button>
        {msg && <span className="text-sm" style={{ color: msg.includes("✓") ? "var(--a-ok)" : "#dc2626" }}>{msg}</span>}
      </div>
    </form>
  );
}
