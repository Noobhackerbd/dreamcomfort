"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { replyToTicket } from "@/app/account/support-actions";

interface Msg { id: string; sender: string; body: string; created_at: string }

export function TicketThread({ ticketId, status, messages }: { ticketId: string; status: string; messages: Msg[] }) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const closed = status === "closed";

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim()) return;
    setErr(null); setBusy(true);
    const res = await replyToTicket(ticketId, body);
    setBusy(false);
    if (!res.ok) { setErr(res.error ?? "ব্যর্থ।"); return; }
    setBody(""); router.refresh();
  }

  return (
    <div>
      <div className="space-y-3">
        {messages.map((m) => {
          const admin = m.sender === "admin";
          return (
            <div key={m.id} className={"flex " + (admin ? "justify-start" : "justify-end")}>
              <div className={"max-w-[85%] rounded-2xl px-4 py-2.5 text-sm " + (admin ? "bg-white ring-1 ring-black/5 text-gray-800" : "bg-brand text-white")}>
                <p className="whitespace-pre-wrap leading-relaxed">{m.body}</p>
                <p className={"text-[10px] mt-1 " + (admin ? "text-gray-400" : "text-white/70")}>
                  {admin ? "সাপোর্ট" : "আপনি"} · {new Date(new Date(m.created_at).getTime() + 6 * 3600000).toISOString().slice(11, 16)}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {closed ? (
        <p className="mt-5 text-center text-sm text-gray-400">এই টিকিটটি বন্ধ করা হয়েছে।</p>
      ) : (
        <form onSubmit={send} className="mt-5 flex items-end gap-2">
          <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={2} placeholder="উত্তর লিখুন..." className="flex-1 rounded-xl border border-black/10 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/15 resize-none" />
          <button type="submit" disabled={busy} className="rounded-xl bg-brand text-white px-5 py-2.5 text-sm font-semibold hover:bg-brand-dark disabled:opacity-60 shrink-0">{busy ? "..." : "পাঠান"}</button>
        </form>
      )}
      {err && <p className="mt-2 text-sm text-red-600">{err}</p>}
    </div>
  );
}
