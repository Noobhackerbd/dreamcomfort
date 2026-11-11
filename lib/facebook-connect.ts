// lib/facebook-connect.ts — "Continue with Facebook" for the AI Chat Bot.
//
// Instead of copying a Page access token by hand, the admin logs in with Facebook, picks
// the Page, and we:
//   1. swap the login code for a long-lived user token (server side, with the App Secret),
//   2. read the Pages that account manages — each comes with its own Page token, which
//      does not expire when it comes from a long-lived user token,
//   3. save the chosen Page's token, subscribe the Page to the app's messages, and
//      register the webhook on the app (so the manual webhook steps go away too).
//
// Tokens never reach the browser. While the admin is choosing a Page, the list (with
// tokens) waits in the settings table for 10 minutes.
import "server-only";
import { randomBytes } from "crypto";
import { getServerSupabase } from "@/lib/supabase/server";
import { getChatbotSettings, saveChatbotSettings, saveSettingQuiet, fbApp, type ChatbotSettings } from "@/lib/chatbot";

export const GRAPH_VERSION = "v23.0";
const GRAPH = `https://graph.facebook.com/${GRAPH_VERSION}`;
const PENDING_KEY = "chatbot_fb_pending";
const PENDING_TTL_MS = 10 * 60 * 1000;

/** What the bot needs: list Pages, read + send Page messages, subscribe the Page to webhooks. */
export const FB_SCOPES = [
  "pages_show_list",
  "pages_messaging",
  "pages_manage_metadata",
  "pages_read_engagement",
  "business_management", // Pages owned through a Business portfolio don't show up without it
  "pages_read_user_content", // read comments on the Page's posts and ads
  "pages_manage_engagement", // reply to those comments
];
export const WEBHOOK_FIELDS = "messages,messaging_postbacks,message_echoes,feed";

export const callbackPath = "/admin/chatbot/facebook/callback";

export function loginDialogUrl(appId: string, redirectUri: string, state: string, configId?: string) {
  const q = new URLSearchParams({ client_id: appId, redirect_uri: redirectUri, state, response_type: "code" });
  // Apps using "Facebook Login for Business" pick permissions in a saved configuration;
  // classic Facebook Login asks for them here.
  if (configId) q.set("config_id", configId);
  else {
    q.set("scope", FB_SCOPES.join(","));
    q.set("auth_type", "rerequest"); // ask again for any permission unticked last time
  }
  return `https://www.facebook.com/${GRAPH_VERSION}/dialog/oauth?${q}`;
}

export const newState = () => randomBytes(18).toString("base64url");

async function graph(path: string, init?: RequestInit & { query?: Record<string, string> }) {
  const url = new URL(GRAPH + path);
  for (const [k, v] of Object.entries(init?.query ?? {})) url.searchParams.set(k, v);
  const r = await fetch(url, { ...init, cache: "no-store", signal: AbortSignal.timeout(12_000) });
  const j: any = await r.json().catch(() => ({}));
  if (!r.ok || j?.error) throw new Error(j?.error?.message || `Facebook error ${r.status}`);
  return j;
}

export type FbPage = { id: string; name: string; token: string; picture: string | null; canMessage: boolean };
type Pending = { at: number; user: string; pages: FbPage[] };

/** Login code → long-lived user token → the Pages it manages. */
export async function pagesFromCode(s: ChatbotSettings, code: string, redirectUri: string) {
  const app = fbApp(s);
  const short = await graph("/oauth/access_token", {
    query: { client_id: app.appId, client_secret: app.appSecret, redirect_uri: redirectUri, code },
  });
  const long = await graph("/oauth/access_token", {
    query: {
      grant_type: "fb_exchange_token",
      client_id: app.appId,
      client_secret: app.appSecret,
      fb_exchange_token: short.access_token,
    },
  });
  const userToken: string = long.access_token || short.access_token;
  const me = await graph("/me", { query: { fields: "name", access_token: userToken } });
  const acc = await graph("/me/accounts", {
    query: { fields: "id,name,access_token,tasks,picture{url}", limit: "100", access_token: userToken },
  });
  const pages: FbPage[] = (acc.data ?? [])
    .filter((p: any) => p?.id && p?.access_token)
    .map((p: any) => ({
      id: String(p.id),
      name: String(p.name || p.id),
      token: String(p.access_token),
      picture: p.picture?.data?.url ?? null,
      // No "tasks" field means a full admin; otherwise the person needs the Messaging task.
      canMessage: !Array.isArray(p.tasks) || p.tasks.includes("MESSAGING") || p.tasks.includes("MANAGE"),
    }));
  return { user: String(me.name || ""), pages };
}

export async function savePending(user: string, pages: FbPage[]) {
  await saveSettingQuiet(PENDING_KEY, { at: Date.now(), user, pages } satisfies Pending);
}

export async function readPending(): Promise<Pending | null> {
  const { data } = await getServerSupabase().from("settings").select("value").eq("key", PENDING_KEY).maybeSingle();
  const v = data?.value as Pending | undefined;
  if (!v?.pages?.length || Date.now() - Number(v.at || 0) > PENDING_TTL_MS) return null;
  return v;
}

export async function clearPending() {
  await saveSettingQuiet(PENDING_KEY, { at: 0, user: "", pages: [] });
}

/**
 * Save the Page and wire it up. Returns warnings for the steps Facebook refused, so the
 * admin knows exactly what is left to do by hand (the Page is still saved).
 */
export async function connectPage(page: FbPage, connectedBy: string, origin: string) {
  const warnings: string[] = [];
  const s = await getChatbotSettings();

  // 1) Saved first: Facebook checks the webhook (step 3) against the verify token right away.
  const verifyToken = s.verifyToken || "dc-" + randomBytes(12).toString("hex");
  await saveChatbotSettings({
    ...s,
    pageAccessToken: page.token,
    pageId: page.id,
    pageName: page.name,
    connectedBy,
    connectedAt: new Date().toISOString(),
    verifyToken,
  });

  // 2) This Page's messages go to this app.
  try {
    await graph(`/${encodeURIComponent(page.id)}/subscribed_apps`, {
      method: "POST",
      query: { subscribed_fields: WEBHOOK_FIELDS, access_token: page.token },
    });
  } catch (e: any) {
    warnings.push(`Could not subscribe the Page to messages: ${e.message}. In your Facebook app → Messenger → Settings → Webhooks, press "Add subscriptions" for this Page.`);
  }

  // 3) The app sends them to our webhook. Facebook can only reach a public https address.
  const callbackUrl = `${origin}/api/messenger`;
  if (!/^https:\/\//.test(origin) || /localhost|127\.0\.0\.1/.test(origin)) {
    warnings.push("You are on a local address, so the webhook was not registered. Connect again from https://www.dreamcomfortbd.com/admin/chatbot.");
  } else {
    try {
      const app = fbApp(s);
      await graph(`/${encodeURIComponent(app.appId)}/subscriptions`, {
        method: "POST",
        query: {
          object: "page",
          callback_url: callbackUrl,
          fields: WEBHOOK_FIELDS,
          verify_token: verifyToken,
          access_token: `${app.appId}|${app.appSecret}`,
        },
      });
    } catch (e: any) {
      warnings.push(`Could not register the webhook automatically: ${e.message}. Add it by hand: Messenger → Settings → Webhooks → callback URL ${callbackUrl} with the verify token shown below.`);
    }
  }
  return { warnings };
}

/** Undo: stop the Page sending messages to the app, and forget its token. */
export async function disconnectPage() {
  const s = await getChatbotSettings();
  if (s.pageId && s.pageAccessToken) {
    try {
      await graph(`/${encodeURIComponent(s.pageId)}/subscribed_apps`, {
        method: "DELETE",
        query: { access_token: s.pageAccessToken },
      });
    } catch { /* token may already be dead — forget it anyway */ }
  }
  await saveChatbotSettings({ ...s, pageAccessToken: "", pageId: "", pageName: "", connectedBy: "", connectedAt: "" });
}
