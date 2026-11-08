"use client";

import { useEffect, useState } from "react";
import { ScanBox, type Sound } from "@/components/admin/ScanBox";
import { getDispatch, dispatchScan, undoDispatch, recheckDispatch, type DispatchRow, type DispatchResult } from "./actions";

type Data = Awaited<ReturnType<typeof getDispatch>>;

const time = (iso: string | null) =>
  iso ? new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Dhaka" }) : "";
const day = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", timeZone: "Asia/Dhaka" }) : "";
const bdDate = (offsetDays = 0) => new Date(Date.now() + 6 * 3600000 - offsetDays * 86400000).toISOString().slice(0, 10);
const hoursSince = (iso: string | null) => (iso ? (Date.now() - new Date(iso).getTime()) / 3600000 : 0);
const notEntered = (r: DispatchRow) => !r.courier_status || ["pickup_requested", "pending", "unknown"].includes(r.courier_status);

const SOUND_OF: Record<DispatchResult["result"], Sound> = {
  shipped: "ok", already: "again", blocked: "warn", not_found: "bad", error: "bad",
};

function CourierChip({ r }: { r: DispatchRow }) {
  if (notEntered(r)) {
    const late = hoursSince(r.handed_at) >= 2;
    return <span className={`dp-chip ${late ? "bad" : "warn"}`}>{late ? "কুরিয়ার এন্ট্রি দেয়নি" : "Pickup requested"}</span>;
  }
  if (r.courier_status === "delivered") return <span className="dp-chip ok">Delivered</span>;
  if (r.courier_status === "returned") return <span className="dp-chip bad">Return</span>;
  return <span className="dp-chip ok">{r.courier_last_raw || "Picked"}</span>;
}

export function DispatchDesk() {
  const [date, setDate] = useState(bdDate());
  const [data, setData] = useState<Data | null>(null);
  const [last, setLast] = useState<DispatchResult | null>(null);
  const [checking, setChecking] = useState(false);

  async function load(d = date) {
    try { setData(await getDispatch(d)); } catch {}
  }
  useEffect(() => {
    load(date);
    const t = setInterval(() => load(date), 60000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date]);

  async function onScan(code: string): Promise<Sound> {
    try {
      const r = await dispatchScan(code);
      setLast(r);
      if (r.result === "shipped") {
        if (date !== bdDate()) setDate(bdDate());
        else load(date);
      }
      return SOUND_OF[r.result];
    } catch (e: any) {
      setLast({ result: "error", error: e?.message || "সমস্যা হয়েছে" });
      return "bad";
    }
  }

  async function recheck() {
    setChecking(true);
    try { await recheckDispatch(date); await load(date); } finally { setChecking(false); }
  }

  async function undo(r: DispatchRow) {
    if (!confirm(`${r.order_number} আজকের হিসাব থেকে বাদ দেবেন? (স্ট্যাটাস Shipped-ই থাকবে)`)) return;
    const res = await undoDispatch(r.id);
    if (res.ok) load(date);
  }

  if (data && !data.ok && !data.migrated) {
    return (
      <div className="dc-card p-5 max-w-2xl text-sm">
        <p className="font-bold mb-2">ডাটাবেসে একটা ছোট আপডেট বাকি</p>
        <p className="dc-muted">Supabase → SQL Editor-এ <code>supabase-migration-dispatch.sql</code> ফাইলের লেখাগুলো চালান, তারপর এই পেজ রিফ্রেশ করুন।</p>
      </div>
    );
  }

  const rows = data?.ok ? data.rows : [];
  const noEntry = data?.ok ? data.noEntry : [];
  const waitingEntry = rows.filter(notEntered);
  const pieces = rows.reduce((n, r) => n + (r.pieces || 0), 0);
  const isToday = date === bdDate();

  return (
    <div className="dp">
      <style>{CSS}</style>

      <section className="dp-top">
        <ScanBox
          label="পার্সেলের QR স্ক্যান করুন — কুরিয়ারকে দেওয়ার সময়"
          buttonText="Shipped"
          help="স্ক্যান করলেই অর্ডার Shipped হয়ে যাবে আর আজকের হিসাবে যোগ হবে। স্ক্যানার মেশিন, মোবাইল ক্যামেরা বা হাতে নম্বর লিখে Enter — সবই চলবে।"
          onScan={onScan}
        />
        <Result r={last} />
      </section>

      {noEntry.length > 0 && (
        <section className="dp-alert" role="alert">
          <div className="dp-alert-h">
            <span className="dp-alert-ic">!</span>
            <div>
              <p className="t">কুরিয়ার এন্ট্রি দেয়নি · <span className="dp-num">{noEntry.length}</span> টা পার্সেল</p>
              <p className="s">হ্যান্ডওভারের ২ ঘণ্টা পরও CarryBee-তে “Pickup requested” দেখাচ্ছে। রাইডার/হাবকে জানান।</p>
            </div>
          </div>
          <ul className="dp-alert-list">
            {noEntry.map((r) => (
              <li key={r.id}>
                <a href={`/admin/orders/${r.id}`} className="dp-num">{r.order_number}</a>
                <span>{r.customer_name}</span>
                <span className="dp-num dp-dim">{r.tracking_id}</span>
                <span className="dp-dim">দেওয়া হয়েছে {day(r.handed_at)} {time(r.handed_at)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="dp-stats">
        <div className="dp-stat big">
          <span className="k">{isToday ? "আজ কুরিয়ারকে দিয়েছি" : `${date} তারিখে দিয়েছি`}</span>
          <span className="v dp-num">{rows.length}</span>
          <span className="s">পার্সেল · <b className="dp-num">{pieces}</b> পিস</span>
        </div>
        <div className="dp-stat">
          <span className="k">কুরিয়ার এন্ট্রি দিয়েছে</span>
          <span className="v dp-num" style={{ color: "var(--a-ok)" }}>{rows.length - waitingEntry.length}</span>
        </div>
        <div className="dp-stat">
          <span className="k">এখনো Pickup requested</span>
          <span className="v dp-num" style={{ color: waitingEntry.length ? "var(--a-coral)" : "var(--a-text)" }}>{waitingEntry.length}</span>
        </div>
      </section>

      <section className="dc-card dp-list">
        <div className="dp-list-h">
          <h2>হ্যান্ডওভার লিস্ট</h2>
          <div className="dp-tools">
            <div className="dp-days">
              <button className={isToday ? "on" : ""} onClick={() => setDate(bdDate())}>আজ</button>
              <button className={date === bdDate(1) ? "on" : ""} onClick={() => setDate(bdDate(1))}>গতকাল</button>
              <input type="date" value={date} max={bdDate()} onChange={(e) => e.target.value && setDate(e.target.value)} aria-label="তারিখ" />
            </div>
            <button className="dp-recheck" onClick={recheck} disabled={checking || waitingEntry.length === 0}>
              {checking ? "চেক হচ্ছে…" : "↻ CarryBee স্ট্যাটাস চেক"}
            </button>
          </div>
        </div>
        {!data ? (
          <p className="dp-empty">লোড হচ্ছে…</p>
        ) : rows.length === 0 ? (
          <p className="dp-empty">{isToday ? "আজ এখনো কোনো পার্সেল স্ক্যান হয়নি।" : "এই দিনে কোনো পার্সেল স্ক্যান হয়নি।"}</p>
        ) : (
          <ul className="dp-rows">
            {rows.map((r, i) => (
              <li key={r.id} className={notEntered(r) ? "wait" : ""}>
                <span className="dp-n dp-num">{rows.length - i}</span>
                <div className="min-w-0">
                  <div className="dp-r-top">
                    <a href={`/admin/orders/${r.id}`} className="dp-no dp-num">{r.order_number}</a>
                    <CourierChip r={r} />
                  </div>
                  <div className="dp-who">{r.customer_name} <span className="dp-num dp-dim">· {r.tracking_id}</span></div>
                  {r.items && <div className="dp-items">{r.items}</div>}
                </div>
                <div className="dp-side">
                  <span className="dp-time dp-num">{time(r.handed_at)}</span>
                  <button className="dp-undo" onClick={() => undo(r)} title="ভুল স্ক্যান হলে হিসাব থেকে বাদ দিন">বাদ</button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Result({ r }: { r: DispatchResult | null }) {
  if (!r) {
    return (
      <div className="dp-res idle">
        <span className="ic">⌁</span>
        <p className="t">স্ক্যানের অপেক্ষায়</p>
        <p className="s">প্রতিটা পার্সেল কুরিয়ারের হাতে দেওয়ার সময় স্ক্যান করুন।</p>
      </div>
    );
  }
  if (r.result === "shipped") {
    const wait = notEntered(r.order);
    return (
      <div className="dp-res ok">
        <span className="ic">✓</span>
        <p className="t dp-num">{r.order.order_number} · Shipped</p>
        <p className="s">{r.order.customer_name}{r.order.pieces ? ` · ${r.order.pieces} পিস` : ""}</p>
        <p className="s">CarryBee: <b>{r.order.courier_last_raw || "—"}</b>{wait ? " — কুরিয়ার এখনো এন্ট্রি দেয়নি" : ""}</p>
      </div>
    );
  }
  if (r.result === "already") {
    return (
      <div className="dp-res warn">
        <span className="ic">!</span>
        <p className="t dp-num">{r.order.order_number} আগেই স্ক্যান করা</p>
        <p className="s">দেওয়া হয়েছে {day(r.order.handed_at)} {time(r.order.handed_at)}</p>
      </div>
    );
  }
  if (r.result === "blocked") {
    return (
      <div className="dp-res warn">
        <span className="ic">?</span>
        <p className="t dp-num">{r.order.order_number} Shipped করা যায়নি</p>
        <p className="s">{r.reason}</p>
      </div>
    );
  }
  if (r.result === "not_found") {
    return (
      <div className="dp-res bad">
        <span className="ic">×</span>
        <p className="t">অর্ডার পাওয়া যায়নি</p>
        <p className="s dp-num">“{r.code}”</p>
      </div>
    );
  }
  return (
    <div className="dp-res bad">
      <span className="ic">×</span>
      <p className="t">সমস্যা হয়েছে</p>
      <p className="s">{r.error}</p>
    </div>
  );
}

const CSS = `
.dp{display:grid;gap:16px;max-width:1080px}
.dp-num{font-family:var(--font-admin-latin),var(--font-admin-bn),system-ui,sans-serif;font-variant-numeric:tabular-nums}
.dp-dim{color:var(--a-muted)}
.dp button:focus-visible,.dp a:focus-visible,.dp input:focus-visible{outline:2px solid var(--a-violet);outline-offset:2px}
.dp-top{display:grid;grid-template-columns:1.3fr 1fr;gap:16px;align-items:stretch}

.dp-res{border-radius:18px;padding:18px;display:flex;flex-direction:column;justify-content:center;min-height:150px;border:1px solid transparent}
.dp-res .t{font-size:18px;font-weight:700;margin-top:8px}
.dp-res .s{font-size:13.5px;margin-top:2px;opacity:.9}
.dp-res .ic{width:38px;height:38px;border-radius:12px;display:grid;place-items:center;font-size:20px;font-weight:800}
.dp-res.idle{background:var(--a-surface-2);border-color:var(--a-border);color:var(--a-muted)}
.dp-res.idle .ic{background:#fff;color:var(--a-faint)}
.dp-res.ok{background:var(--a-ok-soft);border-color:#bfe6cd;color:#14532d}
.dp-res.ok .ic{background:var(--a-ok);color:#fff}
.dp-res.warn{background:var(--a-warn-soft);border-color:#f6d9b5;color:#78350f}
.dp-res.warn .ic{background:var(--a-warn);color:#fff}
.dp-res.bad{background:#fdeaea;border-color:#f6c9c9;color:#7f1d1d}
.dp-res.bad .ic{background:#dc2626;color:#fff}

.dp-alert{background:#fdeaea;border:1px solid #f6c9c9;border-radius:18px;padding:16px 18px;color:#7f1d1d}
.dp-alert-h{display:flex;gap:12px;align-items:flex-start}
.dp-alert-ic{width:34px;height:34px;flex:0 0 34px;border-radius:10px;background:#dc2626;color:#fff;display:grid;place-items:center;font-weight:800}
.dp-alert .t{font-size:16px;font-weight:700}
.dp-alert .s{font-size:13px;opacity:.85}
.dp-alert-list{list-style:none;margin:10px 0 0;padding:0;display:grid;gap:4px}
.dp-alert-list li{display:flex;gap:12px;flex-wrap:wrap;font-size:13.5px;padding:6px 10px;background:#fff;border-radius:10px}
.dp-alert-list a{font-weight:800;color:#7f1d1d}
.dp-alert-list .dp-dim{color:#9b5555}

.dp-stats{display:grid;grid-template-columns:1.4fr 1fr 1fr;gap:12px}
.dp-stat{background:var(--a-surface);border:1px solid var(--a-border);border-radius:16px;padding:12px 16px;display:flex;flex-direction:column;gap:2px;box-shadow:var(--a-shadow)}
.dp-stat .k{font-size:13px;color:var(--a-muted)}
.dp-stat .v{font-size:28px;font-weight:800;line-height:1.1}
.dp-stat .s{font-size:13px;color:var(--a-muted)}
.dp-stat.big{background:var(--a-text);border-color:var(--a-text);color:#fff}
.dp-stat.big .k,.dp-stat.big .s{color:#c9c9c4}
.dp-stat.big .s b{color:#fff}
.dp-stat.big .v{font-size:40px}

.dp-list{padding:18px;border-radius:18px}
.dp-list-h{display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap}
.dp-list-h h2{font-size:16px;font-weight:700;margin:0}
.dp-tools{display:flex;gap:8px;flex-wrap:wrap;align-items:center}
.dp-days{display:flex;gap:4px;align-items:center;background:var(--a-surface-2);border-radius:11px;padding:3px}
.dp-days button{border-radius:8px;padding:5px 10px;font-size:13px;color:var(--a-muted)}
.dp-days button.on{background:#fff;color:var(--a-text);font-weight:700;box-shadow:var(--a-shadow)}
.dp-days input{border:0;background:transparent;font-size:13px;padding:4px 6px;color:var(--a-text)}
.dp-recheck{border:1px solid var(--a-border);background:#fff;border-radius:10px;padding:6px 12px;font-size:13px;font-weight:600}
.dp-recheck:disabled{opacity:.45}
.dp-empty{font-size:14px;color:var(--a-muted);margin-top:12px}
.dp-rows{list-style:none;margin:12px 0 0;padding:0;display:grid}
.dp-rows li{display:grid;grid-template-columns:34px 1fr auto;gap:12px;align-items:center;padding:11px 0;border-top:1px solid var(--a-border-2)}
.dp-rows li.wait{background:linear-gradient(90deg,var(--a-coral-soft),transparent 60%);border-radius:10px}
.dp-n{width:30px;height:30px;border-radius:9px;background:var(--a-surface-2);display:grid;place-items:center;font-size:12.5px;font-weight:700;color:var(--a-muted)}
.dp-r-top{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.dp-no{font-weight:800;font-size:15px;color:var(--a-text);text-decoration:none}
.dp-no:hover{text-decoration:underline}
.dp-who{font-size:13.5px;margin-top:1px}
.dp-items{font-size:12.5px;color:var(--a-muted);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:520px}
.dp-chip{font-size:11px;font-weight:700;border-radius:999px;padding:2px 8px;white-space:nowrap}
.dp-chip.ok{background:var(--a-ok-soft);color:var(--a-ok)}
.dp-chip.warn{background:var(--a-warn-soft);color:var(--a-warn)}
.dp-chip.bad{background:#fdeaea;color:#dc2626}
.dp-side{display:flex;align-items:center;gap:10px}
.dp-time{font-size:13px;color:var(--a-muted)}
.dp-undo{border:1px solid var(--a-border);border-radius:9px;padding:4px 9px;font-size:12px;color:var(--a-muted);background:#fff}

@media (max-width:820px){
  .dp-top{grid-template-columns:1fr}
  .dp-stats{grid-template-columns:1fr 1fr}
  .dp-stat.big{grid-column:1 / -1}
  .dp-items{max-width:100%}
  .dp-rows li{grid-template-columns:30px 1fr}
  .dp-side{grid-column:2}
}
`;
