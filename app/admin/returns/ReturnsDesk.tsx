"use client";

import { useEffect, useState } from "react";
import { ScanBox, play, type Sound, type ScanOutcome } from "@/components/admin/ScanBox";
import { getReturns, scanReturn, forceReceive, markReceived, type ReturnRow, type ScanResult } from "./actions";

type Tab = "waiting" | "received" | "late";
type Data = Awaited<ReturnType<typeof getReturns>>;

const day = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", timeZone: "Asia/Dhaka" }) : "—";
const time = (iso: string | null) =>
  iso ? new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Dhaka" }) : "";
const daysSince = (iso: string | null) => (iso ? Math.floor((Date.now() - new Date(iso).getTime()) / 86400000) : 0);
const tel = (p: string) => `tel:+${(p || "").replace(/\D/g, "")}`;
const bdToday = () => new Date(Date.now() + 6 * 3600000).toISOString().slice(0, 10);
const isToday = (iso: string | null) => !!iso && new Date(new Date(iso).getTime() + 6 * 3600000).toISOString().slice(0, 10) === bdToday();

const SOUND_OF: Record<ScanResult["result"], Sound> = {
  received: "ok", already: "again", not_returned: "warn", not_found: "bad", error: "bad",
};

/** Short text for the full-screen camera view. */
function describe(r: ScanResult): { title: string; detail?: string } {
  switch (r.result) {
    case "received": return { title: `${r.order.order_number} · রিসিভ হয়েছে`, detail: [r.order.customer_name, r.order.items].filter(Boolean).join(" · ") };
    case "already": return { title: `${r.order.order_number} আগেই রিসিভ করা`, detail: `${day(r.order.return_received_at)} ${time(r.order.return_received_at)}` };
    case "not_returned": return { title: `${r.order.order_number} রিটার্ন হিসেবে নেই`, detail: `এখন: ${r.order.status}${r.order.courier_last_raw ? " · " + r.order.courier_last_raw : ""} — তবুও রিসিভ করতে পেজের বাটন ব্যবহার করুন` };
    case "not_found": return { title: "অর্ডার পাওয়া যায়নি", detail: r.code };
    default: return { title: "সমস্যা হয়েছে", detail: r.error };
  }
}

export function ReturnsDesk() {
  const [data, setData] = useState<Data | null>(null);
  const [tab, setTab] = useState<Tab>("waiting");
  const [busy, setBusy] = useState(false);
  const [last, setLast] = useState<ScanResult | null>(null);

  async function load() {
    try { setData(await getReturns()); } catch {}
  }
  useEffect(() => {
    load();
    const t = setInterval(load, 60000);
    return () => clearInterval(t);
  }, []);

  async function onScan(code: string): Promise<ScanOutcome> {
    try {
      const r = await scanReturn(code);
      setLast(r);
      if (r.result === "received") load();
      return { sound: SOUND_OF[r.result], ...describe(r) };
    } catch (e: any) {
      setLast({ result: "error", error: e?.message || "সমস্যা হয়েছে" });
      return { sound: "bad", title: "সমস্যা হয়েছে", detail: e?.message };
    }
  }

  async function force(o: ReturnRow) {
    setBusy(true);
    const r = await forceReceive(o.id);
    setBusy(false);
    if (r.ok) {
      setLast({ result: "received", order: { ...o, status: "returned", return_received_at: new Date().toISOString() } });
      play("ok");
      load();
    }
  }

  async function toggle(o: ReturnRow, received: boolean) {
    const r = await markReceived(o.id, received);
    if (r.ok) load();
  }

  if (data && !data.ok && !data.migrated) {
    return (
      <div className="dc-card p-5 max-w-2xl text-sm">
        <p className="font-bold mb-2">ডাটাবেসে একটা ছোট আপডেট বাকি</p>
        <p className="dc-muted">Supabase → SQL Editor-এ <code>supabase-migration-returns.sql</code> ফাইলের লেখাগুলো চালান, তারপর এই পেজ রিফ্রেশ করুন।</p>
      </div>
    );
  }

  const waiting = data?.ok ? data.waiting : [];
  const received = data?.ok ? data.received : [];
  const late = data?.ok ? data.lateDelivered : [];
  const receivedToday = received.filter((r) => isToday(r.return_received_at)).length;
  const rows = tab === "waiting" ? waiting : tab === "received" ? received : late;

  return (
    <div className="rt">
      <style>{CSS}</style>

      {/* Scanner */}
      <section className="rt-scan">
        <ScanBox
          label="লেবেলের QR স্ক্যান করুন"
          buttonText="রিসিভ"
          help="স্ক্যানার মেশিন বা মোবাইল ক্যামেরা দুটোই চলবে। নম্বর হাতে লিখেও Enter চাপতে পারেন। রিসিভ হলে “টিং-টিং”, আগেই রিসিভ করা হলে দুটো বিপ, ভুল হলে মোটা “বাজ” শব্দ হবে।"
          camTitle="রিটার্ন রিসিভ"
          camSubtitle="রিটার্ন পার্সেলের QR ফ্রেমের ভেতরে ধরুন"
          successWord="রিসিভ"
          todayLabel="আজ রিসিভ"
          todayCount={receivedToday}
          onScan={onScan}
        />
        <ResultCard r={last} onForce={force} busy={busy} />
      </section>

      {/* Counts */}
      <section className="rt-stats">
        <button className={`rt-stat ${tab === "waiting" ? "on" : ""}`} onClick={() => setTab("waiting")}>
          <span className="k">রিসিভ হয়নি</span><span className="v rt-num" style={{ color: waiting.length ? "var(--a-coral)" : "var(--a-ok)" }}>{waiting.length}</span>
        </button>
        <button className={`rt-stat ${tab === "received" ? "on" : ""}`} onClick={() => setTab("received")}>
          <span className="k">রিসিভ হয়েছে · আজ <b className="rt-num">{receivedToday}</b></span><span className="v rt-num" style={{ color: "var(--a-ok)" }}>{received.length}</span>
        </button>
        <button className={`rt-stat ${tab === "late" ? "on" : ""}`} onClick={() => setTab("late")}>
          <span className="k">রিটার্ন থেকে ডেলিভারড</span><span className="v rt-num" style={{ color: "var(--a-violet)" }}>{late.length}</span>
        </button>
      </section>

      {/* List */}
      <section className="dc-card rt-list">
        <div className="rt-list-h">
          <h2>{tab === "waiting" ? "রিটার্ন এসেছে, এখনো রিসিভ হয়নি" : tab === "received" ? "রিসিভ করা রিটার্ন (৩০ দিন)" : "রিটার্ন দেখাচ্ছিল, পরে ডেলিভারড হয়েছে"}</h2>
          {tab === "late" && <p>এগুলো রিটার্ন লিস্ট থেকে সরানো হয়েছে — কুরিয়ার এখন ডেলিভারড বলছে।</p>}
        </div>
        {!data ? (
          <p className="rt-empty">লোড হচ্ছে…</p>
        ) : rows.length === 0 ? (
          <p className="rt-empty">{tab === "waiting" ? "সব রিটার্ন রিসিভ হয়ে গেছে।" : "কিছু নেই।"}</p>
        ) : (
          <ul className="rt-rows">
            {rows.map((o) => (
              <li key={o.id} className="rt-r">
                <div className="min-w-0">
                  <div className="rt-r-top">
                    <a href={`/admin/orders/${o.id}`} className="rt-no rt-num">{o.order_number}</a>
                    {o.courier_flag === "late_return" && <span className="rt-badge coral">আগে ডেলিভারড দেখাচ্ছিল</span>}
                    {o.courier_flag === "late_delivered" && <span className="rt-badge violet">রিটার্ন → ডেলিভারড</span>}
                  </div>
                  <div className="rt-who">
                    {o.customer_name} · <a href={tel(o.customer_phone)} className="rt-num">{o.customer_phone}</a>
                  </div>
                  {o.items && <div className="rt-items">{o.items}</div>}
                </div>
                <div className="rt-r-side">
                  {tab === "waiting" && (
                    <>
                      <span className="rt-when">রিটার্ন {day(o.returned_at)}{daysSince(o.returned_at) > 0 && <b className="rt-num"> · {daysSince(o.returned_at)} দিন</b>}</span>
                      <button className="rt-btn-line" onClick={() => toggle(o, true)}>রিসিভ</button>
                    </>
                  )}
                  {tab === "received" && (
                    <>
                      <span className="rt-when ok">✓ {day(o.return_received_at)} <span className="rt-num">{time(o.return_received_at)}</span></span>
                      <button className="rt-btn-ghost" onClick={() => toggle(o, false)}>আনডু</button>
                    </>
                  )}
                  {tab === "late" && <span className="rt-when">ডেলিভারড {day(o.courier_flag_at)}</span>}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function ResultCard({ r, onForce, busy }: { r: ScanResult | null; onForce: (o: ReturnRow) => void; busy: boolean }) {
  if (!r) {
    return (
      <div className="rt-result idle">
        <span className="rt-result-ic">⌁</span>
        <p className="t">স্ক্যানের অপেক্ষায়</p>
        <p className="s">রিটার্ন পার্সেলের লেবেলে QR আছে — সেটা স্ক্যান করুন।</p>
      </div>
    );
  }
  if (r.result === "received") {
    return (
      <div className="rt-result ok">
        <span className="rt-result-ic">✓</span>
        <p className="t rt-num">{r.order.order_number} রিসিভ হয়েছে</p>
        <p className="s">{r.order.customer_name}{r.order.items ? " · " + r.order.items : ""}</p>
      </div>
    );
  }
  if (r.result === "already") {
    return (
      <div className="rt-result warn">
        <span className="rt-result-ic">!</span>
        <p className="t rt-num">{r.order.order_number} আগেই রিসিভ করা</p>
        <p className="s">রিসিভ হয়েছিল {day(r.order.return_received_at)} {time(r.order.return_received_at)}</p>
      </div>
    );
  }
  if (r.result === "not_returned") {
    return (
      <div className="rt-result warn">
        <span className="rt-result-ic">?</span>
        <p className="t rt-num">{r.order.order_number} রিটার্ন হিসেবে নেই</p>
        <p className="s">এখনকার অবস্থা: <b>{r.order.status}</b>{r.order.courier_last_raw ? ` · কুরিয়ার: ${r.order.courier_last_raw}` : ""}</p>
        <button className="rt-btn-dark sm" disabled={busy} onClick={() => onForce(r.order)}>তবুও রিটার্ন হিসেবে রিসিভ করুন</button>
      </div>
    );
  }
  if (r.result === "not_found") {
    return (
      <div className="rt-result bad">
        <span className="rt-result-ic">×</span>
        <p className="t">অর্ডার পাওয়া যায়নি</p>
        <p className="s rt-num">“{r.code}”</p>
      </div>
    );
  }
  return (
    <div className="rt-result bad">
      <span className="rt-result-ic">×</span>
      <p className="t">সমস্যা হয়েছে</p>
      <p className="s">{r.error}</p>
    </div>
  );
}

const CSS = `
.rt{display:grid;gap:16px;max-width:1080px}
.rt-num{font-family:var(--font-admin-latin),var(--font-admin-bn),system-ui,sans-serif;font-variant-numeric:tabular-nums}
.rt button:focus-visible,.rt a:focus-visible,.rt input:focus-visible{outline:2px solid var(--a-violet);outline-offset:2px}

.rt-scan{display:grid;grid-template-columns:1.3fr 1fr;gap:16px;align-items:stretch}
.rt-scan-main{background:var(--a-surface);border:1px solid var(--a-border);border-radius:18px;padding:18px;box-shadow:var(--a-shadow)}
.rt-scan-label{display:block;font-size:17px;font-weight:700;margin-bottom:10px}
.rt-scan-row{display:flex;gap:8px;flex-wrap:wrap}
.rt-input{flex:1 1 200px;min-width:0;border:1.5px solid var(--a-border);border-radius:12px;padding:12px 14px;font-size:20px;font-weight:700;letter-spacing:.02em;
  font-family:var(--font-admin-latin),system-ui,sans-serif;background:var(--a-surface-2);outline:none}
.rt-input:focus{border-color:var(--a-text);background:#fff}
.rt-btn-dark{background:var(--a-text);color:#fff;border-radius:12px;padding:0 18px;font-weight:700;font-size:15px;min-height:48px}
.rt-btn-dark:disabled{opacity:.4}
.rt-btn-dark.sm{min-height:36px;font-size:13px;padding:0 12px;margin-top:10px}
.rt-btn-cam{border:1.5px solid var(--a-border);border-radius:12px;padding:0 14px;font-weight:600;font-size:14px;min-height:48px;background:#fff}
.rt-btn-cam[aria-pressed="true"]{border-color:var(--a-text)}
.rt-help{font-size:12.5px;color:var(--a-muted);margin-top:10px}
.rt-err{font-size:13px;color:#dc2626;margin-top:6px}
.rt-video{margin-top:12px;width:100%;max-height:300px;object-fit:cover;border-radius:12px;background:#000}

.rt-result{border-radius:18px;padding:18px;display:flex;flex-direction:column;justify-content:center;min-height:150px;border:1px solid transparent}
.rt-result .t{font-size:18px;font-weight:700;margin-top:8px}
.rt-result .s{font-size:13.5px;margin-top:2px;opacity:.85}
.rt-result-ic{width:38px;height:38px;border-radius:12px;display:grid;place-items:center;font-size:20px;font-weight:800}
.rt-result.idle{background:var(--a-surface-2);border-color:var(--a-border);color:var(--a-muted)}
.rt-result.idle .rt-result-ic{background:#fff;color:var(--a-faint)}
.rt-result.ok{background:var(--a-ok-soft);border-color:#bfe6cd;color:#14532d}
.rt-result.ok .rt-result-ic{background:var(--a-ok);color:#fff}
.rt-result.warn{background:var(--a-warn-soft);border-color:#f6d9b5;color:#78350f}
.rt-result.warn .rt-result-ic{background:var(--a-warn);color:#fff}
.rt-result.bad{background:#fdeaea;border-color:#f6c9c9;color:#7f1d1d}
.rt-result.bad .rt-result-ic{background:#dc2626;color:#fff}

.rt-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}
.rt-stat{text-align:left;background:var(--a-surface);border:1px solid var(--a-border);border-radius:16px;padding:12px 16px;display:flex;flex-direction:column;gap:2px;box-shadow:var(--a-shadow)}
.rt-stat .k{font-size:13px;color:var(--a-muted)}
.rt-stat .v{font-size:28px;font-weight:800;line-height:1.1}
.rt-stat.on{border-color:var(--a-text);box-shadow:0 0 0 1px var(--a-text)}

.rt-list{padding:18px;border-radius:18px}
.rt-list-h h2{font-size:16px;font-weight:700;margin:0}
.rt-list-h p{font-size:12.5px;color:var(--a-muted);margin-top:2px}
.rt-empty{font-size:14px;color:var(--a-muted);margin-top:12px}
.rt-rows{list-style:none;margin:12px 0 0;padding:0;display:grid}
.rt-r{display:flex;justify-content:space-between;gap:12px;align-items:center;padding:12px 0;border-top:1px solid var(--a-border-2)}
.rt-r-top{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.rt-no{font-weight:800;font-size:15px;color:var(--a-text);text-decoration:none}
.rt-no:hover{text-decoration:underline}
.rt-who{font-size:13.5px;margin-top:1px}
.rt-who a{color:var(--a-brand);text-decoration:none}
.rt-items{font-size:12.5px;color:var(--a-muted);margin-top:1px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:520px}
.rt-badge{font-size:11px;font-weight:700;border-radius:999px;padding:2px 8px}
.rt-badge.coral{background:var(--a-coral-soft);color:#c2410c}
.rt-badge.violet{background:var(--a-violet-soft);color:var(--a-violet)}
.rt-r-side{display:flex;align-items:center;gap:10px;flex-shrink:0}
.rt-when{font-size:12.5px;color:var(--a-muted);white-space:nowrap}
.rt-when b{color:var(--a-coral)}
.rt-when.ok{color:var(--a-ok);font-weight:600}
.rt-btn-line{border:1.5px solid var(--a-text);border-radius:10px;padding:6px 12px;font-size:13px;font-weight:700;background:#fff}
.rt-btn-ghost{border:1px solid var(--a-border);border-radius:10px;padding:6px 10px;font-size:12.5px;color:var(--a-muted);background:#fff}

@media (max-width:820px){
  .rt-scan{grid-template-columns:1fr}
  .rt-stats{grid-template-columns:1fr 1fr 1fr;gap:8px}
  .rt-stat{padding:10px 12px}
  .rt-stat .v{font-size:22px}
  .rt-r{flex-direction:column;align-items:flex-start}
  .rt-items{max-width:100%}
}
`;
