"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { saveShippingSettings, saveStoreSettings, saveSmsTemplates, saveCarryBeeSettings, saveAiSettings, saveMetaSettings, saveTikTokSettings, saveMobileSettings, saveManualSettings } from "./actions";
import type { ShippingSettings, StoreSettings, CarryBeeSettings, AiSettings, MetaSettings, TikTokSettings, MobileSettings, ManualSettings } from "@/lib/settings";
import type { SmsTemplates } from "@/lib/sms/templates";

const cls = "w-full rounded-lg border px-4 py-2.5 text-sm outline-none focus:border-brand";

function Saved({ show }: { show: boolean }) {
  return show ? <span className="text-sm text-green-600 ml-3">সেভ হয়েছে ✓</span> : null;
}

function ToggleRow({ label, hint, on, onChange }: { label: string; hint?: string; on: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between gap-3 py-3">
      <div className="min-w-0">
        <p className="text-sm font-medium text-gray-800">{label}</p>
        {hint && <p className="text-xs text-gray-400 mt-0.5">{hint}</p>}
      </div>
      <button
        type="button"
        onClick={() => onChange(!on)}
        className={"shrink-0 h-6 w-11 rounded-full transition relative " + (on ? "bg-brand" : "bg-gray-300")}
        aria-pressed={on}
      >
        <span className={"absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all " + (on ? "left-[22px]" : "left-0.5")} />
      </button>
    </div>
  );
}

export function SettingsForm({
  shipping,
  store,
  templates,
  carrybee,
  ai,
  meta,
  tiktok,
  mobile,
  manual,
}: {
  shipping: ShippingSettings;
  store: StoreSettings;
  templates: SmsTemplates;
  carrybee: CarryBeeSettings;
  ai: AiSettings;
  meta: MetaSettings;
  tiktok: TikTokSettings;
  mobile: MobileSettings;
  manual: ManualSettings;
}) {
  const router = useRouter();

  const [inside, setInside] = useState(String(shipping.insideDhaka));
  const [outside, setOutside] = useState(String(shipping.outsideDhaka));
  const [shipSaved, setShipSaved] = useState(false);

  const [s, setS] = useState(store);
  const [storeSaved, setStoreSaved] = useState(false);

  const [t, setT] = useState(templates);
  const [tplSaved, setTplSaved] = useState(false);

  const [cb, setCb] = useState(carrybee);
  const [cbSaved, setCbSaved] = useState(false);
  const [cbErr, setCbErr] = useState<string | null>(null);
  const [cbBusy, setCbBusy] = useState(false);

  const [aiCfg, setAiCfg] = useState(ai);
  const [aiSaved, setAiSaved] = useState(false);
  const [aiErr, setAiErr] = useState<string | null>(null);
  const [aiBusy, setAiBusy] = useState(false);

  const [mt, setMt] = useState(meta);
  const [mtSaved, setMtSaved] = useState(false);
  const [mtErr, setMtErr] = useState<string | null>(null);
  const [mtBusy, setMtBusy] = useState(false);

  const [tt, setTt] = useState(tiktok);
  const [ttSaved, setTtSaved] = useState(false);
  const [ttErr, setTtErr] = useState<string | null>(null);
  const [ttBusy, setTtBusy] = useState(false);

  const [mb, setMb] = useState(mobile);
  const [mbSaved, setMbSaved] = useState(false);
  const [mbErr, setMbErr] = useState<string | null>(null);
  const [mbBusy, setMbBusy] = useState(false);
  const apiBase = typeof window !== "undefined" ? window.location.origin : "";

  const [mo, setMo] = useState(manual);
  const [moSaved, setMoSaved] = useState(false);
  const [moBusy, setMoBusy] = useState(false);
  async function saveMo(next: typeof mo) {
    setMo(next); setMoBusy(true); setMoSaved(false);
    const res = await saveManualSettings(next);
    setMoBusy(false);
    if (res.ok) { setMoSaved(true); router.refresh(); }
  }

  return (
    <div className="space-y-8 max-w-2xl">
      {/* Shipping */}
      <section className="rounded-xl border bg-white p-5">
        <h2 className="font-semibold mb-3">ডেলিভারি চার্জ</h2>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm mb-1">ঢাকার ভিতরে (৳)</label>
            <input value={inside} onChange={(e) => setInside(e.target.value)} inputMode="numeric" className={cls} />
          </div>
          <div>
            <label className="block text-sm mb-1">ঢাকার বাইরে (৳)</label>
            <input value={outside} onChange={(e) => setOutside(e.target.value)} inputMode="numeric" className={cls} />
          </div>
        </div>
        <div className="mt-3">
          <button
            onClick={async () => {
              await saveShippingSettings(Number(inside), Number(outside));
              setShipSaved(true);
              router.refresh();
            }}
            className="rounded-lg bg-brand text-white px-5 py-2 text-sm"
          >
            সেভ করুন
          </button>
          <Saved show={shipSaved} />
        </div>
      </section>

      {/* Store info */}
      <section className="rounded-xl border bg-white p-5">
        <h2 className="font-semibold mb-3">দোকানের তথ্য</h2>
        <div className="space-y-3">
          <input value={s.name} onChange={(e) => setS({ ...s, name: e.target.value })} placeholder="দোকানের নাম" className={cls} />
          <input value={s.phone} onChange={(e) => setS({ ...s, phone: e.target.value })} placeholder="ফোন" className={cls} />
          <input value={s.email} onChange={(e) => setS({ ...s, email: e.target.value })} placeholder="ইমেইল" className={cls} />
          <input value={s.facebook} onChange={(e) => setS({ ...s, facebook: e.target.value })} placeholder="Facebook URL" className={cls} />
          <input value={s.address} onChange={(e) => setS({ ...s, address: e.target.value })} placeholder="ঠিকানা" className={cls} />
        </div>
        <div className="mt-3">
          <button
            onClick={async () => {
              await saveStoreSettings(s);
              setStoreSaved(true);
              router.refresh();
            }}
            className="rounded-lg bg-brand text-white px-5 py-2 text-sm"
          >
            সেভ করুন
          </button>
          <Saved show={storeSaved} />
        </div>
      </section>

      {/* SMS templates */}
      <section className="rounded-xl border bg-white p-5">
        <h2 className="font-semibold mb-1">এসএমএস টেমপ্লেট</h2>
        <p className="text-xs text-gray-400 mb-3">
          প্লেসহোল্ডার: {"{name}"} {"{order}"} {"{total}"} {"{tracking}"}
        </p>
        <div className="space-y-3">
          {([
            ["order_placed", "অর্ডার প্লেসড"],
            ["confirmed", "কনফার্মড"],
            ["shipped", "শিপড"],
            ["delivered", "ডেলিভার্ড"],
          ] as const).map(([key, label]) => (
            <div key={key}>
              <label className="block text-sm mb-1">{label}</label>
              <textarea
                value={t[key]}
                onChange={(e) => setT({ ...t, [key]: e.target.value })}
                rows={2}
                className={cls}
              />
            </div>
          ))}
        </div>
        <div className="mt-3">
          <button
            onClick={async () => {
              await saveSmsTemplates(t);
              setTplSaved(true);
              router.refresh();
            }}
            className="rounded-lg bg-brand text-white px-5 py-2 text-sm"
          >
            সেভ করুন
          </button>
          <Saved show={tplSaved} />
        </div>
      </section>

      {/* CarryBee courier */}
      <section className="rounded-xl border bg-white p-5">
        <div className="flex items-center gap-2 mb-1">
          <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-amber-100 text-amber-700 text-xs">🐝</span>
          <h2 className="font-semibold">CarryBee কুরিয়ার</h2>
        </div>
        <p className="text-xs text-gray-400 mb-3">
          CarryBee মার্চেন্ট অ্যাকাউন্টের API তথ্য দিন। এগুলো সেভ করলে অর্ডার পেজ থেকে “Send to CarryBee” বাটন কাজ করবে।
        </p>
        <div className="space-y-3">
          <div>
            <label className="block text-sm mb-1">Environment</label>
            <select
              value={cb.env === "sandbox" ? "sandbox" : "production"}
              onChange={(e) => setCb({ ...cb, env: e.target.value })}
              className={cls}
            >
              <option value="production">Production (লাইভ)</option>
              <option value="sandbox">Sandbox (টেস্ট)</option>
            </select>
          </div>
          <div>
            <label className="block text-sm mb-1">Client ID</label>
            <input value={cb.clientId} onChange={(e) => setCb({ ...cb, clientId: e.target.value })} placeholder="CARRYBEE_CLIENT_ID" className={cls} />
          </div>
          <div>
            <label className="block text-sm mb-1">Client Secret</label>
            <input type="password" value={cb.clientSecret} onChange={(e) => setCb({ ...cb, clientSecret: e.target.value })} placeholder="CARRYBEE_CLIENT_SECRET" className={cls} autoComplete="new-password" />
          </div>
          <div>
            <label className="block text-sm mb-1">Client Context</label>
            <input value={cb.clientContext} onChange={(e) => setCb({ ...cb, clientContext: e.target.value })} placeholder="CARRYBEE_CLIENT_CONTEXT" className={cls} />
          </div>
          <div>
            <label className="block text-sm mb-1">Store ID</label>
            <input value={cb.storeId} onChange={(e) => setCb({ ...cb, storeId: e.target.value })} placeholder="21917" inputMode="numeric" className={cls} />
          </div>
          <div>
            <label className="block text-sm mb-1">প্রোডাক্টের ওজন (কেজি)</label>
            <input
              type="number"
              step="0.1"
              min="0.1"
              value={cb.defaultWeight ?? 1.5}
              onChange={(e) => setCb({ ...cb, defaultWeight: e.target.value === "" ? ("" as any) : Number(e.target.value) })}
              placeholder="1.5"
              inputMode="decimal"
              className={cls}
            />
            <p className="mt-1 text-xs text-gray-400">CarryBee-তে অর্ডার পাঠানোর সময় এই ওজন যাবে (ডিফল্ট ১.৫ কেজি)।</p>
          </div>
          <label className="flex items-center gap-2 text-sm rounded-lg bg-amber-50 border border-amber-200 px-3 py-2">
            <input type="checkbox" checked={!!cb.autoOnConfirm} onChange={(e) => setCb({ ...cb, autoOnConfirm: e.target.checked })} className="h-4 w-4 accent-amber-500" />
            অর্ডার <b>কনফার্ম</b> করলে স্বয়ংক্রিয়ভাবে CarryBee-তে পাঠাও (যেকোনো ডিভাইস থেকে)। লেবেল প্রিন্ট হবে <a href="/admin/print-station" className="text-brand underline">প্রিন্ট স্টেশন</a> খোলা ল্যাপটপে।
          </label>
        </div>
        <div className="mt-3 flex items-center">
          <button
            onClick={async () => {
              setCbErr(null); setCbSaved(false); setCbBusy(true);
              const res = await saveCarryBeeSettings(cb);
              setCbBusy(false);
              if (!res.ok) { setCbErr(res.error ?? "সেভ ব্যর্থ।"); return; }
              setCbSaved(true);
              router.refresh();
            }}
            disabled={cbBusy}
            className="rounded-lg bg-brand text-white px-5 py-2 text-sm disabled:opacity-60"
          >
            {cbBusy ? "সেভ হচ্ছে..." : "সেভ করুন"}
          </button>
          <Saved show={cbSaved} />
          {cbErr && <span className="text-sm text-red-600 ml-3">{cbErr}</span>}
        </div>
        <p className="mt-2 text-xs text-gray-400">
          অবস্থা:{" "}
          {cb.clientId && cb.clientSecret && cb.clientContext ? (
            <span className="text-green-600">✓ কনফিগার করা আছে</span>
          ) : (
            <span className="text-amber-600">✗ অসম্পূর্ণ</span>
          )}
        </p>
      </section>

      {/* Manual / chat orders */}
      <section className="rounded-xl border bg-white p-5">
        <div className="flex items-center gap-2 mb-1">
          <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-purple-100 text-purple-700 text-xs">🧾</span>
          <h2 className="font-semibold">ম্যানুয়াল / চ্যাট অর্ডার</h2>
          {moBusy && <span className="text-xs text-gray-400">সেভ হচ্ছে...</span>}
          {moSaved && !moBusy && <span className="text-xs text-green-600">✓</span>}
        </div>
        <p className="text-xs text-gray-400 mb-3">
          WhatsApp/Messenger থেকে হাতে যোগ করা অর্ডার — ফিচার চালু/বন্ধ, আর ঐ অর্ডারগুলো Meta/TikTok-এ (server) পাঠানো হবে কিনা।
        </p>
        <div className="divide-y">
          <ToggleRow
            label="ম্যানুয়াল অর্ডার ফিচার"
            hint="অর্ডার পেজে “ম্যানুয়াল অর্ডার যোগ” বাটন দেখাবে।"
            on={mo.enabled}
            onChange={(v) => saveMo({ ...mo, enabled: v })}
          />
          <ToggleRow
            label="Meta-তে পাঠান (CAPI)"
            hint="চ্যাট/ম্যানুয়াল অর্ডার Meta Conversions API-তে Purchase হিসেবে যাবে — Meta আসল অর্ডারে অপটিমাইজ করবে।"
            on={mo.sendMeta}
            onChange={(v) => saveMo({ ...mo, sendMeta: v })}
          />
          <ToggleRow
            label="TikTok-এ পাঠান (Events API)"
            hint="চ্যাট/ম্যানুয়াল অর্ডার TikTok Events API-তে CompletePayment হিসেবে যাবে।"
            on={mo.sendTiktok}
            onChange={(v) => saveMo({ ...mo, sendTiktok: v })}
          />
        </div>

        {(mo.sendMeta || mo.sendTiktok) && (
          <div className="mt-4 rounded-lg bg-gray-50 border p-3">
            <p className="text-sm font-medium mb-1">কখন পাঠাবে?</p>
            <p className="text-xs text-gray-400 mb-2">ম্যানুয়াল অর্ডার Meta/TikTok-এ কোন সময়ে Purchase হিসেবে যাবে।</p>
            <div className="space-y-2">
              {[
                { v: "on_create", t: "অর্ডার তৈরি হলেই পাঠাও", d: "প্রতিটি ম্যানুয়াল অর্ডার সাথে সাথে যাবে (confirm না করলেও)।" },
                { v: "on_confirm", t: "শুধু confirmed হলে পাঠাও", d: "অর্ডার confirmed করলে তবেই যাবে — বাতিল/ভুয়া অর্ডার Meta-তে যাবে না। সবচেয়ে পরিষ্কার ডেটা।" },
                { v: "on_confirm_or_24h", t: "confirmed হলে, নাহলে ২৪ ঘণ্টা পর অটো", d: "confirmed করলে তখনই যাবে; না করলে ২৪ ঘণ্টা পর নিজে থেকেই চলে যাবে (ঘুমিয়ে থাকলে/ব্যস্ত থাকলেও মিস হবে না)।" },
              ].map((opt) => (
                <label
                  key={opt.v}
                  className={
                    "flex gap-2.5 cursor-pointer rounded-lg border p-2.5 " +
                    (mo.mode === opt.v ? "border-brand bg-brand/5" : "hover:border-gray-300")
                  }
                >
                  <input
                    type="radio"
                    name="manual-fire-mode"
                    className="mt-0.5 accent-brand"
                    checked={mo.mode === opt.v}
                    onChange={() => saveMo({ ...mo, mode: opt.v as ManualSettings["mode"] })}
                  />
                  <span>
                    <span className="block text-sm font-medium">{opt.t}</span>
                    <span className="block text-xs text-gray-500">{opt.d}</span>
                  </span>
                </label>
              ))}
            </div>
            {mo.mode === "on_confirm_or_24h" && (
              <p className="mt-2 rounded-md bg-amber-50 border border-amber-200 px-2.5 py-2 text-xs text-amber-800">
                ⏰ ২৪ ঘণ্টার অটো-পাঠানো কাজ করতে ঘণ্টায় একবার এই লিংকটি হিট হতে হবে (cron):
                <code className="mt-1 block bg-white/70 px-2 py-1 rounded break-all">/api/cron/manual-conversions?key=YOUR_SECRET</code>
                Vercel Cron বা cron-job.org দিয়ে সেট করুন। <code className="bg-white/70 px-1 rounded">key</code> = CRON_SECRET অথবা Android অ্যাপ টোকেন।
              </p>
            )}
          </div>
        )}

        <p className="mt-3 text-xs text-gray-400">💡 ওয়েবসাইটের অর্ডার এমনিতেই ট্র্যাক হয়; এটা শুধু হাতে-যোগ করা অর্ডারের জন্য। একই অর্ডার কখনো দুইবার যাবে না।</p>
      </section>

      {/* Meta Pixel + Conversions API */}
      <section className="rounded-xl border bg-white p-5">
        <div className="flex items-center gap-2 mb-1">
          <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-blue-100 text-blue-700 text-xs">📊</span>
          <h2 className="font-semibold">Meta Pixel + Conversions API</h2>
        </div>
        <p className="text-xs text-gray-400 mb-3">
          Facebook/Meta পিক্সেল আইডি ও Conversions API টোকেন দিন — ব্রাউজার ও সার্ভার দুই দিক থেকেই ইভেন্ট ট্র্যাক হবে।
        </p>
        <div className="space-y-3">
          <div>
            <label className="block text-sm mb-1">Pixel ID</label>
            <input value={mt.pixelId} onChange={(e) => setMt({ ...mt, pixelId: e.target.value.replace(/\D/g, "") })} placeholder="1234567890123456" inputMode="numeric" className={cls} />
          </div>
          <div>
            <label className="block text-sm mb-1">Conversions API Access Token</label>
            <input type="password" value={mt.capiToken} onChange={(e) => setMt({ ...mt, capiToken: e.target.value })} placeholder="EAAB..." autoComplete="new-password" className={cls} />
          </div>
          <div>
            <label className="block text-sm mb-1">Test Event Code (ঐচ্ছিক)</label>
            <input value={mt.testEventCode} onChange={(e) => setMt({ ...mt, testEventCode: e.target.value })} placeholder="TEST12345" className={cls} />
            <p className="mt-1 text-xs text-gray-400">শুধু Events Manager-এ টেস্ট করার সময় দিন। লাইভে খালি রাখুন।</p>
          </div>
        </div>
        <div className="mt-3 flex items-center">
          <button
            onClick={async () => {
              setMtErr(null); setMtSaved(false); setMtBusy(true);
              const res = await saveMetaSettings(mt);
              setMtBusy(false);
              if (!res.ok) { setMtErr(res.error ?? "সেভ ব্যর্থ।"); return; }
              setMtSaved(true);
              router.refresh();
            }}
            disabled={mtBusy}
            className="rounded-lg bg-brand text-white px-5 py-2 text-sm disabled:opacity-60"
          >
            {mtBusy ? "সেভ হচ্ছে..." : "সেভ করুন"}
          </button>
          <Saved show={mtSaved} />
          {mtErr && <span className="text-sm text-red-600 ml-3">{mtErr}</span>}
        </div>
        <p className="mt-2 text-xs text-gray-400">
          অবস্থা:{" "}
          {mt.pixelId && mt.capiToken ? <span className="text-green-600">✓ কনফিগার করা আছে</span> : <span className="text-amber-600">✗ অসম্পূর্ণ</span>}
        </p>
      </section>

      {/* TikTok Pixel + Events API */}
      <section className="rounded-xl border bg-white p-5">
        <div className="flex items-center gap-2 mb-1">
          <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-gray-900 text-white text-xs">🎵</span>
          <h2 className="font-semibold">TikTok Pixel + Events API</h2>
        </div>
        <p className="text-xs text-gray-400 mb-3">
          TikTok পিক্সেল আইডি ও Events API টোকেন দিন — ব্রাউজার ও সার্ভার দুই দিক থেকেই ইভেন্ট ট্র্যাক হবে (event_id দিয়ে dedup)।
        </p>
        <div className="space-y-3">
          <div>
            <label className="block text-sm mb-1">Pixel ID</label>
            <input value={tt.pixelId} onChange={(e) => setTt({ ...tt, pixelId: e.target.value.trim() })} placeholder="DA6Q9UBC77UES9741GT0" className={cls} />
          </div>
          <div>
            <label className="block text-sm mb-1">Events API Access Token</label>
            <input type="password" value={tt.accessToken} onChange={(e) => setTt({ ...tt, accessToken: e.target.value })} placeholder="TikTok Events Manager → Settings → Generate Access Token" autoComplete="new-password" className={cls} />
            <p className="mt-1 text-xs text-gray-400">TikTok Events Manager → তোমার pixel → Settings → Generate Access Token থেকে নিন।</p>
          </div>
          <div>
            <label className="block text-sm mb-1">Test Event Code (ঐচ্ছিক)</label>
            <input value={tt.testEventCode} onChange={(e) => setTt({ ...tt, testEventCode: e.target.value })} placeholder="TEST12345" className={cls} />
            <p className="mt-1 text-xs text-gray-400">
              সার্ভার থেকে ডেটা আসছে কিনা যাচাই করতে দিন — TikTok Events Manager → Test Events থেকে কোডটি পাবেন, এখানে বসিয়ে সেভ করে সাইটে একটা টেস্ট অর্ডার/ইভেন্ট করুন, Test Events-এ দেখাবে। <b>লাইভে খালি রাখুন।</b>
            </p>
          </div>
        </div>
        <div className="mt-3 flex items-center">
          <button
            onClick={async () => {
              setTtErr(null); setTtSaved(false); setTtBusy(true);
              const res = await saveTikTokSettings(tt);
              setTtBusy(false);
              if (!res.ok) { setTtErr(res.error ?? "সেভ ব্যর্থ।"); return; }
              setTtSaved(true);
              router.refresh();
            }}
            disabled={ttBusy}
            className="rounded-lg bg-brand text-white px-5 py-2 text-sm disabled:opacity-60"
          >
            {ttBusy ? "সেভ হচ্ছে..." : "সেভ করুন"}
          </button>
          <Saved show={ttSaved} />
          {ttErr && <span className="text-sm text-red-600 ml-3">{ttErr}</span>}
        </div>
        <p className="mt-2 text-xs text-gray-400">
          অবস্থা:{" "}
          {tt.pixelId && tt.accessToken ? <span className="text-green-600">✓ কনফিগার করা আছে (browser + server)</span> : tt.pixelId ? <span className="text-amber-600">শুধু browser pixel — server-এর জন্য টোকেন দিন</span> : <span className="text-amber-600">✗ অসম্পূর্ণ</span>}
        </p>
      </section>

      {/* Android app — API access token */}
      <section className="rounded-xl border bg-white p-5">
        <div className="flex items-center gap-2 mb-1">
          <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-green-100 text-green-700 text-xs">📱</span>
          <h2 className="font-semibold">অ্যান্ড্রয়েড অ্যাপ (API টোকেন)</h2>
        </div>
        <p className="text-xs text-gray-400 mb-3">
          অ্যাডমিন অ্যাপে লগইন করতে এই টোকেন লাগবে। অ্যাপে <b>API URL</b> ও <b>Access Token</b> বসান।
        </p>
        <div className="space-y-3">
          <div>
            <label className="block text-sm mb-1">API URL</label>
            <input readOnly value={apiBase} onFocus={(e) => e.currentTarget.select()} className={cls + " font-mono text-brand-dark"} />
          </div>
          <div>
            <label className="block text-sm mb-1">Access Token</label>
            <div className="flex gap-2">
              <input value={mb.apiKey} onChange={(e) => setMb({ apiKey: e.target.value.trim() })} placeholder="একটি লম্বা গোপন টোকেন" className={cls + " font-mono"} />
              <button
                type="button"
                onClick={() => {
                  const gen = (typeof crypto !== "undefined" && "randomUUID" in crypto)
                    ? crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "").slice(0, 8)
                    : Math.random().toString(36).slice(2) + Date.now().toString(36);
                  setMb({ apiKey: gen });
                }}
                className="shrink-0 rounded-lg border px-3 py-2 text-sm hover:bg-gray-50"
              >
                জেনারেট
              </button>
            </div>
            <p className="mt-1 text-xs text-gray-400">এটি একটি পাসওয়ার্ডের মতো — কাউকে দেবেন না। বদলালে অ্যাপে আবার লগইন করতে হবে।</p>
          </div>
        </div>
        <div className="mt-3 flex items-center">
          <button
            onClick={async () => {
              setMbErr(null); setMbSaved(false); setMbBusy(true);
              const res = await saveMobileSettings(mb);
              setMbBusy(false);
              if (!res.ok) { setMbErr(res.error ?? "সেভ ব্যর্থ।"); return; }
              setMbSaved(true);
              router.refresh();
            }}
            disabled={mbBusy}
            className="rounded-lg bg-brand text-white px-5 py-2 text-sm disabled:opacity-60"
          >
            {mbBusy ? "সেভ হচ্ছে..." : "সেভ করুন"}
          </button>
          <Saved show={mbSaved} />
          {mbErr && <span className="text-sm text-red-600 ml-3">{mbErr}</span>}
        </div>
        <p className="mt-2 text-xs text-gray-400">
          অবস্থা: {mb.apiKey ? <span className="text-green-600">✓ অ্যাপ লগইন চালু</span> : <span className="text-amber-600">✗ টোকেন সেট করুন (নইলে অ্যাপ কাজ করবে না)</span>}
        </p>
      </section>

      {/* AI (Anthropic) — order screenshot reader */}
      <section className="rounded-xl border bg-white p-5">
        <div className="flex items-center gap-2 mb-1">
          <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-purple-100 text-purple-700 text-xs">🤖</span>
          <h2 className="font-semibold">AI অর্ডার রিডার (Anthropic)</h2>
        </div>
        <p className="text-xs text-gray-400 mb-3">
          Anthropic API key দিন — মেসেঞ্জার/হোয়াটসঅ্যাপ অর্ডারের স্ক্রিনশট থেকে নাম, ফোন ও ঠিকানা স্বয়ংক্রিয়ভাবে পূরণ হবে।
        </p>
        <div className="space-y-3">
          <div>
            <label className="block text-sm mb-1">Anthropic API Key</label>
            <input
              type="password"
              value={aiCfg.apiKey}
              onChange={(e) => setAiCfg({ ...aiCfg, apiKey: e.target.value })}
              placeholder="sk-ant-..."
              autoComplete="new-password"
              className={cls}
            />
          </div>
          <div>
            <label className="block text-sm mb-1">Model</label>
            <input
              value={aiCfg.model}
              onChange={(e) => setAiCfg({ ...aiCfg, model: e.target.value })}
              placeholder="claude-sonnet-5"
              className={cls}
            />
            <p className="mt-1 text-xs text-gray-400">
              বর্তমান মডেল ব্যবহার করুন: <b>claude-sonnet-5</b> (সুপারিশকৃত) · claude-haiku-4-5-20251001 (সস্তা/দ্রুত) · claude-opus-5।
              পুরনো claude-3 মডেল আর কাজ করে না।
            </p>
          </div>
        </div>
        <div className="mt-3 flex items-center">
          <button
            onClick={async () => {
              setAiErr(null); setAiSaved(false); setAiBusy(true);
              const res = await saveAiSettings(aiCfg);
              setAiBusy(false);
              if (!res.ok) { setAiErr(res.error ?? "সেভ ব্যর্থ।"); return; }
              setAiSaved(true);
              router.refresh();
            }}
            disabled={aiBusy}
            className="rounded-lg bg-brand text-white px-5 py-2 text-sm disabled:opacity-60"
          >
            {aiBusy ? "সেভ হচ্ছে..." : "সেভ করুন"}
          </button>
          <Saved show={aiSaved} />
          {aiErr && <span className="text-sm text-red-600 ml-3">{aiErr}</span>}
        </div>
        <p className="mt-2 text-xs text-gray-400">
          অবস্থা:{" "}
          {aiCfg.apiKey ? <span className="text-green-600">✓ কনফিগার করা আছে</span> : <span className="text-amber-600">✗ সেট করা নেই</span>}
        </p>
      </section>
    </div>
  );
}
