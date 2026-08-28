import { getShippingSettings, getStoreSettings, getSmsTemplates, getCarryBeeSettings, getAiSettings, getMetaSettings, getTikTokSettings, getMobileSettings } from "@/lib/settings";
import { SettingsForm } from "./SettingsForm";
import { NotificationSetup } from "./NotificationSetup";

export const dynamic = "force-dynamic";

function envState(v?: string) {
  return v ? "✓ কনফিগার করা আছে" : "✗ সেট করা নেই";
}

export default async function AdminSettings() {
  const [shipping, store, templates, carrybee, ai, meta, tiktok, mobile] = await Promise.all([
    getShippingSettings(),
    getStoreSettings(),
    getSmsTemplates(),
    getCarryBeeSettings(),
    getAiSettings(),
    getMetaSettings(),
    getTikTokSettings(),
    getMobileSettings(),
  ]);

  const sms = {
    provider: process.env.SMS_PROVIDER || "bulksmsbd",
    apiKey: process.env.SMS_API_KEY,
    sender: process.env.SMS_SENDER_ID,
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">সেটিংস</h1>

      <div className="max-w-2xl mb-6">
        <NotificationSetup />
      </div>

      <SettingsForm shipping={shipping} store={store} templates={templates} carrybee={carrybee} ai={ai} meta={meta} tiktok={tiktok} mobile={mobile} />

      {/* Read-only env-configured integrations */}
      <div className="mt-8 max-w-2xl grid md:grid-cols-2 gap-4">
        <div className="rounded-xl border bg-white p-5 text-sm">
          <h2 className="font-semibold mb-3">SMS গেটওয়ে (env)</h2>
          <p className="flex justify-between"><span className="text-gray-500">Provider</span><span>{sms.provider}</span></p>
          <p className="flex justify-between"><span className="text-gray-500">API Key</span><span>{envState(sms.apiKey)}</span></p>
          <p className="flex justify-between"><span className="text-gray-500">Sender ID</span><span>{envState(sms.sender)}</span></p>
        </div>
      </div>
    </div>
  );
}
