import { BulkTranslate } from "@/components/admin/BulkTranslate";
import { getGeminiSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

export default async function AdminTranslatePage() {
  const { apiKey } = await getGeminiSettings();
  return (
    <div>
      <h1 className="text-2xl font-bold mb-1">AI Translate</h1>
      <p className="text-sm dc-muted mb-5">
        Type product names &amp; descriptions in one language — AI creates the other automatically.
        The storefront language switch (English / বাংলা) then shows the right one.
      </p>
      {!apiKey && (
        <div className="dc-card p-4 mb-5 max-w-xl" style={{ background: "var(--a-warn-soft)" }}>
          <p className="text-sm" style={{ color: "var(--a-warn)" }}>
            ⚠️ AI is not configured yet. Add a <b>Gemini API key</b> in <a href="/admin/settings" className="underline">Settings</a> to enable translation.
          </p>
        </div>
      )}
      <BulkTranslate />
    </div>
  );
}
