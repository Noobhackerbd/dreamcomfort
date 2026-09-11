"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createTicket, type TicketRow } from "@/app/account/support-actions";

const CATS = [
  { key: "order", label: "অর্ডার সংক্রান্ত" },
  { key: "return", label: "রিটার্ন / রিফান্ড" },
  { key: "payment", label: "পেমেন্ট" },
  { key: "general", label: "সাধারণ" },
];
const TICKET_STATUS: Record<string, { label: string; bg: string; fg: string }> = {
  open: { label: "খোলা", bg: "#fef3e2", fg: "#b45309" },
  answered: { label: "উত্তর দেওয়া হয়েছে", bg: "#e7f6ec", fg: "#16a34a" },
  closed: { label: "বন্ধ", bg: "#f1f5f9", fg: "#475569" },
};

export function SupportPanel({ initial, defaultName, defaultPhone }: { initial: TicketRow[]; defaultName: string; defaultPhone: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(initial.length === 0);
  const [subject, setSubject] = useState("");
  const [category, setCategory] = useState("order");
  const [orderNo, setOrderNo] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const input = "w-full rounded-xl border border-black/10 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/15 transition";
  const label = "block text-[12px] font-medium text-gray-600 mb-1";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null); setBusy(true);
    const res = await createTicket({ name: defaultName, phone: defaultPhone.replace(/^88/, ""), subject, category, order_number: orderNo, message });
    setBusy(false);
    if (!res.ok) { setErr(res.error ?? "ব্যর্থ।"); return; }
    setSubject(""); setOrderNo(""); setMessage(""); setOpen(false);
    router.push(`/account/support/${res.id}`);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-500">{initial.length} টি টিকিট</p>
        <button onClick={() => setOpen((v) => !v)} className="rounded-xl bg-brand text-white px-4 py-2 text-sm font-semibold hover:bg-brand-dark">{open ? "বন্ধ করুন" : "+ নতুন টিকিট"}</button>
      </div>

      {open && (
        <form onSubmit={submit} className="rounded-3xl bg-white ring-1 ring-black/5 shadow-sm p-5 space-y-3 mb-5">
          <div className="grid sm:grid-cols-2 gap-3">
            <div><label className={label}>বিষয় *</label><input value={subject} onChange={(e) => setSubject(e.target.value)} className={input} placeholder="সংক্ষেপে সমস্যা" /></div>
            <div>
              <label className={label}>ক্যাটাগরি</label>
              <select value={category} onChange={(e) => setCategory(e.target.value)} className={input}>
                {CATS.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
              </select>
            </div>
          </div>
          <div><label className={label}>অর্ডার নম্বর (ঐচ্ছিক)</label><input value={orderNo} onChange={(e) => setOrderNo(e.target.value)} className={input} placeholder="DC-10001" /></div>
          <div><label className={label}>বিস্তারিত *</label><textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={4} className={input} placeholder="আপনার সমস্যা বিস্তারিত লিখুন..." /></div>
          {err && <p className="rounded-xl bg-red-50 text-red-600 text-sm px-3 py-2">{err}</p>}
          <button type="submit" disabled={busy} className="rounded-xl bg-brand text-white px-6 py-2.5 text-sm font-semibold hover:bg-brand-dark disabled:opacity-60">{busy ? "..." : "টিকিট পাঠান"}</button>
        </form>
      )}

      {initial.length === 0 ? (
        !open && <div className="rounded-3xl bg-white ring-1 ring-black/5 shadow-sm px-5 py-12 text-center text-gray-500">কোনো টিকিট নেই।</div>
      ) : (
        <div className="space-y-3">
          {initial.map((t) => {
            const st = TICKET_STATUS[t.status] ?? TICKET_STATUS.open;
            return (
              <a key={t.id} href={`/account/support/${t.id}`} className="flex items-center gap-3 rounded-2xl bg-white ring-1 ring-black/5 shadow-sm px-4 py-3.5 hover:ring-brand/30 transition">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-sm text-gray-900 truncate">{t.subject}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{t.order_number ? `#${t.order_number} · ` : ""}{new Date(new Date(t.updated_at).getTime() + 6 * 3600000).toISOString().slice(0, 10)}</p>
                </div>
                <span className="inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold whitespace-nowrap" style={{ background: st.bg, color: st.fg }}>{st.label}</span>
              </a>
            );
          })}
        </div>
      )}
    </div>
  );
}
