"use client";

import { useEffect, useState } from "react";
import { getReminderAdmin, saveReminderSettings } from "./actions";
import type { FollowUp, FollowUpStep } from "@/lib/chatbot";

type Data = Awaited<ReturnType<typeof getReminderAdmin>>;

const MAX_STEPS = 6;
const WINDOW_H = 23;

const bn = (n: number | string) => String(n).replace(/\d/g, (d) => "০১২৩৪৫৬৭৮৯"[Number(d)]);

/** 23 → "রাত ১১টা", 8 → "সকাল ৮টা" */
function hourLabel(h: number) {
  const part = h < 5 ? "রাত" : h < 12 ? "সকাল" : h < 16 ? "দুপুর" : h < 18 ? "বিকেল" : h < 20 ? "সন্ধ্যা" : "রাত";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${part} ${bn(h12)}টা`;
}

/** 0.0833 h → "৫ মিনিট", 6 → "৬ ঘণ্টা", 1.5 → "১ ঘণ্টা ৩০ মিনিট" */
function afterLabel(hours: number) {
  const mins = Math.round(hours * 60);
  if (mins < 60) return `${bn(mins)} মিনিট`;
  const h = Math.floor(mins / 60), m = mins % 60;
  return m ? `${bn(h)} ঘণ্টা ${bn(m)} মিনিট` : `${bn(h)} ঘণ্টা`;
}

const when = (iso: string) =>
  new Date(iso).toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Dhaka" });

function Switch({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button type="button" role="switch" aria-checked={on} aria-label={label} onClick={() => onChange(!on)}
      className="relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition"
      style={{ background: on ? "var(--a-ok, #16a34a)" : "#cfcfc9" }}>
      <span className="inline-block h-5 w-5 rounded-full bg-white shadow transition" style={{ transform: `translateX(${on ? 22 : 2}px)` }} />
    </button>
  );
}

/** "after N minutes / hours" — stored as hours, typed in either unit. */
function AfterInput({ hours, onChange }: { hours: number; onChange: (h: number) => void }) {
  const [unit, setUnit] = useState<"min" | "h">(hours < 1 ? "min" : "h");
  const shown = unit === "min" ? Math.round(hours * 60) : Math.round(hours * 10) / 10;
  return (
    <span className="inline-flex items-center gap-1.5 text-sm">
      শেষ মেসেজের
      <input type="number" min={unit === "min" ? 3 : 1} max={unit === "min" ? 1380 : 23} step={unit === "min" ? 1 : 0.5} value={shown}
        onChange={(e) => { const n = Number(e.target.value) || 0; onChange(unit === "min" ? n / 60 : n); }}
        className="dc-input" style={{ width: 72, padding: "4px 8px" }} />
      <select value={unit} onChange={(e) => setUnit(e.target.value as "min" | "h")} className="dc-input" style={{ width: "auto", padding: "4px 6px" }}>
        <option value="min">মিনিট</option>
        <option value="h">ঘণ্টা</option>
      </select>
      পর
    </span>
  );
}

/** The 24-hour window as a bar, with each reminder marked where it falls. */
function Timeline({ steps }: { steps: FollowUpStep[] }) {
  return (
    <div className="mt-1">
      <div className="relative h-8">
        <div className="absolute inset-x-0 top-3.5 h-1.5 rounded-full" style={{ background: "var(--a-surface-2)" }} />
        <div className="absolute top-3.5 h-1.5 rounded-r-full" style={{ left: `${(WINDOW_H / 24) * 100}%`, right: 0, background: "#fde2e2" }} title="২৪ ঘণ্টার পর পাঠানো যায় না" />
        {steps.map((st, i) => (
          <span key={i} title={`${bn(i + 1)} নম্বর · ${afterLabel(st.afterHours)} পর`}
            className="absolute top-1 flex h-6 w-6 -translate-x-1/2 items-center justify-center rounded-full text-[11px] font-bold"
            style={{ left: `${Math.min(st.afterHours, 24) / 24 * 100}%`, background: st.enabled ? "var(--a-coral)" : "var(--a-border)", color: st.enabled ? "#fff" : "var(--a-muted)" }}>
            {bn(i + 1)}
          </span>
        ))}
      </div>
      <div className="flex justify-between text-[11px] dc-muted">
        <span>কাস্টমারের শেষ মেসেজ</span><span>৬ ঘণ্টা</span><span>১২ ঘণ্টা</span><span>১৮ ঘণ্টা</span><span>২৪ ঘণ্টা</span>
      </div>
    </div>
  );
}

export function ReminderSettings() {
  const [d, setD] = useState<Data | null>(null);
  const [f, setF] = useState<FollowUp | null>(null);
  const [saving, setSaving] = useState(false);
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);
  const [dirty, setDirty] = useState(false);

  async function load(fill = false) {
    const r = await getReminderAdmin();
    setD(r);
    if (fill) { setF(r.followUp); setDirty(false); }
  }
  useEffect(() => { load(true); }, []);

  if (!d || !f) return <div className="dc-card p-5 dc-muted text-sm">লোড হচ্ছে…</div>;

  const set = (patch: Partial<FollowUp>) => { setF({ ...f, ...patch }); setDirty(true); setNote(null); };
  const setStep = (i: number, patch: Partial<FollowUpStep>) => set({ steps: f.steps.map((st, j) => (j === i ? { ...st, ...patch } : st)) });
  const removeStep = (i: number) => set({ steps: f.steps.filter((_, j) => j !== i) });
  const addStep = () => {
    const last = f.steps[f.steps.length - 1]?.afterHours ?? 0;
    set({ steps: [...f.steps, { enabled: true, afterHours: Math.min(22, Math.max(1, Math.round(last + 2))), text: "" }] });
  };

  async function save() {
    if (!f) return;
    setSaving(true); setNote(null);
    const r = await saveReminderSettings(f);
    setSaving(false);
    if (r.ok) { setNote({ ok: true, text: "সেভ হয়েছে ✓" }); await load(true); }
    else setNote({ ok: false, text: r.error || "সেভ হয়নি" });
  }

  const s = d.stats;
  const rate = s.week ? Math.round((s.repliedWeek / s.week) * 100) : 0;
  const hours = Array.from({ length: 24 }, (_, h) => h);

  return (
    <div className="grid gap-4">
      {/* Numbers */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { k: "আজ পাঠানো", v: bn(s.today) },
          { k: "গত ৭ দিনে", v: bn(s.week) },
          { k: "এরপর উত্তর দিয়েছে", v: s.week ? `${bn(s.repliedWeek)} (${bn(rate)}%)` : "—" },
          { k: "যায়নি", v: bn(s.failedWeek) },
        ].map((x) => (
          <div key={x.k} className="dc-card p-3.5">
            <div className="text-xs dc-muted">{x.k}</div>
            <div className="mt-1 text-xl font-bold" style={{ fontVariantNumeric: "tabular-nums" }}>{x.v}</div>
          </div>
        ))}
      </div>

      {!d.botOn && (
        <div className="rounded-xl p-3 text-sm" style={{ background: "#fff4e5", color: "#9a5b00" }}>
          AI Chat Bot এখন বন্ধ — বট বন্ধ থাকলে কোনো রিমাইন্ডার যায় না। AI Chat Bot পেজ থেকে চালু করুন।
        </div>
      )}

      {/* On / off */}
      <div className="dc-card flex items-start justify-between gap-4 p-4">
        <div>
          <h2 className="font-bold">রিমাইন্ডার চালু</h2>
          <p className="mt-0.5 text-xs dc-muted">
            কাস্টমার দাম/প্রোডাক্ট জেনে চুপ হয়ে গেলে নিচের সময়ে একটা একটা করে মেসেজ যায়। কাস্টমার উত্তর দিলে আবার প্রথম থেকে গোনা শুরু হয়।
            অর্ডার হয়ে গেলে, কাস্টমারের প্রশ্নের উত্তর এখনো বাকি থাকলে, বা চ্যাটে AI বন্ধ থাকলে যায় না।
          </p>
        </div>
        <Switch on={f.enabled} onChange={(enabled) => set({ enabled })} label="রিমাইন্ডার চালু" />
      </div>

      {/* Quiet hours */}
      <div className="dc-card p-4" style={{ opacity: f.enabled ? 1 : 0.6 }}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="font-bold">রাতে পাঠাবে না</h2>
            <p className="mt-0.5 text-xs dc-muted">এই সময়ের মধ্যে কোনো রিমাইন্ডার যাবে না; সময় হয়ে গেলে সকালে যাবে (২৪ ঘণ্টার ভেতরে থাকলে)। একসাথে কয়েকটা জমে গেলে শুধু শেষেরটা যায়।</p>
          </div>
          <Switch on={f.quiet.enabled} onChange={(enabled) => set({ quiet: { ...f.quiet, enabled } })} label="রাতে পাঠাবে না" />
        </div>
        {f.quiet.enabled && (
          <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
            <select value={f.quiet.from} onChange={(e) => set({ quiet: { ...f.quiet, from: Number(e.target.value) } })} className="dc-input" style={{ width: "auto" }}>
              {hours.map((h) => <option key={h} value={h}>{hourLabel(h)}</option>)}
            </select>
            থেকে
            <select value={f.quiet.to} onChange={(e) => set({ quiet: { ...f.quiet, to: Number(e.target.value) } })} className="dc-input" style={{ width: "auto" }}>
              {hours.map((h) => <option key={h} value={h}>{hourLabel(h)}</option>)}
            </select>
            পর্যন্ত বন্ধ
          </div>
        )}
      </div>

      {/* Steps */}
      <div className="dc-card p-4" style={{ opacity: f.enabled ? 1 : 0.6 }}>
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-bold">মেসেজগুলো ({bn(f.steps.length)}/{bn(MAX_STEPS)})</h2>
          <button type="button" onClick={addStep} disabled={f.steps.length >= MAX_STEPS} className="dc-btn text-sm disabled:opacity-50">+ নতুন রিমাইন্ডার</button>
        </div>
        <p className="mb-3 text-xs dc-muted">
          Facebook / WhatsApp-এর নিয়মে কাস্টমারের শেষ মেসেজের ২৪ ঘণ্টা পর আর পাঠানো যায় না, তাই সময় সর্বোচ্চ ২৩ ঘণ্টা।
          লেখায় “আপু” লিখুন — ছেলে কাস্টমার হলে নিজে থেকে “ভাইয়া” হয়ে যায়। সেভ করলে সময় অনুযায়ী সাজিয়ে নেয়।
        </p>
        <Timeline steps={f.steps} />
        <div className="mt-4 grid gap-3">
          {f.steps.length === 0 && <div className="dc-muted text-sm">কোনো রিমাইন্ডার নেই। “+ নতুন রিমাইন্ডার” চাপুন।</div>}
          {f.steps.map((st, i) => (
            <div key={i} className="rounded-xl p-3" style={{ background: "var(--a-surface-2)", opacity: st.enabled ? 1 : 0.65 }}>
              <div className="mb-2 flex flex-wrap items-center gap-x-3 gap-y-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold text-white" style={{ background: st.enabled ? "var(--a-coral)" : "var(--a-muted)" }}>{bn(i + 1)}</span>
                <AfterInput hours={st.afterHours} onChange={(afterHours) => setStep(i, { afterHours })} />
                <span className="ml-auto flex items-center gap-2 text-sm">
                  <Switch on={st.enabled} onChange={(enabled) => setStep(i, { enabled })} label={`${i + 1} নম্বর চালু`} />
                  <button type="button" onClick={() => { if (confirm(`${i + 1} নম্বর রিমাইন্ডার মুছে ফেলবেন?`)) removeStep(i); }} className="dc-btn text-xs">মুছুন</button>
                </span>
              </div>
              <textarea value={st.text} onChange={(e) => setStep(i, { text: e.target.value })} rows={6} className="dc-input" placeholder="আপু, আমাদের পিলো সেটটি কি পছন্দ হয়েছে? …" />
            </div>
          ))}
        </div>
      </div>

      {/* Recent */}
      <div className="dc-card p-4">
        <div className="mb-2 flex items-center justify-between gap-2">
          <h2 className="font-bold">সর্বশেষ পাঠানো রিমাইন্ডার</h2>
          <button type="button" onClick={() => load()} className="dc-btn text-xs">↻ রিফ্রেশ</button>
        </div>
        {d.log.length === 0 ? (
          <div className="text-sm dc-muted">এখনো কোনো রিমাইন্ডার যায়নি (এই তালিকা আজ থেকে রাখা হচ্ছে)।</div>
        ) : (
          <div className="grid">
            {d.log.map((e, i) => (
              <div key={i} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2 text-sm" style={{ borderTop: i ? "1px solid var(--a-border)" : undefined }}>
                <span className="font-semibold">{e.name || "নাম নেই"}</span>
                <span className="dc-muted text-xs">{bn(e.step)} নম্বর · {e.channel === "whatsapp" ? "WhatsApp" : "Messenger"} · {when(e.at)}</span>
                <span className="ml-auto rounded-full px-2 py-0.5 text-[11px] font-semibold"
                  style={!e.ok ? { background: "#fdeaea", color: "#dc2626" } : e.replied ? { background: "#e7f6ec", color: "#15803d" } : { background: "var(--a-surface-2)", color: "var(--a-muted)" }}
                  title={e.error || undefined}>
                  {!e.ok ? "যায়নি" : e.replied ? "উত্তর দিয়েছে ✓" : "উত্তর আসেনি"}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Save bar */}
      <div className={`dc-card z-30 p-3 ${dirty ? "sticky bottom-[84px] shadow-lg md:bottom-4" : ""}`}>
        <div className="flex items-center justify-end gap-3">
          {note && <span className="text-sm" style={{ color: note.ok ? "#15803d" : "#dc2626" }}>{note.text}</span>}
          {dirty && !note && <span className="text-sm dc-muted">সেভ করা হয়নি</span>}
          <button type="button" onClick={save} disabled={saving || !dirty} className="dc-btn dc-btn-solid disabled:opacity-50">{saving ? "সেভ হচ্ছে…" : "সেভ করুন"}</button>
        </div>
      </div>
    </div>
  );
}
