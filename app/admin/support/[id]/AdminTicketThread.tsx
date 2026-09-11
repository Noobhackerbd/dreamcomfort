"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { adminReplyTicket, setTicketStatus } from "../actions";

interface Msg { id: string; sender: string; body: string; created_at: string }

export function AdminTicketThread({ ticketId, status, messages }: { ticketId: string; status: string; messages: Msg[] }) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim()) return;
    setErr(null); setBusy(true);
    const res = await adminReplyTicket(ticketId, body);
    setBusy(false);
    if (!res.ok) { setErr(res.error ?? "Failed."); return; }
    setBody(""); router.refresh();
  }
  async function changeStatus(s: "open" | "answered" | "closed") {
    setBusy(true); await setTicketStatus(ticketId, s); setBusy(false); router.refresh();
  }

  return (
    <div>
      <div className="space-y-3">
        {messages.map((m) => {
          const admin = m.sender === "admin";
          return (
            <div key={m.id} className={"flex " + (admin ? "justify-end" : "justify-start")}>
              <div className={"max-w-[80%] rounded-2xl px-4 py-2.5 text-sm " + (admin ? "text-white" : "dc-card")} style={admin ? { background: "var(--a-brand)" } : undefined}>
                <p className="whitespace-pre-wrap leading-relaxed">{m.body}</p>
                <p className={"text-[10px] mt-1 " + (admin ? "text-white/70" : "dc-muted")}>{admin ? "You (support)" : "Customer"} · {new Date(new Date(m.created_at).getTime() + 6 * 3600000).toISOString().slice(0, 16).replace("T", " ")}</p>
              </div>
            </div>
          );
        })}
      </div>

      <form onSubmit={send} className="mt-5 flex items-end gap-2">
        <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={2} placeholder="Type a reply..." className="dc-input flex-1 resize-none" />
        <button type="submit" disabled={busy} className="dc-btn-solid shrink-0">{busy ? "..." : "Send"}</button>
      </form>
      {err && <p className="mt-2 text-sm text-red-600">{err}</p>}

      <div className="mt-4 flex items-center gap-2">
        <span className="text-xs dc-muted">Status:</span>
        {(["open", "answered", "closed"] as const).map((s) => (
          <button key={s} onClick={() => changeStatus(s)} disabled={busy}
            className={"rounded-full border px-3 py-1 text-xs font-medium " + (status === s ? "dc-pill-active" : "dc-pill")}>{s}</button>
        ))}
      </div>
    </div>
  );
}
