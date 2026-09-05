"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { saveShippingSettings, saveStoreSettings, saveSmsTemplates, saveCarryBeeSettings, saveAiSettings, saveMetaSettings, saveTikTokSettings, saveMobileSettings, saveBdCourierSettings } from "./actions";
import type { ShippingSettings, StoreSettings, CarryBeeSettings, AiSettings, MetaSettings, TikTokSettings, MobileSettings, BdCourierSettings } from "@/lib/settings";
import type { SmsTemplates } from "@/lib/sms/templates";

const cls = "dc-input";
const lbl = "block text-[13px] font-medium dc-muted mb-1";

/** A settings card with an icon header + optional description. */
function Card({
  icon, iconBg, iconColor, title, desc, children,
}: {
  icon: string; iconBg: string; iconColor: string; title: string; desc?: React.ReactNode; children: React.ReactNode;
}) {
  return (
    <section className="dc-card p-5">
      <div className="flex items-center gap-2.5 mb-1">
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-base shrink-0" style={{ background: iconBg, color: iconColor }}>{icon}</span>
        <h2 className="font-bold text-[15.5px]">{title}</h2>
      </div>
      {desc && <p className="text-xs dc-muted mb-4 leading-relaxed">{desc}</p>}
      {children}
    </section>
  );
}

/** Save button + saved/error feedback row (violet, matches the rest of the admin). */
function SaveRow({
  onSave, busy, saved, err,
}: {
  onSave: () => void; busy?: boolean; saved?: boolean; err?: string | null;
}) {
  return (
    <div className="mt-4 flex items-center">
      <button
        onClick={onSave}
        disabled={busy}
        className="dc-btn dc-btn-solid disabled:opacity-60"
        style={{ background: "var(--a-violet)", borderColor: "var(--a-violet)" }}
      >
        {busy ? "Saving…" : "Save"}
      </button>
      {saved && <span className="text-sm ml-3" style={{ color: "var(--a-ok)" }}>Saved ✓</span>}
      {err && <span className="text-sm ml-3" style={{ color: "#dc2626" }}>{err}</span>}
    </div>
  );
}

/** Green "configured" / amber "not set" status line. */
function StatusPill({ ok, okText, badText }: { ok: boolean; okText: string; badText: string }) {
  return (
    <p className="mt-3 text-xs dc-muted">
      Status:{" "}
      {ok
        ? <span className="font-semibold" style={{ color: "var(--a-ok)" }}>✓ {okText}</span>
        : <span className="font-semibold" style={{ color: "var(--a-warn)" }}>✗ {badText}</span>}
    </p>
  );
}

export function SettingsForm({
  shipping,
  store,
  templates,
  carrybee,
  ai,
  meta,
  tiktok,
  mobile,
  bdcourier,
}: {
  shipping: ShippingSettings;
  store: StoreSettings;
  templates: SmsTemplates;
  carrybee: CarryBeeSettings;
  ai: AiSettings;
  meta: MetaSettings;
  tiktok: TikTokSettings;
  mobile: MobileSettings;
  bdcourier: BdCourierSettings;
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

  const [aiCfg, setAiCfg] = useState(ai);
  const [aiSaved, setAiSaved] = useState(false);
  const [aiErr, setAiErr] = useState<string | null>(null);
  const [aiBusy, setAiBusy] = useState(false);

  const [mt, setMt] = useState(meta);
  const [mtSaved, setMtSaved] = useState(false);
  const [mtErr, setMtErr] = useState<string | null>(null);
  const [mtBusy, setMtBusy] = useState(false);

  const [tt, setTt] = useState(tiktok);
  const [ttSaved, setTtSaved] = useState(false);
  const [ttErr, setTtErr] = useState<string | null>(null);
  const [ttBusy, setTtBusy] = useState(false);

  const [mb, setMb] = useState(mobile);
  const [mbSaved, setMbSaved] = useState(false);
  const [mbErr, setMbErr] = useState<string | null>(null);
  const [mbBusy, setMbBusy] = useState(false);
  const apiBase = typeof window !== "undefined" ? window.location.origin : "";

  const [bc, setBc] = useState(bdcourier);
  const [bcSaved, setBcSaved] = useState(false);
  const [bcErr, setBcErr] = useState<string | null>(null);
  const [bcBusy, setBcBusy] = useState(false);

  return (
    <div className="space-y-5 max-w-2xl">
      {/* Delivery charges */}
      <Card icon="🚚" iconBg="#eafaf0" iconColor="#16a34a" title="Delivery charges"
        desc="Shipping fee shown at checkout — inside vs outside Dhaka.">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={lbl}>Inside Dhaka (৳)</label>
            <input value={inside} onChange={(e) => setInside(e.target.value)} inputMode="numeric" className={cls} />
          </div>
          <div>
            <label className={lbl}>Outside Dhaka (৳)</label>
            <input value={outside} onChange={(e) => setOutside(e.target.value)} inputMode="numeric" className={cls} />
          </div>
        </div>
        <SaveRow saved={shipSaved} onSave={async () => { await saveShippingSettings(Number(inside), Number(outside)); setShipSaved(true); router.refresh(); }} />
      </Card>

      {/* Store information */}
      <Card icon="🏪" iconBg="var(--a-violet-soft)" iconColor="var(--a-violet)" title="Store information"
        desc="Name, contact and address used across the site and invoices.">
        <div className="space-y-3">
          <div><label className={lbl}>Store name</label><input value={s.name} onChange={(e) => setS({ ...s, name: e.target.value })} placeholder="Dream Comfort" className={cls} /></div>
          <div className="grid md:grid-cols-2 gap-3">
            <div><label className={lbl}>Phone</label><input value={s.phone} onChange={(e) => setS({ ...s, phone: e.target.value })} placeholder="01XXXXXXXXX" className={cls} /></div>
            <div><label className={lbl}>Email</label><input value={s.email} onChange={(e) => setS({ ...s, email: e.target.value })} placeholder="hello@dreamcomfortbd.com" className={cls} /></div>
          </div>
          <div><label className={lbl}>Facebook URL</label><input value={s.facebook} onChange={(e) => setS({ ...s, facebook: e.target.value })} placeholder="https://facebook.com/…" className={cls} /></div>
          <div><label className={lbl}>Address</label><input value={s.address} onChange={(e) => setS({ ...s, address: e.target.value })} placeholder="Store address" className={cls} /></div>
        </div>
        <SaveRow saved={storeSaved} onSave={async () => { await saveStoreSettings(s); setStoreSaved(true); router.refresh(); }} />
      </Card>

      {/* SMS templates */}
      <Card icon="💬" iconBg="#eaf4fb" iconColor="#3E9BD1" title="SMS templates"
        desc={<>Placeholders: <code className="px-1 rounded" style={{ background: "var(--a-surface-2)" }}>{"{name}"}</code> <code className="px-1 rounded" style={{ background: "var(--a-surface-2)" }}>{"{order}"}</code> <code className="px-1 rounded" style={{ background: "var(--a-surface-2)" }}>{"{total}"}</code> <code className="px-1 rounded" style={{ background: "var(--a-surface-2)" }}>{"{tracking}"}</code></>}>
        <div className="space-y-3">
          {([
            ["order_placed", "Order placed"],
            ["confirmed", "Confirmed"],
            ["shipped", "Shipped"],
            ["delivered", "Delivered"],
          ] as const).map(([key, label]) => (
            <div key={key}>
              <label className={lbl}>{label}</label>
              <textarea value={t[key]} onChange={(e) => setT({ ...t, [key]: e.target.value })} rows={2} className={cls} />
            </div>
          ))}
        </div>
        <SaveRow saved={tplSaved} onSave={async () => { await saveSmsTemplates(t); setTplSaved(true); router.refresh(); }} />
      </Card>

      {/* CarryBee courier */}
      <Card icon="🐝" iconBg="#fdf3d6" iconColor="#b7791f" title="CarryBee courier"
        desc={"Merchant API details — enables the “Send to CarryBee” button on the orders page."}>
        <div className="space-y-3">
          <div>
            <label className={lbl}>Environment</label>
            <select value={cb.env === "sandbox" ? "sandbox" : "production"} onChange={(e) => setCb({ ...cb, env: e.target.value })} className={cls}>
              <option value="production">Production (live)</option>
              <option value="sandbox">Sandbox (test)</option>
            </select>
          </div>
          <div className="grid md:grid-cols-2 gap-3">
            <div><label className={lbl}>Client ID</label><input value={cb.clientId} onChange={(e) => setCb({ ...cb, clientId: e.target.value })} placeholder="CARRYBEE_CLIENT_ID" className={cls} /></div>
            <div><label className={lbl}>Store ID</label><input value={cb.storeId} onChange={(e) => setCb({ ...cb, storeId: e.target.value })} placeholder="21917" inputMode="numeric" className={cls} /></div>
          </div>
          <div><label className={lbl}>Client Secret</label><input type="password" value={cb.clientSecret} onChange={(e) => setCb({ ...cb, clientSecret: e.target.value })} placeholder="CARRYBEE_CLIENT_SECRET" className={cls} autoComplete="new-password" /></div>
          <div><label className={lbl}>Client Context</label><input value={cb.clientContext} onChange={(e) => setCb({ ...cb, clientContext: e.target.value })} placeholder="CARRYBEE_CLIENT_CONTEXT" className={cls} /></div>
          <div>
            <label className={lbl}>Parcel weight (kg)</label>
            <input type="number" step="0.1" min="0.1" value={cb.defaultWeight ?? 1.5}
              onChange={(e) => setCb({ ...cb, defaultWeight: e.target.value === "" ? ("" as any) : Number(e.target.value) })}
              placeholder="1.5" inputMode="decimal" className={cls} />
            <p className="mt-1 text-xs dc-muted">Default weight sent when creating a CarryBee parcel (default 1.5 kg).</p>
          </div>
          <label className="flex items-center gap-2.5 text-[13px] rounded-xl px-3 py-2.5" style={{ background: "#fdf6e3", border: "1px solid #f0e2bf", color: "var(--a-muted)" }}>
            <input type="checkbox" checked={!!cb.autoOnConfirm} onChange={(e) => setCb({ ...cb, autoOnConfirm: e.target.checked })} className="h-4 w-4 accent-amber-500" />
            <span>Auto-send to CarryBee when an order is <b>confirmed</b> (any device). Labels print on the laptop that has the <a href="/admin/print-station" className="underline" style={{ color: "var(--a-brand)" }}>Print Station</a> open.</span>
          </label>
        </div>
        <SaveRow busy={cbBusy} saved={cbSaved} err={cbErr}
          onSave={async () => { setCbErr(null); setCbSaved(false); setCbBusy(true); const res = await saveCarryBeeSettings(cb); setCbBusy(false); if (!res.ok) { setCbErr(res.error ?? "Save failed."); return; } setCbSaved(true); router.refresh(); }} />
        <StatusPill ok={!!(cb.clientId && cb.clientSecret && cb.clientContext)} okText="Configured" badText="Incomplete" />
      </Card>

      {/* BD Courier — customer success rate / fraud check */}
      <Card icon="🛡️" iconBg="#e7f6ec" iconColor="#16a34a" title="BD Courier — Customer success rate"
        desc={<>API token from <a href="https://bdcourier.com" target="_blank" rel="noopener" className="underline" style={{ color: "var(--a-brand)" }}>bdcourier.com</a>. Shows each customer&apos;s courier <b>success rate</b> (total parcels, delivered vs cancelled) in the order list — verify a new order before you confirm it.</>}>
        <div className="space-y-3">
          <div>
            <label className={lbl}>API Token</label>
            <input type="password" value={bc.apiToken} onChange={(e) => setBc({ ...bc, apiToken: e.target.value })}
              placeholder="bdcourier.com → Dashboard → API Token" autoComplete="new-password" className={cls + " font-mono"} />
            <p className="mt-1 text-xs dc-muted">Log in to bdcourier.com and copy the token from the Dashboard / API section. Keep it secret — it&apos;s like a password.</p>
          </div>
          <div>
            <label className={lbl}>Skip Meta/TikTok Purchase below this success rate (%)</label>
            <input type="number" min={0} max={100} inputMode="numeric"
              value={bc.suppressBelowRatio ?? 0}
              onChange={(e) => setBc({ ...bc, suppressBelowRatio: e.target.value === "" ? (0 as any) : Number(e.target.value) })}
              placeholder="0" className={cls} />
            <p className="mt-1 text-xs dc-muted">Orders from customers whose courier success rate is below this % won&apos;t fire the Purchase event (Pixel + CAPI) — so Meta/TikTok stop chasing fraud-prone buyers. <b>0 = off.</b> Needs the API token above. e.g. <b>50</b>.</p>
          </div>
        </div>
        <SaveRow busy={bcBusy} saved={bcSaved} err={bcErr}
          onSave={async () => { setBcErr(null); setBcSaved(false); setBcBusy(true); const res = await saveBdCourierSettings(bc); setBcBusy(false); if (!res.ok) { setBcErr(res.error ?? "Save failed."); return; } setBcSaved(true); router.refresh(); }} />
        <StatusPill ok={!!bc.apiToken} okText="Configured" badText="Not set — rate hidden" />
      </Card>

      {/* Meta Pixel + Conversions API */}
      <Card icon="📊" iconBg="#e8f0fe" iconColor="#2563eb" title="Meta Pixel + Conversions API"
        desc="Facebook/Meta Pixel ID and Conversions API token — tracks events from both browser and server.">
        <div className="space-y-3">
          <div><label className={lbl}>Pixel ID</label><input value={mt.pixelId} onChange={(e) => setMt({ ...mt, pixelId: e.target.value.replace(/\D/g, "") })} placeholder="1234567890123456" inputMode="numeric" className={cls} /></div>
          <div><label className={lbl}>Conversions API access token</label><input type="password" value={mt.capiToken} onChange={(e) => setMt({ ...mt, capiToken: e.target.value })} placeholder="EAAB…" autoComplete="new-password" className={cls} /></div>
          <div>
            <label className={lbl}>Test event code (optional)</label>
            <input value={mt.testEventCode} onChange={(e) => setMt({ ...mt, testEventCode: e.target.value })} placeholder="TEST12345" className={cls} />
            <p className="mt-1 text-xs dc-muted">Only for testing in Events Manager. Leave empty when live.</p>
          </div>
        </div>
        <SaveRow busy={mtBusy} saved={mtSaved} err={mtErr}
          onSave={async () => { setMtErr(null); setMtSaved(false); setMtBusy(true); const res = await saveMetaSettings(mt); setMtBusy(false); if (!res.ok) { setMtErr(res.error ?? "Save failed."); return; } setMtSaved(true); router.refresh(); }} />
        <StatusPill ok={!!(mt.pixelId && mt.capiToken)} okText="Configured" badText="Incomplete" />
      </Card>

      {/* TikTok Pixel + Events API */}
      <Card icon="🎵" iconBg="#111827" iconColor="#fff" title="TikTok Pixel + Events API"
        desc="TikTok Pixel ID and Events API token — tracks events from browser and server (deduped by event_id).">
        <div className="space-y-3">
          <div><label className={lbl}>Pixel ID</label><input value={tt.pixelId} onChange={(e) => setTt({ ...tt, pixelId: e.target.value.trim() })} placeholder="DA6Q9UBC77UES9741GT0" className={cls} /></div>
          <div>
            <label className={lbl}>Events API access token</label>
            <input type="password" value={tt.accessToken} onChange={(e) => setTt({ ...tt, accessToken: e.target.value })} placeholder="TikTok Events Manager → Settings → Generate Access Token" autoComplete="new-password" className={cls} />
            <p className="mt-1 text-xs dc-muted">Get it from TikTok Events Manager → your pixel → Settings → Generate Access Token.</p>
          </div>
          <div>
            <label className={lbl}>Test event code (optional)</label>
            <input value={tt.testEventCode} onChange={(e) => setTt({ ...tt, testEventCode: e.target.value })} placeholder="TEST12345" className={cls} />
            <p className="mt-1 text-xs dc-muted">Use it to verify server events — TikTok Events Manager → Test Events. <b>Leave empty when live.</b></p>
          </div>
        </div>
        <SaveRow busy={ttBusy} saved={ttSaved} err={ttErr}
          onSave={async () => { setTtErr(null); setTtSaved(false); setTtBusy(true); const res = await saveTikTokSettings(tt); setTtBusy(false); if (!res.ok) { setTtErr(res.error ?? "Save failed."); return; } setTtSaved(true); router.refresh(); }} />
        <p className="mt-3 text-xs dc-muted">
          Status:{" "}
          {tt.pixelId && tt.accessToken
            ? <span className="font-semibold" style={{ color: "var(--a-ok)" }}>✓ Configured (browser + server)</span>
            : tt.pixelId
              ? <span className="font-semibold" style={{ color: "var(--a-warn)" }}>Browser pixel only — add a token for server</span>
              : <span className="font-semibold" style={{ color: "var(--a-warn)" }}>✗ Incomplete</span>}
        </p>
      </Card>

      {/* Android app — API access token */}
      <Card icon="📱" iconBg="#eafaf0" iconColor="#16a34a" title="Android app (API token)"
        desc="Needed to log in to the admin app. Enter the API URL and access token in the app.">
        <div className="space-y-3">
          <div>
            <label className={lbl}>API URL</label>
            <input readOnly value={apiBase} onFocus={(e) => e.currentTarget.select()} className={cls + " font-mono"} style={{ color: "var(--a-brand)" }} />
          </div>
          <div>
            <label className={lbl}>Access token</label>
            <div className="flex gap-2">
              <input value={mb.apiKey} onChange={(e) => setMb({ apiKey: e.target.value.trim() })} placeholder="a long secret token" className={cls + " font-mono"} />
              <button
                type="button"
                onClick={() => {
                  const gen = (typeof crypto !== "undefined" && "randomUUID" in crypto)
                    ? crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "").slice(0, 8)
                    : Math.random().toString(36).slice(2) + Date.now().toString(36);
                  setMb({ apiKey: gen });
                }}
                className="dc-btn shrink-0"
              >
                Generate
              </button>
            </div>
            <p className="mt-1 text-xs dc-muted">This is like a password — don&apos;t share it. Changing it requires logging in to the app again.</p>
          </div>
        </div>
        <SaveRow busy={mbBusy} saved={mbSaved} err={mbErr}
          onSave={async () => { setMbErr(null); setMbSaved(false); setMbBusy(true); const res = await saveMobileSettings(mb); setMbBusy(false); if (!res.ok) { setMbErr(res.error ?? "Save failed."); return; } setMbSaved(true); router.refresh(); }} />
        <StatusPill ok={!!mb.apiKey} okText="App login enabled" badText="Set a token (app won't work otherwise)" />
      </Card>

      {/* AI (Anthropic) — order screenshot reader */}
      <Card icon="🤖" iconBg="#f3eefc" iconColor="#7c3aed" title="AI order reader (Anthropic)"
        desc="Enter an Anthropic API key — it auto-fills name, phone and address from Messenger/WhatsApp order screenshots.">
        <div className="space-y-3">
          <div>
            <label className={lbl}>Anthropic API key</label>
            <input type="password" value={aiCfg.apiKey} onChange={(e) => setAiCfg({ ...aiCfg, apiKey: e.target.value })} placeholder="sk-ant-…" autoComplete="new-password" className={cls} />
          </div>
          <div>
            <label className={lbl}>Model</label>
            <input value={aiCfg.model} onChange={(e) => setAiCfg({ ...aiCfg, model: e.target.value })} placeholder="claude-sonnet-5" className={cls} />
            <p className="mt-1 text-xs dc-muted">Recommended: <b>claude-sonnet-5</b> · claude-haiku-4-5-20251001 (cheaper/faster) · claude-opus-5. Old claude-3 models no longer work.</p>
          </div>
        </div>
        <SaveRow busy={aiBusy} saved={aiSaved} err={aiErr}
          onSave={async () => { setAiErr(null); setAiSaved(false); setAiBusy(true); const res = await saveAiSettings(aiCfg); setAiBusy(false); if (!res.ok) { setAiErr(res.error ?? "Save failed."); return; } setAiSaved(true); router.refresh(); }} />
        <StatusPill ok={!!aiCfg.apiKey} okText="Configured" badText="Not set" />
      </Card>
    </div>
  );
}
