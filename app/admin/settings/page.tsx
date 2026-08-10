import { getShippingSettings, getStoreSettings, getSmsTemplates, getCarryBeeSettings } from "@/lib/settings";
import { SettingsForm } from "./SettingsForm";

export const dynamic = "force-dynamic";

function envState(v?: string) {
  return v ? "✓ কনফিগার করা আছে" : "✗ সেট করা নেই";
}

export default async function AdminSettings() {
  const [shipping, store, templates, carrybee] = await Promise.all([
    getShippingSettings(),
    getStoreSettings(),
    getSmsTemplates(),
    getCarryBeeSettings(),
  ]);

  const meta = {
    pixel: process.env.NEXT_PUBLIC_META_PIXEL_ID,
    token: process.env.META_CAPI_ACCESS_TOKEN,
    test: process.env.META_TEST_EVENT_CODE,
  };
  const sms = {
    provider: process.env.SMS_PROVIDER || "bulksmsbd",
    apiKey: process.env.SMS_API_KEY,
    sender: process.env.SMS_SENDER_ID,
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">সেটিংস</h1>

      <SettingsForm shipping={shipping} store={store} templates={templates} carrybee={carrybee} />

      {/* Read-only env-configured integrations */}
      <div className="mt-8 max-w-2xl grid md:grid-cols-2 gap-4">
        <div className="rounded-xl border bg-white p-5 text-sm">
          <h2 className="font-semibold mb-3">Meta Pixel + CAPI (env)</h2>
          <p className="flex justify-between"><span className="text-gray-500">Pixel ID</span><span>{envState(meta.pixel)}</span></p>
          <p className="flex justify-between"><span className="text-gray-500">CAPI Token</span><span>{envState(meta.token)}</span></p>
          <p className="flex justify-between"><span className="text-gray-500">Test Event Code</span><span>{envState(meta.test)}</span></p>
          <p className="text-xs text-gray-400 mt-2">এই মানগুলো .env ফাইলে (সার্ভারে) সেট করা হয়, নিরাপত্তার জন্য এখানে শুধু অবস্থা দেখানো হয়।</p>
        </div>
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
