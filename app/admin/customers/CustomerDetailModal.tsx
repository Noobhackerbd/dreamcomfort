"use client";

import { useEffect, useState } from "react";
import { taka, bdDate } from "@/lib/format";
import { Icon } from "@/components/admin/icons";
import { CourierRatioChip } from "../orders/CourierRatio";
import { getCustomerOrders, type CustomerOrderRow } from "./actions";
import { ownRate, rateBand, type CustomerRow } from "./CustomersList";

const STATUS_COLOR: Record<string, string> = {
  pending: "#b45309", confirmed: "#2563eb", processing: "#7c3aed", shipped: "#0e7490",
  delivered: "#16a34a", cancelled: "#dc2626", returned: "#ea580c",
};
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

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
const telLink = (p: string) => "tel:+" + bdIntl(p);
const waLink = (p: string) => "https://wa.me/" + bdIntl(p);

export function CustomerDetailModal({
  customer, bdcReady, onClose,
}: {
  customer: CustomerRow | null; bdcReady: boolean; onClose: () => void;
}) {
  const [orders, setOrders] = useState<CustomerOrderRow[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!customer) { setOrders(null); setErr(null); return; }
    let alive = true;
    setBusy(true); setErr(null); setOrders(null);
    getCustomerOrders(customer.phone).then((res) => {
      if (!alive) return;
      if (res.ok) setOrders(res.orders);
      else setErr(res.error);
      setBusy(false);
    });
    return () => { alive = false; };
  }, [customer]);

  if (!customer) return null;

  const r = ownRate(customer);
  const b = r != null ? rateBand(r) : null;
  const resolved = customer.delivered + customer.cancelled;

  return (
    <div className="fixed inset-0 z-[80] bg-black/50 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <div
        className="dc-card w-full sm:max-w-lg max-h-[90vh] overflow-y-auto rounded-b-none sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-start justify-between gap-3 px-5 pt-5 pb-3" style={{ background: "var(--a-surface)", borderBottom: "1px solid var(--a-border)" }}>
          <div className="min-w-0">
            <h3 className="text-lg font-bold truncate">{customer.name || "Unknown"}</h3>
            {customer.phone && (
              <a href={telLink(customer.phone)} className="text-[13px] font-semibold tabular-nums" style={{ color: "var(--a-brand)" }}>
                {toLocalDisplay(customer.phone)}
              </a>
            )}
            {customer.email && <p className="text-xs dc-muted truncate">{customer.email}</p>}
          </div>
          <button onClick={onClose} className="dc-act dc-act-sm shrink-0" title="Close"><Icon name="close" className="h-4 w-4" /></button>
        </div>

        <div className="p-5 pt-4 space-y-4">
          {/* Quick actions */}
          <div className="flex gap-2">
            {customer.phone && <a href={telLink(customer.phone)} className="dc-btn dc-btn-solid flex-1 justify-center" style={{ background: "var(--a-brand)", borderColor: "var(--a-brand)" }}><Icon name="phone" className="h-4 w-4" /> Call</a>}
            {customer.phone && <a href={waLink(customer.phone)} target="_blank" rel="noopener" className="dc-btn flex-1 justify-center"><Icon name="chat" className="h-4 w-4" /> WhatsApp</a>}
          </div>

          {/* Stat tiles */}
          <div className="grid grid-cols-3 gap-2">
            <div className="dc-card p-2.5 text-center">
              <p className="text-[17px] font-extrabold leading-tight">{customer.totalOrders}</p>
              <p className="text-[10.5px] dc-muted">Orders</p>
            </div>
            <div className="dc-card p-2.5 text-center">
              <p className="text-[17px] font-extrabold leading-tight">{taka(customer.totalSpent)}</p>
              <p className="text-[10.5px] dc-muted">Spent</p>
            </div>
            <div className="dc-card p-2.5 text-center">
              <p className="text-[17px] font-extrabold leading-tight" style={{ color: b?.fg }}>{r != null ? `${r}%` : "—"}</p>
              <p className="text-[10.5px] dc-muted">Success</p>
            </div>
          </div>

          {/* Own delivery outcome */}
          <div className="dc-card p-3">
            <p className="text-[12px] font-semibold mb-2">Your delivery outcome</p>
            {resolved > 0 ? (
              <>
                <div className="h-2 rounded-full overflow-hidden mb-1.5" style={{ background: "#fdeaea" }}>
                  <div className="h-full rounded-full" style={{ width: `${r}%`, background: b?.fg }} />
                </div>
                <p className="text-[11.5px] dc-muted">
                  Delivered <b style={{ color: "#16a34a" }}>{customer.delivered}</b> · Cancelled/returned <b style={{ color: "#dc2626" }}>{customer.cancelled}</b> · In progress <b>{Math.max(0, customer.storeOrders - resolved)}</b>
                </p>
              </>
            ) : (
              <p className="text-[11.5px] dc-muted">No delivered/cancelled orders yet ({customer.storeOrders} in progress).</p>
            )}
          </div>

          {/* Courier success rate (BD Courier) */}
          {bdcReady && customer.phone && (
            <div className="dc-card p-3">
              <p className="text-[12px] font-semibold mb-2">Courier success rate (all couriers)</p>
              <CourierRatioChip phone={customer.phone} enabled={bdcReady} />
            </div>
          )}

          {/* Order history */}
          <div>
            <p className="text-[12px] font-semibold mb-2">Order history</p>
            {busy && <p className="text-sm dc-muted py-4 text-center">Loading…</p>}
            {err && <p className="text-sm py-3" style={{ color: "#dc2626" }}>{err}</p>}
            {orders && orders.length === 0 && <p className="text-sm dc-muted py-4 text-center">No orders found for this number.</p>}
            {orders && orders.length > 0 && (
              <div className="space-y-1.5">
                {orders.map((o) => (
                  <a
                    key={o.id}
                    href={`/admin/orders?q=${encodeURIComponent(o.order_number)}`}
                    className="flex items-center gap-2 rounded-xl px-3 py-2 hover:bg-[var(--a-surface-2)]"
                    style={{ border: "1px solid var(--a-border)" }}
                  >
                    <span className="font-bold text-[13px]">{o.order_number}</span>
                    <span className="text-[11px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: (STATUS_COLOR[o.status] ?? "#888") + "1a", color: STATUS_COLOR[o.status] ?? "var(--a-muted)" }}>
                      {cap(o.status)}
                    </span>
                    {o.is_booked && <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full" style={{ background: "var(--a-warn-soft)", color: "var(--a-warn)" }}>Booked</span>}
                    <span className="text-[11px] ml-auto" style={{ color: "var(--a-faint)" }}>{bdDate(o.created_at)}</span>
                    <span className="font-bold text-[13px] tabular-nums">{taka(o.total)}</span>
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
