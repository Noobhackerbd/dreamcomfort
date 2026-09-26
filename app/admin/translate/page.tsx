import { BulkTranslate } from "@/components/admin/BulkTranslate";
import { llmProvider } from "@/lib/llm";

export const dynamic = "force-dynamic";
// Bulk translation runs batches of AI calls from this page.
export const maxDuration = 60;

export default async function AdminTranslatePage() {
  const provider = await llmProvider();
  return (
    <div>
      <h1 className="text-2xl font-bold mb-1">AI Translate</h1>
      <p className="text-sm dc-muted mb-5">
        Type product names &amp; descriptions in one language — AI creates the other automatically.
        The storefront language switch (English / বাংলা) then shows the right one.
      </p>
      {!provider ? (
        <div className="dc-card p-4 mb-5 max-w-xl" style={{ background: "var(--a-warn-soft)" }}>
          <p className="text-sm" style={{ color: "var(--a-warn)" }}>
            ⚠️ AI is not configured yet. Add your <b>Claude (Anthropic) API key</b> in <a href="/admin/settings" className="underline">Settings → AI</a> to enable translation.
          </p>
        </div>
      ) : (
        <p className="text-xs dc-muted mb-4">
          Using: <b>{provider === "claude" ? "Claude" : "Gemini (add a Claude key in Settings → AI to switch)"}</b>
        </p>
      )}
      <BulkTranslate />
    </div>
  );
}
