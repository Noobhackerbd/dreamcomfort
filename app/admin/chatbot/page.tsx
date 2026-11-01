import { loadChatbotAdmin } from "./actions";
import { ChatbotAdmin } from "./ChatbotAdmin";

export const dynamic = "force-dynamic";
export const maxDuration = 60; // AI calls from the Test and Suggest buttons

export default async function AdminChatbotPage({
  searchParams,
}: {
  searchParams: { tab?: string; fb?: string; fbmsg?: string };
}) {
  const initial = await loadChatbotAdmin();
  // Set when Facebook login sends the admin back here (see ./facebook/callback).
  const fb = searchParams.fb ? { status: String(searchParams.fb), message: String(searchParams.fbmsg || "") } : null;
  return (
    <div>
      <h1 className="text-2xl font-bold mb-1">AI Chat Bot</h1>
      <p className="text-sm dc-muted mb-5">
        Answers your Facebook Page messages with AI, trained on your products and replies. Read every chat here and reply by hand whenever you want.
      </p>
      <ChatbotAdmin initial={initial} startTab={searchParams.tab === "connect" ? "connect" : undefined} fb={fb} />
    </div>
  );
}
