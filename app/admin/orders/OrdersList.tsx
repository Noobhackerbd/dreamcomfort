"use client";

import Image from "next/image";
import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { taka, bdDateTime } from "@/lib/format";
import { Icon } from "@/components/admin/icons";
import { CarryBeeActions } from "./CarryBeeActions";
import { CourierRatioChip } from "./CourierRatio";
import { OrderEditModal } from "./OrderEditModal";
import { bulkTrashOrders, bulkRestoreOrders, bulkPurgeOrders, logCallAttempt, resetCallAttempts, refreshCarryBeeStatus, updateOrderStatus } from "./actions";

// Soft pastel status pills (matches the storefront's gentle palette).
const STATUS_META: Record<string, { label: string; icon: string; bg: string; fg: string }> = {
  pending: { label: "Pending", icon: "clock", bg: "#fef3e2", fg: "#b45309" },
  confirmed: { label: "Confirmed", icon: "check", bg: "#e8eefc", fg: "#2563eb" },
  processing: { label: "Processing", icon: "refresh", bg: "#f0e9fc", fg: "#7c3aed" },
  shipped: { label: "Shipped", icon: "truck", bg: "#e2f3f7", fg: "#0e7490" },
  delivered: { label: "Delivered", icon: "check", bg: "#e7f6ec", fg: "#16a34a" },
  cancelled: { label: "Cancelled", icon: "close", bg: "#fdeaea", fg: "#dc2626" },
  returned: { label: "Returned", icon: "refresh", bg: "#fdeede", fg: "#ea580c" },
};
const STATUS_ORDER = ["pending", "confirmed", "processing", "shipped", "delivered", "cancelled", "returned"];

function StatusPill({ id, value, compact }: { id: string; value: string; compact?: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState(value);
  const [pending, start] = useTransition();
  const meta = STATUS_META[current] ?? { label: current, icon: "clock", bg: "var(--a-surface-2)", fg: "var(--a-text)" };

  function pick(next: string) {
    setCurrent(next);
    setOpen(false);
    start(async () => { await updateOrderStatus(id, next); router.refresh(); });
  }

  return (
    <div className="relative inline-flex">
      {compact ? (
        <button onClick={() => setOpen((o) => !o)} disabled={pending} className="inline-flex items-center gap-1 text-[11px] font-bold disabled:opacity-60" style={{ color: meta.fg }}>
          <Icon name={meta.icon} className={"h-3 w-3 " + (pending ? "animate-spin" : "")} />
          {meta.label}
          <Icon name="chevronDown" className="h-3 w-3 opacity-60" />
        </button>
      ) : (
        <button onClick={() => setOpen((o) => !o)} disabled={pending} className="dc-softpill disabled:opacity-60" style={{ background: meta.bg, color: meta.fg }}>
          <Icon name={meta.icon} className={"h-3.5 w-3.5 " + (pending ? "animate-spin" : "")} />
          {meta.label}
          <Icon name="chevronDown" className="h-3 w-3 opacity-70" />
        </button>
      )}
      {open && (
        <>
          <div className="fixed inset-0 z-20" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-9 z-30 w-44 dc-card p-1" style={{ boxShadow: "var(--a-shadow-lg)" }}>
            {STATUS_ORDER.map((s) => {
              const m = STATUS_META[s];
              const on = s === current;
              return (
                <button key={s} onClick={() => pick(s)} className="w-full flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-sm hover:bg-[var(--a-surface-2)]">
                  <span className="h-2 w-2 rounded-full shrink-0" style={{ background: m.fg }} />
                  <span className={on ? "font-semibold" : ""}>{m.label}</span>
                  {on && <Icon name="check" className="h-3.5 w-3.5 ml-auto opacity-60" />}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

export interface OrderRow {
  id: string;
  order_number: string;
  customer_name: string;
  customer_phone: string;
  address_line: string;
  area: string;
  city: string;
  district: string;
  courier: string;
  tracking_id: string;
  total: number;
  status: string;
  created_at: string;
  notes?: string;
  call_attempts?: number;
  is_booked?: boolean;
  booked_date?: string | null;
  items: { product_name: string; quantity: number; image?: string | null }[];
  courierRatio?: import("@/lib/bdcourier").CourierRatio | null;
  courierCheckedAt?: number | null;
}

const CALL_LIMIT = 3;
const LAST_CALLED_KEY = "dc:lastCalledOrderId";

function CallButton({ id, phone, attempts, onCalled }: { id: string; phone: string; attempts: number; onCalled: (id: string) => void }) {
  const router = useRouter();
  const [n, setN] = useState(attempts ?? 0);
  const [busy, setBusy] = useState(false);

  async function onClick() {
    if (busy) return;
    setBusy(true);
    onCalled(id);
    const res = await logCallAttempt(id);
    setBusy(false);
    if ((res as any)?.needsMigration) {
      alert("To enable call attempts, add the call_attempts column to the orders table (DB migration).");
    } else if (res.ok && typeof res.count === "number") {
      setN(res.count);
    }
    try { window.location.href = telLink(phone); } catch {}
    setTimeout(() => router.refresh(), 400);
  }

  const reached = n >= CALL_LIMIT;
  return (
    <button
      onClick={onClick}
      disabled={busy}
      className="dc-act dc-act-sm"
      style={reached ? { color: "#c23636" } : undefined}
      title={`Call${n > 0 ? ` — ${n}/${CALL_LIMIT} attempts` : ""}`}
    >
      <Icon name="phone" className="h-4 w-4" />
      {n > 0 && (
        <span className="absolute -top-0.5 -right-0.5 min-w-[14px] h-[14px] px-1 rounded-full text-[9px] font-bold flex items-center justify-center text-white" style={{ background: reached ? "#dc2626" : "var(--a-brand)" }}>{n}</span>
      )}
    </button>
  );
}

function ResetAttemptButton({ id }: { id: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  async function onClick() {
    if (busy) return;
    setBusy(true);
    await resetCallAttempts(id);
    setBusy(false);
    router.refresh();
  }
  return (
    <button onClick={onClick} disabled={busy} className="dc-act dc-act-sm" title="Reset call attempts">
      <Icon name="refresh" className="h-4 w-4" />
    </button>
  );
}

// ---- CarryBee: auto status (cached + hourly re-check) ----
const CB_REFRESH_MS = 60 * 60 * 1000;
const cbCacheKey = (t: string) => `dc:cbstatus:${t}`;
function readCbCache(t: string): { status: string; ts: number } | null {
  try { const raw = localStorage.getItem(cbCacheKey(t)); if (raw) { const o = JSON.parse(raw); if (o && typeof o.status === "string" && typeof o.ts === "number") return o; } } catch {}
  return null;
}
function writeCbCache(t: string, status: string, ts: number) {
  try { localStorage.setItem(cbCacheKey(t), JSON.stringify({ status, ts })); } catch {}
}
function agoLabel(ts: number): string {
  const m = Math.max(0, Math.round((Date.now() - ts) / 60000));
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  return `${Math.round(m / 60)}h ago`;
}

function CarryBeeStatusChip({ orderId, tracking }: { orderId: string; tracking: string }) {
  const [status, setStatus] = useState<string | null>(null);
  const [checkedAt, setCheckedAt] = useState<number | null>(null);
  const [busy, setBusy] = useState(true);
  const [err, setErr] = useState(false);

  async function load(force?: boolean) {
    if (!force) {
      const c = readCbCache(tracking);
      if (c && Date.now() - c.ts < CB_REFRESH_MS) { setStatus(c.status); setCheckedAt(c.ts); setErr(false); setBusy(false); return; }
      if (c) { setStatus(c.status); setCheckedAt(c.ts); }
    }
    setBusy(true); setErr(false);
    try {
      const res = await refreshCarryBeeStatus(tracking);
      if ((res as any)?.ok) { const s = (res as any).status ?? "—"; const now = Date.now(); setStatus(s); setCheckedAt(now); writeCbCache(tracking, s, now); }
      else setErr(!readCbCache(tracking));
    } catch { setErr(!readCbCache(tracking)); }
    setBusy(false);
  }

  useEffect(() => {
    load();
    const iv = setInterval(() => load(true), CB_REFRESH_MS);
    return () => clearInterval(iv);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tracking]);

  return (
    <span className="inline-flex items-center gap-1">
      <button
        onClick={() => load(true)}
        disabled={busy}
        className="inline-flex items-center gap-1 text-[11px] font-semibold px-1.5"
        title={`CarryBee${checkedAt ? ` · checked ${agoLabel(checkedAt)}` : ""} · click to refresh`}
        style={{ color: "#1f7a4d" }}
      >
        <Icon name="truck" className={"h-3.5 w-3.5 " + (busy ? "animate-spin" : "")} />
        <span className="truncate max-w-[120px]">{status ? status : busy ? "Loading…" : err ? "No status" : "—"}</span>
        {checkedAt && <span style={{ opacity: 0.55, fontWeight: 500 }}>· {agoLabel(checkedAt)}</span>}
      </button>
      <a href={`/admin/orders/${orderId}/label`} target="_blank" rel="noopener" className="dc-act dc-act-sm" title="Print sticker / label">
        <Icon name="print" className="h-4 w-4" />
      </a>
    </span>
  );
}

function CarryBeeSendToggle({ cbReady, order }: { cbReady: boolean; order: OrderRow }) {
  const [open, setOpen] = useState(false);
  return (
    <span className="relative inline-flex">
      <button type="button" onClick={() => setOpen((v) => !v)} className="dc-act dc-act-sm" title="Send to CarryBee">
        <Icon name="truck" className="h-4 w-4" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-10 z-40 w-56 dc-card p-2" style={{ boxShadow: "var(--a-shadow-lg)" }}>
          <CarryBeeActions
            configured={cbReady}
            compact
            order={{
              id: order.id, orderNumber: order.order_number, name: order.customer_name, phone: order.customer_phone,
              address: [order.address_line, order.area, order.city, order.district].filter(Boolean).join(", "),
              total: Number(order.total),
              quantity: (order.items ?? []).reduce((n, it) => n + Number(it.quantity || 0), 0) || 1,
              description: (order.items ?? []).map((it) => `${it.product_name} x${it.quantity}`).join(", "),
              courier: order.courier ?? "", trackingId: order.tracking_id ?? "",
            }}
          />
          </div>
        </>
      )}
    </span>
  );
}

function CarryBeeCell({ cbReady, order }: { cbReady: boolean; order: OrderRow }) {
  const sent = order.courier === "CarryBee" && !!order.tracking_id;
  return sent ? <CarryBeeStatusChip orderId={order.id} tracking={order.tracking_id} /> : <CarryBeeSendToggle cbReady={cbReady} order={order} />;
}

export function OrdersList({ orders, cbReady, bdcReady, isTrash }: { orders: OrderRow[]; cbReady: boolean; bdcReady?: boolean; isTrash?: boolean }) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirmMode, setConfirmMode] = useState<null | "trash" | "purge">(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [editId, setEditId] = useState<string | null>(null);
  const [lastCalledId, setLastCalledId] = useState<string | null>(null);

  useEffect(() => { try { setLastCalledId(localStorage.getItem(LAST_CALLED_KEY)); } catch {} }, []);
  function markCalled(id: string) {
    setLastCalledId(id);
    try { localStorage.setItem(LAST_CALLED_KEY, id); } catch {}
  }

  const allSelected = orders.length > 0 && selected.size === orders.length;
  const someSelected = selected.size > 0;

  function toggle(id: string) {
    setSelected((prev) => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; });
  }
  function toggleAll() { setSelected(allSelected ? new Set() : new Set(orders.map((o) => o.id))); }
  const ids = () => Array.from(selected);

  async function doTrash() {
    setBusy(true); setErr(null);
    const res = await bulkTrashOrders(ids());
    setBusy(false);
    if (!res.ok) return setErr(res.error ?? "Failed.");
    setConfirmMode(null); setSelected(new Set()); router.refresh();
  }
  async function doRestore() {
    setBusy(true); setErr(null);
    const res = await bulkRestoreOrders(ids());
    setBusy(false);
    if (!res.ok) return setErr(res.error ?? "Failed.");
    setSelected(new Set()); router.refresh();
  }
  async function doPurge() {
    if (!code.trim()) return setErr("Enter the delete code.");
    setBusy(true); setErr(null);
    const res = await bulkPurgeOrders(ids(), code.trim());
    setBusy(false);
    if (!res.ok) return setErr(res.error ?? "Delete failed.");
    setConfirmMode(null); setCode(""); setSelected(new Set()); router.refresh();
  }

  const selectedCount = selected.size;
  const selectedTotal = useMemo(
    () => orders.filter((o) => selected.has(o.id)).reduce((n, o) => n + Number(o.total || 0), 0),
    [orders, selected]
  );

  if (orders.length === 0) {
    return <p className="text-center dc-muted py-12">{isTrash ? "Trash is empty." : "No orders."}</p>;
  }

  return (
    <div>
      {/* Select-all + bulk toolbar */}
      <div className="flex items-center justify-between gap-3 mb-3 dc-card px-4 py-2.5">
        <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
          <input type="checkbox" checked={allSelected} onChange={toggleAll} className="h-4 w-4 accent-gray-900" />
          Select all
          {someSelected && <span className="dc-muted">({selectedCount} selected)</span>}
        </label>
        {someSelected && (
          isTrash ? (
            <div className="flex items-center gap-2">
              <button onClick={doRestore} disabled={busy} className="dc-btn disabled:opacity-60"><Icon name="refresh" className="h-3.5 w-3.5" /> Restore</button>
              <button onClick={() => { setErr(null); setCode(""); setConfirmMode("purge"); }} className="dc-btn" style={{ color: "#b91c1c", borderColor: "#f0c9c9" }}>Delete permanently</button>
            </div>
          ) : (
            <button onClick={() => { setErr(null); setConfirmMode("trash"); }} className="dc-btn" style={{ color: "#b91c1c", borderColor: "#f0c9c9" }}>Move {selectedCount} to trash</button>
          )
        )}
      </div>

      <div className="space-y-2">
        {orders.map((o) => {
          const on = selected.has(o.id);
          const lastCalled = !on && o.id === lastCalledId;
          const sMeta = STATUS_META[o.status] ?? { fg: "var(--a-faint)" };
          const stripColor = lastCalled ? "#e0a52e" : (sMeta.fg as string);
          return (
            <div
              key={o.id}
              className={"dc-card relative transition " + (isTrash ? "opacity-90 " : "")}
              style={{
                paddingLeft: 13, paddingRight: 10, paddingTop: 8, paddingBottom: 8,
                background: lastCalled && !on ? "#fffdf6" : undefined,
                boxShadow: [
                  `inset 3px 0 0 ${stripColor}`,
                  "0 1px 2px rgba(17,24,39,.04)",
                  on ? "0 0 0 2px rgba(17,24,39,.16)" : "",
                ].filter(Boolean).join(", "),
              }}
            >
              <div className="flex items-start gap-2">
                <input type="checkbox" checked={on} onChange={() => toggle(o.id)} className="mt-0.5 h-4 w-4 accent-gray-900 shrink-0" aria-label={`Select ${o.order_number}`} />
                <OrderThumb items={o.items} />
                <div className="flex-1 min-w-0">
                  {/* Row 1: order no + status + time + price */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-x-1.5 gap-y-0.5 flex-wrap min-w-0">
                      <button onClick={() => setEditId(o.id)} className="text-[13px] font-bold hover:underline">{o.order_number}</button>
                      {!isTrash && <StatusPill id={o.id} value={o.status} compact />}
                      <span className="text-[10px] font-medium whitespace-nowrap" style={{ color: "var(--a-faint)" }}>· {bdDateTime(o.created_at)}</span>
                      {lastCalled && <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full" style={{ background: "#fbf1dd", color: "#a5710f" }}>Last call</span>}
                      {o.is_booked && <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full" style={{ background: "var(--a-warn-soft)", color: "var(--a-warn)" }}>Booked</span>}
                    </div>
                    <p className="font-bold text-[14px] whitespace-nowrap shrink-0">{taka(Number(o.total))}</p>
                  </div>

                  {/* Row 2: name + phone on one line */}
                  <div className="text-[12.5px] mt-0.5 truncate">
                    <span className="font-semibold">{o.customer_name}</span>
                    {o.customer_phone && <a href={telLink(o.customer_phone)} className="ml-1.5 font-semibold tabular-nums" style={{ color: "var(--a-brand)" }}>{toLocalDisplay(o.customer_phone)}</a>}
                  </div>

                  {/* Row 3: address · items on one line */}
                  <p className="text-[11.5px] truncate" style={{ color: "var(--a-faint)" }}>
                    {[o.address_line, (o.items ?? []).map((it) => `${it.product_name} ×${it.quantity}`).join(", ")].filter(Boolean).join(" · ")}
                  </p>
                  {o.notes && o.notes.trim() && (
                    <p className="mt-1 text-[11px] rounded px-1.5 py-0.5 inline-block truncate max-w-full" style={{ color: "#9a6a12", background: "#fdf6e6" }}>{o.notes}</p>
                  )}

                  {/* Courier success rate (BD Courier fraud check) */}
                  {!isTrash && bdcReady && o.customer_phone && (
                    <div className="mt-1">
                      <CourierRatioChip phone={o.customer_phone} enabled={bdcReady} data={o.courierRatio ?? null} checkedAt={o.courierCheckedAt ?? null} />
                    </div>
                  )}

                  {/* Action row — compact icons */}
                  {!isTrash && (
                    <div className="mt-1.5 flex items-center gap-0.5 flex-wrap">
                      {o.customer_phone && <CallButton id={o.id} phone={o.customer_phone} attempts={o.call_attempts ?? 0} onCalled={markCalled} />}
                      {o.customer_phone && (o.call_attempts ?? 0) > 0 && <ResetAttemptButton id={o.id} />}
                      {o.customer_phone && (
                        <a href={waLink(o.customer_phone)} target="_blank" rel="noopener" className="dc-act dc-act-sm" title="WhatsApp">
                          <Icon name="chat" className="h-4 w-4" />
                        </a>
                      )}
                      <CarryBeeCell cbReady={cbReady} order={o} />
                      <button onClick={() => setEditId(o.id)} className="dc-act dc-act-sm ml-auto" title="Edit order"><Icon name="edit" className="h-4 w-4" /></button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Order edit popup */}
      <OrderEditModal orderId={editId} cbReady={cbReady} onClose={() => setEditId(null)} />

      {/* Sticky bulk-action bar */}
      {someSelected && (
        <div className="fixed bottom-4 inset-x-3 z-40 mx-auto max-w-md rounded-2xl text-white shadow-2xl px-4 py-3 flex items-center justify-between gap-3" style={{ background: "var(--a-text)" }}>
          <span className="text-sm">{selectedCount} · {taka(selectedTotal)}</span>
          <div className="flex items-center gap-2">
            <button onClick={() => setSelected(new Set())} className="rounded-lg bg-white/15 px-3 py-1.5 text-sm">Cancel</button>
            {isTrash ? (
              <>
                <button onClick={doRestore} disabled={busy} className="rounded-lg bg-green-600 px-3 py-1.5 text-sm font-medium">Restore</button>
                <button onClick={() => { setErr(null); setCode(""); setConfirmMode("purge"); }} className="rounded-lg bg-red-600 px-3 py-1.5 text-sm font-medium">Delete</button>
              </>
            ) : (
              <button onClick={() => { setErr(null); setConfirmMode("trash"); }} className="rounded-lg bg-red-600 px-3 py-1.5 text-sm font-medium">Trash</button>
            )}
          </div>
        </div>
      )}

      {/* Trash confirm */}
      {confirmMode === "trash" && (
        <div className="fixed inset-0 z-[90] bg-black/50 flex items-center justify-center p-4" onClick={() => !busy && setConfirmMode(null)}>
          <div className="dc-card w-full max-w-sm p-5" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-bold text-lg mb-1">Move {selectedCount} orders to trash?</h3>
            <p className="text-sm dc-muted mb-4">They move to Trash — you can <b>restore</b> them later or delete permanently.</p>
            {err && <p className="text-sm text-red-600 mb-3">{err}</p>}
            <div className="flex justify-end gap-2">
              <button onClick={() => setConfirmMode(null)} disabled={busy} className="dc-btn">Cancel</button>
              <button onClick={doTrash} disabled={busy} className="dc-btn-solid dc-btn disabled:opacity-60">{busy ? "…" : "Yes, move to trash"}</button>
            </div>
          </div>
        </div>
      )}

      {/* Purge confirm */}
      {confirmMode === "purge" && (
        <div className="fixed inset-0 z-[90] bg-black/50 flex items-center justify-center p-4" onClick={() => !busy && setConfirmMode(null)}>
          <div className="dc-card w-full max-w-sm p-5" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-bold text-lg mb-1">Delete {selectedCount} orders permanently?</h3>
            <p className="text-sm dc-muted mb-3">This cannot be undone. Enter the security code to confirm.</p>
            <label className="block text-xs font-medium mb-1">Security code</label>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              onKeyDown={(e) => { if (e.key === "Enter" && !busy) doPurge(); }}
              inputMode="numeric" autoFocus placeholder="Enter code"
              className="dc-input tracking-widest mb-3"
            />
            {err && <p className="text-sm text-red-600 mb-3">{err}</p>}
            <div className="flex justify-end gap-2">
              <button onClick={() => setConfirmMode(null)} disabled={busy} className="dc-btn">Cancel</button>
              <button onClick={doPurge} disabled={busy || !code.trim()} className="dc-btn disabled:opacity-60" style={{ background: "#dc2626", borderColor: "#dc2626", color: "#fff" }}>{busy ? "Deleting…" : "Delete permanently"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/** Normalize a stored BD phone to international digits (8801XXXXXXXXX). */
function bdIntl(phone: string): string {
  let n = (phone || "").replace(/\D/g, "");
  if (n.startsWith("00")) n = n.slice(2);
  if (n.startsWith("0")) n = "88" + n;
  else if (n.startsWith("1")) n = "880" + n;
  else if (!n.startsWith("880")) n = "880" + n;
  return n;
}
function toLocalDisplay(phone: string): string {
  const n = bdIntl(phone);
  if (n.startsWith("880") && n.length === 13) return "0" + n.slice(3);
  return (phone || "").trim();
}
function telLink(phone: string): string { return "tel:+" + bdIntl(phone); }
function waLink(phone: string): string { return "https://wa.me/" + bdIntl(phone); }

function OrderThumb({ items }: { items: OrderRow["items"] }) {
  const first = items?.[0];
  const img = first?.image || null;
  const extra = Math.max(0, (items?.length || 0) - 1);
  return (
    <div className="relative h-9 w-9 shrink-0 rounded-lg overflow-hidden" style={{ background: "var(--a-surface-2)", boxShadow: "inset 0 0 0 1px var(--a-border)" }}>
      {img ? (
        <Image src={img} alt={first?.product_name || ""} fill sizes="40px" className="object-cover" />
      ) : (
        <span className="flex h-full w-full items-center justify-center text-[10px] text-center px-1" style={{ color: "var(--a-faint)" }}>
          {first?.product_name?.slice(0, 10) || "—"}
        </span>
      )}
      {extra > 0 && <span className="absolute bottom-0 right-0 rounded-tl-md bg-black/65 text-white text-[10px] px-1 leading-4">+{extra}</span>}
    </div>
  );
}
