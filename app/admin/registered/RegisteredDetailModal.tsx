"use client";

import { useEffect, useState } from "react";
import { taka, bdDate, bdDateTime } from "@/lib/format";
import type { RegisteredRow } from "./RegisteredList";
import { getRegisteredDetail, saveCustomerAdminMeta, type RegOrder, type RegAddress, type RegWishItem } from "./actions";
import { updateOrderStatus } from "@/app/admin/orders/actions";

const STATUSES = ["pending", "confirmed", "processing", "shipped", "delivered", "cancelled", "returned"];
const STATUS_COLOR: Record<string, string> = {
  pending: "#b45309", confirmed: "#2563eb", processing: "#7c3aed", shipped: "#0e7490",
  delivered: "#16a34a", cancelled: "#dc2626", returned: "#ea580c",
};

const METHOD_LABEL: Record<string, string> = { google: "Google", facebook: "Facebook", phone: "Phone OTP", email: "Email / password" };

export function RegisteredDetailModal({
  customer, onClose, waLink, toLocalDisplay,
}: {
  customer: RegisteredRow | null;
  onClose: () => void;
  waLink: (p: string) => string;
  toLocalDisplay: (p: string) => string;
}) {
  const [orders, setOrders] = useState<RegOrder[] | null>(null);
  const [addresses, setAddresses] = useState<RegAddress[]>([]);
  const [wishlist, setWishlist] = useState<RegWishItem[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [notes, setNotes] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [savingMeta, setSavingMeta] = useState(false);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!customer) return;
    setOrders(null); setAddresses([]); setWishlist([]); setErr(null);
    setNotes(customer.adminNotes || ""); setTags(customer.adminTags || []); setTagInput(""); setSavedMsg(null);
    setBusy(true);
    getRegisteredDetail({ id: customer.id, phone: customer.phone })
      .then((res) => {
        if (res.ok) { setOrders(res.orders); setAddresses(res.addresses); setWishlist(res.wishlist); }
        else setErr(res.error);
      })
      .catch(() => setErr("Failed to load."))
      .finally(() => setBusy(false));
  }, [customer]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
    if (customer) { window.addEventListener("keydown", onKey); document.body.style.overflow = "hidden"; }
    return () => { window.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, [customer, onClose]);

  if (!customer) return null;

  function addTag(t: string) {
    const v = t.trim();
    if (v && !tags.includes(v)) setTags((p) => [...p, v]);
    setTagInput("");
  }
  async function saveMeta() {
    setSavingMeta(true); setSavedMsg(null);
    const res = await saveCustomerAdminMeta(customer!.id, notes, tags);
    setSavingMeta(false);
    setSavedMsg(res.ok ? "Saved ✓" : res.error);
  }
  function changeStatus(orderId: string, next: string) {
    setOrders((prev) => prev ? prev.map((o) => (o.id === orderId ? { ...o, status: next } : o)) : prev);
    updateOrderStatus(orderId, next).catch(() => {});
  }

  const resolved = customer.delivered + customer.cancelled;
  const rate = resolved > 0 ? Math.round((customer.delivered / resolved) * 100) : null;

  const stats = [
    { label: "Orders", value: String(customer.orders) },
    { label: "Spent", value: taka(customer.spent) },
    { label: "Success", value: rate != null ? `${rate}%` : "—" },
    { label: "Wishlist", value: String(customer.wishlist) },
  ];

  return (
    <div className="fixed inset-0 z-[120] bg-black/50 backdrop-blur-sm flex items-start sm:items-center justify-center p-0 sm:p-4 overflow-y-auto" onClick={onClose}>
      <div className="dc-card w-full sm:max-w-2xl my-0 sm:my-4 p-0 overflow-hidden" style={{ boxShadow: "var(--a-shadow-lg)" }} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="p-4 sm:p-5 flex items-start gap-3 border-b" style={{ borderColor: "var(--a-border)" }}>
          <span className="h-12 w-12 shrink-0 rounded-full grid place-items-center font-bold text-white" style={{ background: "linear-gradient(135deg,#2F90CC,#1E7AAF)" }}>
            {(customer.name || customer.email || "?").slice(0, 2).toUpperCase()}
          </span>
          <div className="min-w-0 flex-1">
            <h3 className="text-lg font-bold truncate">{customer.name || "গ্রাহক"}</h3>
            <p className="text-xs dc-muted truncate">
              {toLocalDisplay(customer.phone) || "—"}{customer.email ? ` · ${customer.email}` : ""}
            </p>
            <p className="text-[11px] dc-muted mt-0.5">
              {METHOD_LABEL[customer.signupMethod] || customer.signupMethod} · joined {customer.createdAt ? bdDate(customer.createdAt) : "—"}
              {customer.lastSignInAt ? ` · last login ${bdDate(customer.lastSignInAt)}` : ""}
            </p>
          </div>
          <button onClick={onClose} className="shrink-0 h-8 w-8 grid place-items-center rounded-full hover:bg-[var(--a-surface-2)]" aria-label="Close">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5"><path d="M6 6l12 12M18 6L6 18" /></svg>
          </button>
        </div>

        <div className="p-4 sm:p-5 space-y-5 max-h-[70vh] overflow-y-auto">
          {/* Quick actions */}
          <div className="flex flex-wrap gap-2">
            {customer.phone && <a href={`tel:+${customer.phone.replace(/\D/g, "")}`} className="rounded-lg border px-3 py-1.5 text-[13px] font-medium" style={{ borderColor: "var(--a-border)" }}>Call</a>}
            {customer.phone && <a href={waLink(customer.phone)} target="_blank" rel="noopener" className="rounded-lg border px-3 py-1.5 text-[13px] font-medium" style={{ borderColor: "var(--a-border)" }}>WhatsApp</a>}
            {customer.email && <a href={`mailto:${customer.email}`} className="rounded-lg border px-3 py-1.5 text-[13px] font-medium" style={{ borderColor: "var(--a-border)" }}>Email</a>}
          </div>

          {/* Stats */}
          <div className="grid grid-cols-4 gap-2">
            {stats.map((s) => (
              <div key={s.label} className="rounded-lg border p-2.5 text-center" style={{ borderColor: "var(--a-border)" }}>
                <p className="text-[15px] font-extrabold leading-tight tabular-nums">{s.value}</p>
                <p className="text-[10px] dc-muted">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Notes + tags */}
          <div>
            <p className="text-[12px] font-semibold mb-1.5">Private notes & tags</p>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="e.g. VIP, prefers evening delivery…"
              className="w-full rounded-lg border px-3 py-2 text-sm outline-none" style={{ borderColor: "var(--a-border)", background: "var(--a-surface)" }} />
            <div className="flex flex-wrap items-center gap-1.5 mt-2">
              {tags.map((t) => (
                <span key={t} className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full" style={{ background: "var(--a-surface-2)" }}>
                  {t}<button onClick={() => setTags((p) => p.filter((x) => x !== t))} className="opacity-60 hover:opacity-100">×</button>
                </span>
              ))}
              <input value={tagInput} onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTag(tagInput); } }}
                placeholder="+ tag" className="text-[12px] px-2 py-1 rounded-md border w-24 outline-none" style={{ borderColor: "var(--a-border)", background: "var(--a-surface)" }} />
              <button onClick={saveMeta} disabled={savingMeta} className="ml-auto rounded-lg px-3 py-1.5 text-[13px] font-semibold text-white disabled:opacity-60" style={{ background: "var(--a-brand)" }}>
                {savingMeta ? "…" : "Save"}
              </button>
            </div>
            {savedMsg && <p className="text-[11px] mt-1" style={{ color: savedMsg.startsWith("Saved") ? "#16a34a" : "#dc2626" }}>{savedMsg}</p>}
          </div>

          {/* Orders */}
          <div>
            <p className="text-[12px] font-semibold mb-1.5">Order history</p>
            {busy && !orders ? (
              <p className="text-[12px] dc-muted">Loading…</p>
            ) : err ? (
              <p className="text-[12px]" style={{ color: "#dc2626" }}>{err}</p>
            ) : orders && orders.length ? (
              <div className="space-y-1.5">
                {orders.map((o) => (
                  <div key={o.id} className="flex items-center gap-2 rounded-lg border px-3 py-2" style={{ borderColor: "var(--a-border)" }}>
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-semibold truncate">#{o.order_number}</p>
                      <p className="text-[10.5px] dc-muted">{bdDateTime(o.created_at)}</p>
                    </div>
                    <p className="text-[13px] font-bold tabular-nums shrink-0">{taka(o.total)}</p>
                    <select value={o.status} onChange={(e) => changeStatus(o.id, e.target.value)}
                      className="text-[12px] font-semibold rounded-md border px-1.5 py-1 shrink-0 bg-transparent"
                      style={{ borderColor: "var(--a-border)", color: STATUS_COLOR[o.status] || "var(--a-text)" }}>
                      {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                    <a href={`/admin/orders?q=${o.order_number}`} className="text-[11px] font-semibold shrink-0" style={{ color: "var(--a-brand)" }}>Open</a>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[12px] dc-muted">No orders yet.</p>
            )}
          </div>

          {/* Addresses */}
          {addresses.length > 0 && (
            <div>
              <p className="text-[12px] font-semibold mb-1.5">Saved addresses</p>
              <div className="space-y-1.5">
                {addresses.map((a) => (
                  <div key={a.id} className="rounded-lg border px-3 py-2 text-[12px]" style={{ borderColor: "var(--a-border)" }}>
                    <p className="font-semibold">
                      {a.label || a.name || "Address"}{a.is_default && <span className="ml-1.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: "#e7f6ec", color: "#16a34a" }}>Default</span>}
                    </p>
                    <p className="dc-muted">{[a.address_line, a.area, a.city].filter(Boolean).join(", ")}{a.phone ? ` · ${a.phone}` : ""}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Wishlist */}
          {wishlist.length > 0 && (
            <div>
              <p className="text-[12px] font-semibold mb-1.5">Wishlist ({wishlist.length})</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {wishlist.map((w) => (
                  <a key={w.product_id} href={w.slug ? `/product/${w.slug}` : "#"} target="_blank" rel="noopener"
                    className="flex items-center gap-2 rounded-lg border p-1.5" style={{ borderColor: "var(--a-border)" }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {w.image ? <img src={w.image} alt="" className="h-9 w-9 rounded object-cover shrink-0" /> : <span className="h-9 w-9 rounded bg-[var(--a-surface-2)] shrink-0" />}
                    <span className="min-w-0">
                      <span className="block text-[11px] font-medium truncate">{w.name}</span>
                      <span className="block text-[11px] dc-muted tabular-nums">{taka(w.price)}</span>
                    </span>
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
