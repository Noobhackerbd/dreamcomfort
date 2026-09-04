import Image from "next/image";
import { getServerSupabase } from "@/lib/supabase/server";
import { taka, bdDateTime } from "@/lib/format";
import { aiConfigured } from "@/lib/ai";
import { Icon } from "@/components/admin/icons";
import { AbandonedActions } from "./AbandonedActions";
import { ManualOrderModal, type PickProduct } from "../orders/ManualOrderModal";
import { AutoRefresh } from "@/components/admin/AutoRefresh";

export const dynamic = "force-dynamic";

const STATUS_TABS = [
  { value: "abandoned", label: "Incomplete" },
  { value: "converted", label: "Converted" },
  { value: "", label: "All" },
];
const RANGE_TABS = [
  { value: "today", label: "Today" },
  { value: "7d", label: "7 days" },
  { value: "", label: "All time" },
];

/** wa.me link from a BD phone. */
function waLink(phone?: string | null): string | null {
  const d = (phone || "").replace(/\D/g, "");
  if (!d) return null;
  let n = d;
  if (n.startsWith("00")) n = n.slice(2);
  if (n.startsWith("0")) n = "88" + n;
  else if (n.startsWith("1")) n = "880" + n;
  else if (!n.startsWith("880")) n = "880" + n;
  return "https://wa.me/" + n;
}

/** Relative "how long ago" label. */
function timeAgo(iso?: string | null): string {
  if (!iso) return "";
  const m = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.round(h / 24)}d ago`;
}

/** UTC cutoff for a range in Bangladesh time. */
function rangeCutoff(range?: string): string | null {
  if (range === "7d") return new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();
  if (range === "today") {
    const nowBd = new Date(Date.now() + 6 * 3600 * 1000);
    return new Date(Date.UTC(nowBd.getUTCFullYear(), nowBd.getUTCMonth(), nowBd.getUTCDate()) - 6 * 3600 * 1000).toISOString();
  }
  return null;
}

export default async function AbandonedPage({ searchParams }: { searchParams: { status?: string; range?: string } }) {
  const supabase = getServerSupabase();
  const status = searchParams.status ?? "abandoned";
  const range = searchParams.range ?? "";
  const cutoff = rangeCutoff(range);

  let query = supabase
    .from("abandoned_carts")
    .select("*, products(images)")
    .order("updated_at", { ascending: false })
    .limit(300);
  if (status) query = query.eq("status", status);
  if (cutoff) query = query.gte("updated_at", cutoff);

  const [{ data: leads }, aiReady, productsRes, statsRes] = await Promise.all([
    query,
    aiConfigured(),
    supabase.from("products").select("id, name_bn, name_en, price, images").eq("is_active", true).order("created_at", { ascending: false }),
    supabase.from("abandoned_carts").select("status, value, created_at").limit(5000),
  ]);
  const rows = leads ?? [];
  const pickProducts: PickProduct[] = (productsRes.data ?? []).map((p: any) => ({
    id: p.id,
    name: p.name_bn || p.name_en,
    price: Number(p.price),
    image: p.images?.[0] ?? null,
  }));

  // Stats focus on the OPEN queue (what still needs a follow-up call) — not the
  // auto-piled "converted" count, which just mirrors every storefront order.
  const all = (statsRes.data ?? []) as any[];
  const abandonedRows = all.filter((l) => l.status === "abandoned");
  const openLeads = abandonedRows.length;
  const recoverable = abandonedRows.reduce((n, l) => n + Number(l.value || 0), 0);
  const todayStart = rangeCutoff("today");
  const weekStart = rangeCutoff("7d");
  const newToday = todayStart ? abandonedRows.filter((l) => String(l.created_at) >= todayStart).length : 0;
  const new7d = weekStart ? abandonedRows.filter((l) => String(l.created_at) >= weekStart).length : 0;

  const cards = [
    { icon: "abandoned", label: "Open leads", value: openLeads.toLocaleString(), bg: "var(--a-violet-soft)", fg: "var(--a-violet)" },
    { icon: "money", label: "Recoverable", value: taka(recoverable), bg: "#fdeede", fg: "#c2792b" },
    { icon: "clock", label: "New today", value: newToday.toLocaleString(), bg: "#e8f0fe", fg: "#2563eb" },
    { icon: "trend", label: "New · 7 days", value: new7d.toLocaleString(), bg: "#e7f6ec", fg: "#16a34a" },
  ];

  const tabHref = (st: string, rg: string) => {
    const sp = new URLSearchParams();
    if (st) sp.set("status", st);
    if (rg) sp.set("range", rg);
    const qs = sp.toString();
    return `/admin/abandoned${qs ? `?${qs}` : ""}`;
  };

  return (
    <div>
      <AutoRefresh seconds={15} />
      <h1 className="text-2xl font-bold mb-1">Abandoned carts (leads)</h1>
      <p className="text-sm dc-muted mb-4">People who partly filled the order form but didn&apos;t submit — call and follow up to recover the sale.</p>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 mb-4">
        {cards.map((c) => (
          <div key={c.label} className="dc-card p-3 flex items-center gap-3">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg shrink-0" style={{ background: c.bg, color: c.fg }}>
              <Icon name={c.icon} className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="text-[17px] font-extrabold leading-tight truncate">{c.value}</p>
              <p className="text-[11px] dc-muted truncate">{c.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filters: status + time */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-4">
        <div className="flex items-center gap-1.5">
          {STATUS_TABS.map((t) => (
            <a key={t.value} href={tabHref(t.value, range)}
              className={"rounded-full border px-3.5 py-1.5 text-[13px] font-medium transition " + (status === t.value ? "dc-pill-active" : "dc-pill")}>
              {t.label}
            </a>
          ))}
        </div>
        <span className="hidden sm:block h-5 w-px" style={{ background: "var(--a-border)" }} />
        <div className="flex items-center gap-1.5">
          {RANGE_TABS.map((t) => (
            <a key={t.value} href={tabHref(status, t.value)}
              className={"rounded-full border px-3 py-1.5 text-[12.5px] font-medium transition " + (range === t.value ? "dc-pill-active" : "dc-pill")}>
              {t.label}
            </a>
          ))}
        </div>
      </div>

      <p className="text-xs dc-muted mb-3">{rows.length} lead{rows.length === 1 ? "" : "s"}</p>

      <div className="space-y-2.5">
        {rows.map((l: any) => {
          const img = l.products?.images?.[0] || null;
          const wa = waLink(l.customer_phone);
          return (
            <div key={l.id} className="dc-card p-3.5">
              <div className="flex items-start gap-3">
                <div className="relative h-14 w-14 shrink-0 rounded-lg overflow-hidden" style={{ background: "var(--a-surface-2)", boxShadow: "inset 0 0 0 1px var(--a-border)" }}>
                  {img ? (
                    <Image src={img} alt={l.product_name || ""} fill sizes="56px" className="object-cover" />
                  ) : (
                    <span className="flex h-full w-full items-center justify-center text-[10px] text-center px-1" style={{ color: "var(--a-faint)" }}>{l.product_name?.slice(0, 12) || "—"}</span>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-semibold flex items-center gap-2">
                        {l.customer_name || <span className="dc-muted">No name</span>}
                        {l.status === "converted" && <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full" style={{ background: "#e7f6ec", color: "#16a34a" }}>Converted</span>}
                      </p>
                      <p className="text-[12.5px] dc-muted">
                        {l.customer_phone || "No phone"}{l.product_name ? ` · ${l.product_name} × ${l.quantity}` : ""}
                      </p>
                      {l.address_line && <p className="text-[11.5px] truncate" style={{ color: "var(--a-faint)" }}>{l.address_line}</p>}
                      <p className="text-[11px] mt-0.5" style={{ color: "var(--a-faint)" }}>🕒 {timeAgo(l.updated_at)} · {bdDateTime(l.updated_at)}</p>
                    </div>
                    <div className="text-right shrink-0">
                      {l.value > 0 && <p className="font-bold">{taka(Number(l.value))}</p>}
                      {l.order_number && <a href="/admin/orders" className="text-xs hover:underline" style={{ color: "var(--a-brand)" }}>{l.order_number}</a>}
                    </div>
                  </div>

                  <div className="mt-3 pt-3 flex flex-wrap items-center justify-between gap-2" style={{ borderTop: "1px solid var(--a-border)" }}>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {l.customer_phone && <a href={`tel:${l.customer_phone}`} className="dc-btn dc-btn-solid" style={{ background: "var(--a-brand)", borderColor: "var(--a-brand)" }}><Icon name="phone" className="h-3.5 w-3.5" /> Call</a>}
                      {wa && <a href={wa} target="_blank" rel="noopener" className="dc-btn" style={{ color: "#16a34a", borderColor: "#bfe6cd" }}><Icon name="chat" className="h-3.5 w-3.5" /> WhatsApp</a>}
                      {l.status !== "converted" && (
                        <ManualOrderModal
                          products={pickProducts}
                          aiReady={aiReady}
                          leadId={l.lead_id}
                          triggerLabel="🛒 Create order"
                          triggerClassName="dc-btn dc-btn-solid"
                          initial={{
                            name: l.customer_name || "",
                            phone: l.customer_phone || "",
                            address: l.address_line || "",
                            area: l.area || "",
                            productId: l.product_id || undefined,
                            amount: l.value ? Number(l.value) : undefined,
                          }}
                        />
                      )}
                    </div>
                    <AbandonedActions id={l.id} status={l.status} />
                  </div>
                </div>
              </div>
            </div>
          );
        })}
        {rows.length === 0 && <p className="text-center dc-muted py-10">No leads found.</p>}
      </div>
    </div>
  );
}
