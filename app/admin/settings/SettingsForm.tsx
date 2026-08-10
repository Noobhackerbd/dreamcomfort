"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { saveShippingSettings, saveStoreSettings, saveSmsTemplates, saveCarryBeeSettings } from "./actions";
import type { ShippingSettings, StoreSettings, CarryBeeSettings } from "@/lib/settings";
import type { SmsTemplates } from "@/lib/sms/templates";

const cls = "w-full rounded-lg border px-4 py-2.5 text-sm outline-none focus:border-brand";

function Saved({ show }: { show: boolean }) {
  return show ? <span className="text-sm text-green-600 ml-3">সেভ হয়েছে ✓</span> : null;
}

export function SettingsForm({
  shipping,
  store,
  templates,
  carrybee,
}: {
  shipping: ShippingSettings;
  store: StoreSettings;
  templates: SmsTemplates;
  carrybee: CarryBeeSettings;
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
    </div>
  );
}
