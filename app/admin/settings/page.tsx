import { getShippingSettings, getStoreSettings, getSmsTemplates, getCarryBeeSettings, getAiSettings, getMetaSettings, getTikTokSettings, getMobileSettings, getBdCourierSettings } from "@/lib/settings";
import { SettingsForm } from "./SettingsForm";
import { NotificationSetup } from "./NotificationSetup";

export const dynamic = "force-dynamic";

function envState(v?: string) {
  return v ? "✓ Configured" : "✗ Not set";
}

export default async function AdminSettings() {
  const [shipping, store, templates, carrybee, ai, meta, tiktok, mobile, bdcourier] = await Promise.all([
    getShippingSettings(),
    getStoreSettings(),
    getSmsTemplates(),
    getCarryBeeSettings(),
    getAiSettings(),
    getMetaSettings(),
    getTikTokSettings(),
    getMobileSettings(),
    getBdCourierSettings(),
  ]);

  const sms = {
    provider: process.env.SMS_PROVIDER || "bulksmsbd",
    apiKey: process.env.SMS_API_KEY,
    sender: process.env.SMS_SENDER_ID,
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-1">Settings</h1>
      <p className="text-sm dc-muted mb-5">Store, delivery, courier &amp; tracking — all in one place.</p>

      <div className="max-w-2xl mb-5">
        <NotificationSetup />
      </div>

      <SettingsForm shipping={shipping} store={store} templates={templates} carrybee={carrybee} ai={ai} meta={meta} tiktok={tiktok} mobile={mobile} bdcourier={bdcourier} />

      {/* Read-only env-configured integrations */}
      <div className="mt-5 max-w-2xl grid md:grid-cols-2 gap-4">
        <div className="dc-card p-5 text-sm">
          <div className="flex items-center gap-2.5 mb-3">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-base shrink-0" style={{ background: "var(--a-surface-2)", color: "var(--a-muted)" }}>📨</span>
            <h2 className="font-bold text-[15.5px]">SMS gateway (env)</h2>
          </div>
          <p className="flex justify-between py-0.5"><span className="dc-muted">Provider</span><span className="font-medium">{sms.provider}</span></p>
          <p className="flex justify-between py-0.5"><span className="dc-muted">API Key</span><span className="font-medium">{envState(sms.apiKey)}</span></p>
          <p className="flex justify-between py-0.5"><span className="dc-muted">Sender ID</span><span className="font-medium">{envState(sms.sender)}</span></p>
        </div>
      </div>
    </div>
  );
}
