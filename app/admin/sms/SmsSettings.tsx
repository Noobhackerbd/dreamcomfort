"use client";

import { useEffect, useState } from "react";
import { getSmsAdmin, saveSmsConfig, sendTestSms, sendManualSms } from "./actions";

type Data = Awaited<ReturnType<typeof getSmsAdmin>>;

const EVENTS: { key: keyof Data["events"]; label: string; hint: string }[] = [
  { key: "confirmed", label: "অর্ডার কনফার্ম হলে", hint: "ট্র্যাকিং লিংকসহ" },
  { key: "shipped", label: "Shipped হলে", hint: "Dispatch-এ স্ক্যান করলেও" },
  { key: "order_placed", label: "অর্ডার করার সাথে সাথে", hint: "ওয়েবসাইট থেকে অর্ডার এলে" },
  { key: "delivered", label: "ডেলিভারড হলে", hint: "ধন্যবাদ মেসেজ" },
];

const when = (iso: string) =>
  new Date(iso).toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Dhaka" });

export function SmsSettings() {
  const [d, setD] = useState<Data | null>(null);
  const [enabled, setEnabled] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [senderId, setSenderId] = useState("");
  const [events, setEvents] = useState<Data["events"]>({ order_placed: false, confirmed: true, shipped: true, delivered: false });
  const [saving, setSaving] = useState(false);
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);
  const [testPhone, setTestPhone] = useState("");
  const [testNote, setTestNote] = useState<{ ok: boolean; text: string } | null>(null);
  const [testing, setTesting] = useState(false);
  const [mPhone, setMPhone] = useState("");
  const [mText, setMText] = useState("");
  const [mNote, setMNote] = useState<{ ok: boolean; text: string } | null>(null);

  async function load(fill = false) {
    const r = await getSmsAdmin();
    setD(r);
    if (fill) { setEnabled(r.enabled); setSenderId(r.senderId); setEvents(r.events); }
  }
  useEffect(() => { load(true); }, []);

  async function save() {
    setSaving(true); setNote(null);
    const r = await saveSmsConfig({ enabled, apiKey, senderId, events });
    setSaving(false);
    setNote(r.ok ? { ok: true, text: "সেভ হয়েছে ✓" } : { ok: false, text: r.error || "সেভ হয়নি" });
    if (r.ok) { setApiKey(""); load(); }
  }

  async function test() {
    setTesting(true); setTestNote(null);
    const r = await sendTestSms(testPhone);
    setTesting(false);
    setTestNote(r.ok ? { ok: true, text: "পাঠানো হয়েছে ✓ — ফোনে দেখুন" } : { ok: false, text: r.error || "পাঠানো যায়নি" });
    load();
  }

  async function manual(e: React.FormEvent) {
    e.preventDefault(); setMNote(null);
    const r = await sendManualSms(mPhone, mText);
    setMNote(r.ok ? { ok: true, text: "পাঠানো হয়েছে ✓" } : { ok: false, text: r.error || "পাঠানো যায়নি" });
    if (r.ok) setMText("");
    load();
  }

  if (!d) return <p className="text-sm dc-muted">লোড হচ্ছে…</p>;

  return (
    <div className="grid gap-5 max-w-3xl">
      {/* Connection */}
      <section className="dc-card p-5">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h2 className="font-bold text-[16px]">Automas SMS</h2>
            <p className="text-[13px] dc-muted">ফোন লগইনের কোড যে Automas দিয়ে যায়, অর্ডারের SMS-ও সেটা দিয়েই যাবে।</p>
          </div>
          <button
            type="button" onClick={() => setEnabled((v) => !v)} aria-pressed={enabled}
            className="inline-flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-semibold"
            style={{ background: enabled ? "var(--a-ok-soft)" : "var(--a-surface-2)", color: enabled ? "var(--a-ok)" : "var(--a-muted)" }}
          >
            <span className="relative inline-block h-6 w-11 rounded-full transition" style={{ background: enabled ? "var(--a-ok)" : "#c9c9c4" }}>
              <span className="absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all" style={{ left: enabled ? 22 : 2 }} />
            </span>
            {enabled ? "SMS চালু" : "SMS বন্ধ"}
          </button>
        </div>

        <div className="grid sm:grid-cols-2 gap-3 mt-4">
          <div>
            <label className="block text-[13px] font-medium dc-muted mb-1">API key</label>
            <input
              type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)} className="dc-input" autoComplete="off"
              placeholder={d.hasKey ? `সেভ করা আছে (${d.keyHint}) — বদলাতে নতুনটা দিন` : "Automas প্যানেল → Generate Api Key"}
              disabled={d.keyFromEnv}
            />
            {d.keyFromEnv && <p className="text-[12px] dc-muted mt-1">Vercel-এর AUTOMAS_API_KEY ব্যবহার হচ্ছে।</p>}
          </div>
          <div>
            <label className="block text-[13px] font-medium dc-muted mb-1">Sender ID</label>
            <input value={senderId} onChange={(e) => setSenderId(e.target.value)} className="dc-input" placeholder="যেমন 8809617XXXXXX" inputMode="numeric" />
          </div>
        </div>

        <p className="text-[13px] font-semibold mt-5 mb-2">কখন SMS যাবে</p>
        <div className="grid sm:grid-cols-2 gap-2">
          {EVENTS.map((ev) => (
            <label key={ev.key} className="flex items-start gap-2.5 rounded-xl border p-3 cursor-pointer" style={{ borderColor: events[ev.key] ? "var(--a-text)" : "var(--a-border)" }}>
              <input type="checkbox" className="mt-1" checked={events[ev.key]} onChange={(e) => setEvents((x) => ({ ...x, [ev.key]: e.target.checked }))} />
              <span>
                <span className="block text-sm font-semibold">{ev.label}</span>
                <span className="block text-[12px] dc-muted">{ev.hint}</span>
              </span>
            </label>
          ))}
        </div>
        <p className="text-[12px] dc-muted mt-2">বাংলা SMS-এ প্রতি ৬৭ অক্ষরে ১টা SMS-এর খরচ ধরা হয়। মেসেজের লেখা বদলাতে Settings → SMS templates।</p>

        <div className="flex items-center gap-3 mt-4">
          <button onClick={save} disabled={saving} className="dc-btn dc-btn-solid disabled:opacity-60">{saving ? "সেভ হচ্ছে…" : "সেভ করুন"}</button>
          {note && <span className="text-sm" style={{ color: note.ok ? "var(--a-ok)" : "#dc2626" }}>{note.text}</span>}
        </div>
      </section>

      {/* Test */}
      <section className="dc-card p-5">
        <h2 className="font-bold text-[15px]">টেস্ট SMS</h2>
        <p className="text-[13px] dc-muted">সেভ করার পর নিজের নম্বরে একটা পাঠিয়ে দেখুন।</p>
        <div className="flex gap-2 mt-3 flex-wrap">
          <input value={testPhone} onChange={(e) => setTestPhone(e.target.value)} placeholder="01XXXXXXXXX" inputMode="numeric" className="dc-input" style={{ maxWidth: 220 }} />
          <button onClick={test} disabled={testing || !testPhone.trim()} className="dc-btn disabled:opacity-50">{testing ? "পাঠানো হচ্ছে…" : "টেস্ট পাঠান"}</button>
        </div>
        {testNote && <p className="text-sm mt-2" style={{ color: testNote.ok ? "var(--a-ok)" : "#dc2626" }}>{testNote.text}</p>}
      </section>

      {/* Manual */}
      <form onSubmit={manual} className="dc-card p-5 grid gap-3">
        <h2 className="font-bold text-[15px]">নিজে SMS পাঠান</h2>
        <input value={mPhone} onChange={(e) => setMPhone(e.target.value)} placeholder="01XXXXXXXXX" inputMode="numeric" className="dc-input" style={{ maxWidth: 220 }} />
        <textarea value={mText} onChange={(e) => setMText(e.target.value)} rows={3} placeholder="মেসেজ লিখুন…" className="dc-input" />
        <div className="flex items-center gap-3">
          <button className="dc-btn dc-btn-solid" disabled={!mPhone.trim() || !mText.trim()}>পাঠান</button>
          <span className="text-[12px] dc-muted">{mText.length} অক্ষর</span>
          {mNote && <span className="text-sm" style={{ color: mNote.ok ? "var(--a-ok)" : "#dc2626" }}>{mNote.text}</span>}
        </div>
      </form>

      {/* Log */}
      <section className="dc-card p-5">
        <h2 className="font-bold text-[15px] mb-2">শেষ SMS-গুলো</h2>
        {d.logs.length === 0 ? (
          <p className="text-sm dc-muted">এখনো কিছু নেই।</p>
        ) : (
          <ul className="grid">
            {d.logs.map((l) => (
              <li key={l.id} className="py-2.5 border-t text-sm" style={{ borderColor: "var(--a-border-2)" }}>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[11px] font-bold rounded-full px-2 py-0.5" style={
                    l.status === "sent" ? { background: "var(--a-ok-soft)", color: "var(--a-ok)" }
                      : l.status === "failed" ? { background: "#fdeaea", color: "#dc2626" }
                      : { background: "var(--a-surface-2)", color: "var(--a-muted)" }
                  }>{l.status === "sent" ? "গেছে" : l.status === "failed" ? "যায়নি" : "পাঠানো হয়নি"}</span>
                  <span className="font-semibold tabular-nums">{l.phone}</span>
                  <span className="text-[12px] dc-muted">{when(l.created_at)}</span>
                </div>
                <p className="mt-1 text-[13px]">{l.message}</p>
                {l.status !== "sent" && l.provider_response && <p className="text-[12px] mt-0.5" style={{ color: "#b45309" }}>{l.provider_response}</p>}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
