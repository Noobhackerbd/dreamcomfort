"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { saveShippingSettings, saveStoreSettings, saveSmsTemplates } from "./actions";
import type { ShippingSettings, StoreSettings } from "@/lib/settings";
import type { SmsTemplates } from "@/lib/sms/templates";

const cls = "w-full rounded-lg border px-4 py-2.5 text-sm outline-none focus:border-brand";

function Saved({ show }: { show: boolean }) {
  return show ? <span className="text-sm text-green-600 ml-3">সেভ হয়েছে ✓</span> : null;
}

export function SettingsForm({
  shipping,
  store,
  templates,
}: {
  shipping: ShippingSettings;
  store: StoreSettings;
  templates: SmsTemplates;
}) {
  const router = useRouter();

  const [inside, setInside] = useState(String(shipping.insideDhaka));
  const [outside, setOutside] = useState(String(shipping.outsideDhaka));
  const [shipSaved, setShipSaved] = useState(false);

  const [s, setS] = useState(store);
  const [storeSaved, setStoreSaved] = useState(false);

  const [t, setT] = useState(templates);
  const [tplSaved, setTplSaved] = useState(false);

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
    </div>
  );
}
