import { getShippingSettings, getStoreSettings, getCarryBeeSettings, getAiSettings, getMetaSettings, getTikTokSettings, getMobileSettings, getBdCourierSettings } from "@/lib/settings";
import { SettingsForm } from "./SettingsForm";
import { NotificationSetup } from "./NotificationSetup";

export const dynamic = "force-dynamic";

export default async function AdminSettings() {
  const [shipping, store, carrybee, ai, meta, tiktok, mobile, bdcourier] = await Promise.all([
    getShippingSettings(),
    getStoreSettings(),
    getCarryBeeSettings(),
    getAiSettings(),
    getMetaSettings(),
    getTikTokSettings(),
    getMobileSettings(),
    getBdCourierSettings(),
  ]);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-1">Settings</h1>
      <p className="text-sm dc-muted mb-5">Store, delivery, courier &amp; tracking — all in one place.</p>

      <div className="max-w-2xl mb-5">
        <NotificationSetup />
      </div>

      <SettingsForm shipping={shipping} store={store} carrybee={carrybee} ai={ai} meta={meta} tiktok={tiktok} mobile={mobile} bdcourier={bdcourier} />
    </div>
  );
}
