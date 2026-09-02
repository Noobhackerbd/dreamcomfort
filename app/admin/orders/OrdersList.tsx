"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { taka, bdDateTime } from "@/lib/format";
import { StatusSelect } from "./StatusSelect";
import { CarryBeeActions } from "./CarryBeeActions";
import { OrderEditModal } from "./OrderEditModal";
import { bulkTrashOrders, bulkRestoreOrders, bulkPurgeOrders, logCallAttempt, resetCallAttempts } from "./actions";

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
}

const CALL_LIMIT = 3;
const LAST_CALLED_KEY = "dc:lastCalledOrderId";

/** Call button that logs an attempt (+1) and dials. Shows the attempt count; at the
 *  limit the order moves to the "📞 কল অ্যাটেম্পট" filter on refresh. */
function CallButton({ id, phone, attempts, onCalled }: { id: string; phone: string; attempts: number; onCalled: (id: string) => void }) {
  const router = useRouter();
  const [n, setN] = useState(attempts ?? 0);
  const [busy, setBusy] = useState(false);

  async function onClick() {
    if (busy) return;
    setBusy(true);
    onCalled(id); // remember this as the last-called order (persists) — instant, before the await
    const res = await logCallAttempt(id);
    setBusy(false);
    if ((res as any)?.needsMigration) {
      alert("কল-অ্যাটেম্পট চালু করতে orders টেবিলে call_attempts কলাম যোগ করুন (Settings/DB migration)।");
    } else if (res.ok && typeof res.count === "number") {
      setN(res.count);
    }
    // Dial after logging.
    try { window.location.href = telLink(phone); } catch {}
    // Refresh so a limit-reached order moves out of pending.
    setTimeout(() => router.refresh(), 400);
  }

  const reached = n >= CALL_LIMIT;
  return (
    <button
      onClick={onClick}
      disabled={busy}
      className={
        "flex-1 sm:flex-none text-center rounded-lg px-3 py-2 text-xs font-medium disabled:opacity-60 " +
        (reached ? "bg-red-600 text-white" : "bg-brand text-white")
      }
      title={`কল অ্যাটেম্পট: ${n}/${CALL_LIMIT}`}
    >
      📞 কল{n > 0 ? ` (${n}/${CALL_LIMIT})` : ""}
    </button>
  );
}

/** Reset the attempt counter (e.g. after reaching the customer). */
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
    <button onClick={onClick} disabled={busy} className="text-center rounded-lg border border-gray-300 text-gray-600 px-3 py-2 text-xs font-medium hover:bg-gray-50 disabled:opacity-60">
      ↺ রিসেট
    </button>
  );
}

/** CarryBee send controls, collapsed behind a toggle so each order row stays compact
 *  (especially on mobile). Reveals the full Send / Direct-Send actions on tap. */
function CarryBeeToggle({ cbReady, order }: { cbReady: boolean; order: OrderRow }) {
  const sent = order.courier === "CarryBee" && !!order.tracking_id;
  const [open, setOpen] = useState(false);
  return (
    <div className="w-full sm:w-56">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={
          "w-full flex items-center justify-between rounded-lg border px-3 py-2 text-xs font-medium " +
          (sent ? "border-green-300 bg-green-50 text-green-700" : "border-gray-300 hover:border-brand text-gray-700")
        }
      >
        <span>{sent ? `🚚 CarryBee ✓ ${order.tracking_id}` : "🚚 CarryBee পাঠান"}</span>
        <span className={"transition-transform " + (open ? "rotate-180" : "")}>▾</span>
      </button>
      {open && (
        <div className="mt-2">
          <CarryBeeActions
            configured={cbReady}
            compact
            order={{
              id: order.id,
              orderNumber: order.order_number,
              name: order.customer_name,
              phone: order.customer_phone,
              address: [order.address_line, order.area, order.city, order.district].filter(Boolean).join(", "),
              total: Number(order.total),
              quantity: (order.items ?? []).reduce((n, it) => n + Number(it.quantity || 0), 0) || 1,
              description: (order.items ?? []).map((it) => `${it.product_name} x${it.quantity}`).join(", "),
              courier: order.courier ?? "",
              trackingId: order.tracking_id ?? "",
            }}
          />
        </div>
      )}
    </div>
  );
}

export function OrdersList({ orders, cbReady, isTrash }: { orders: OrderRow[]; cbReady: boolean; isTrash?: boolean }) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirmMode, setConfirmMode] = useState<null | "trash" | "purge">(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [editId, setEditId] = useState<string | null>(null);
  const [lastCalledId, setLastCalledId] = useState<string | null>(null);

  // Remember the last-called order across refreshes/sessions (per device).
  useEffect(() => {
    try { setLastCalledId(localStorage.getItem(LAST_CALLED_KEY)); } catch {}
  }, []);
  function markCalled(id: string) {
    setLastCalledId(id);
    try { localStorage.setItem(LAST_CALLED_KEY, id); } catch {}
  }

  const allSelected = orders.length > 0 && selected.size === orders.length;
  const someSelected = selected.size > 0;

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }
  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(orders.map((o) => o.id)));
  }

  const ids = () => Array.from(selected);

  async function doTrash() {
    setBusy(true); setErr(null);
    const res = await bulkTrashOrders(ids());
    setBusy(false);
    if (!res.ok) return setErr(res.error ?? "ব্যর্থ হয়েছে।");
    setConfirmMode(null); setSelected(new Set()); router.refresh();
  }
  async function doRestore() {
    setBusy(true); setErr(null);
    const res = await bulkRestoreOrders(ids());
    setBusy(false);
    if (!res.ok) return setErr(res.error ?? "ব্যর্থ হয়েছে।");
    setSelected(new Set()); router.refresh();
  }
  async function doPurge() {
    if (!code.trim()) return setErr("ডিলিট কোড দিন।");
    setBusy(true); setErr(null);
    const res = await bulkPurgeOrders(ids(), code.trim());
    setBusy(false);
    if (!res.ok) return setErr(res.error ?? "ডিলিট ব্যর্থ।");
    setConfirmMode(null); setCode(""); setSelected(new Set()); router.refresh();
  }

  const selectedCount = selected.size;
  const selectedTotal = useMemo(
    () => orders.filter((o) => selected.has(o.id)).reduce((n, o) => n + Number(o.total || 0), 0),
    [orders, selected]
  );

  if (orders.length === 0) {
    return <p className="text-center text-gray-400 py-10">{isTrash ? "ট্রাশ খালি।" : "কোনো অর্ডার নেই।"}</p>;
  }

  return (
    <div>
      {/* Select-all + bulk toolbar */}
      <div className="flex items-center justify-between gap-3 mb-3 rounded-xl border bg-white px-4 py-2.5">
        <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
          <input type="checkbox" checked={allSelected} onChange={toggleAll} className="h-4 w-4 accent-brand" />
          সব নির্বাচন করুন
          {someSelected && <span className="text-gray-400">({selectedCount} নির্বাচিত)</span>}
        </label>
        {someSelected && (
          isTrash ? (
            <div className="flex items-center gap-2">
              <button onClick={doRestore} disabled={busy} className="rounded-lg bg-green-600 text-white px-3 py-1.5 text-sm font-medium hover:bg-green-700 disabled:opacity-60">♻️ রিস্টোর</button>
              <button onClick={() => { setErr(null); setCode(""); setConfirmMode("purge"); }} className="rounded-lg bg-red-600 text-white px-3 py-1.5 text-sm font-medium hover:bg-red-700">❌ স্থায়ী ডিলিট</button>
            </div>
          ) : (
            <button onClick={() => { setErr(null); setConfirmMode("trash"); }} className="rounded-lg bg-red-600 text-white px-4 py-1.5 text-sm font-medium hover:bg-red-700">🗑️ {selectedCount}টি ট্রাশে পাঠান</button>
          )
        )}
      </div>

      <div className="space-y-3">
        {orders.map((o) => {
          const on = selected.has(o.id);
          const lastCalled = !on && o.id === lastCalledId;
          return (
            <div
              key={o.id}
              className={
                "rounded-xl border p-3 sm:p-4 transition " +
                (on
                  ? "ring-2 ring-red-300 border-red-200 bg-white"
                  : lastCalled
                  ? "border-amber-300 bg-amber-50 ring-1 ring-amber-200"
                  : "bg-white") +
                (isTrash ? " opacity-90" : "")
              }
            >
              <div className="flex items-start gap-2.5 sm:gap-3">
                <input
                  type="checkbox"
                  checked={on}
                  onChange={() => toggle(o.id)}
                  className="mt-1 h-4 w-4 accent-brand shrink-0"
                  aria-label={`নির্বাচন ${o.order_number}`}
                />
                <OrderThumb items={o.items} />
                <div className="flex-1 min-w-0">
                  {/* Top: order no + time + price/status */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <button
                          onClick={() => setEditId(o.id)}
                          className="font-bold text-brand hover:underline"
                        >
                          {o.order_number}
                        </button>
                        {lastCalled && (
                          <span className="rounded-full bg-amber-200 text-amber-800 text-[10px] px-2 py-0.5 font-semibold">📞 শেষ কল</span>
                        )}
                        {o.is_booked && (
                          <span className="rounded-full bg-amber-100 text-amber-700 text-[11px] px-2 py-0.5 font-medium">
                            📅 বুকড{o.booked_date ? ` · ${o.booked_date}` : ""}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-gray-400 mt-0.5">🕒 {bdDateTime(o.created_at)}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-bold text-base sm:text-lg whitespace-nowrap">{taka(Number(o.total))}</p>
                    </div>
                  </div>

                  {/* Customer — full name & phone (phone NOT truncated) */}
                  <p className="text-sm mt-1.5 font-medium text-gray-800 break-words">{o.customer_name}</p>
                  {o.customer_phone && (
                    <a href={telLink(o.customer_phone)} className="inline-block text-sm text-brand font-semibold tracking-wide tabular-nums break-all">
                      📱 {toLocalDisplay(o.customer_phone)}
                    </a>
                  )}
                  <p className="text-sm text-gray-500 break-words mt-0.5">{o.address_line}</p>
                  <p className="text-xs text-gray-400 mt-1 break-words">
                    {(o.items ?? []).map((it) => `${it.product_name} ×${it.quantity}`).join("، ")}
                  </p>
                  {o.notes && o.notes.trim() && (
                    <p className="mt-1.5 text-xs rounded-lg bg-amber-50 text-amber-800 border border-amber-100 px-2 py-1 whitespace-pre-wrap break-words">
                      📝 {o.notes}
                    </p>
                  )}

                  {/* Status + edit */}
                  {!isTrash && (
                    <div className="mt-2 flex items-center justify-between gap-2 flex-wrap">
                      <StatusSelect id={o.id} value={o.status} />
                      <button onClick={() => setEditId(o.id)} className="text-xs text-brand hover:underline font-medium">
                        ✏️ এডিট / বিস্তারিত
                      </button>
                    </div>
                  )}

                  {/* Action row: call / whatsapp / carrybee */}
                  {!isTrash && (
                    <div className="mt-3 pt-3 border-t flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                      <div className="flex items-center gap-2">
                        {o.customer_phone && (
                          <CallButton id={o.id} phone={o.customer_phone} attempts={o.call_attempts ?? 0} onCalled={markCalled} />
                        )}
                        {o.customer_phone && (o.call_attempts ?? 0) > 0 && <ResetAttemptButton id={o.id} />}
                        {o.customer_phone && (
                          <a href={waLink(o.customer_phone)} target="_blank" rel="noopener" className="flex-1 sm:flex-none text-center rounded-lg bg-green-600 text-white px-3 py-2 text-xs font-medium">💬 WhatsApp</a>
                        )}
                      </div>
                      <CarryBeeToggle cbReady={cbReady} order={o} />
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Order edit popup (no page navigation) */}
      <OrderEditModal orderId={editId} cbReady={cbReady} onClose={() => setEditId(null)} />

      {/* Sticky bulk-action bar (mobile-friendly) */}
      {someSelected && (
        <div className="fixed bottom-4 inset-x-3 z-40 mx-auto max-w-md rounded-2xl bg-gray-900 text-white shadow-2xl px-4 py-3 flex items-center justify-between gap-3">
          <span className="text-sm">{selectedCount}টি · {taka(selectedTotal)}</span>
          <div className="flex items-center gap-2">
            <button onClick={() => setSelected(new Set())} className="rounded-lg bg-white/15 px-3 py-1.5 text-sm">বাতিল</button>
            {isTrash ? (
              <>
                <button onClick={doRestore} disabled={busy} className="rounded-lg bg-green-600 px-3 py-1.5 text-sm font-medium">♻️ রিস্টোর</button>
                <button onClick={() => { setErr(null); setCode(""); setConfirmMode("purge"); }} className="rounded-lg bg-red-600 px-3 py-1.5 text-sm font-medium">❌ ডিলিট</button>
              </>
            ) : (
              <button onClick={() => { setErr(null); setConfirmMode("trash"); }} className="rounded-lg bg-red-600 px-3 py-1.5 text-sm font-medium">🗑️ ট্রাশে</button>
            )}
          </div>
        </div>
      )}

      {/* Trash confirm (no code — reversible) */}
      {confirmMode === "trash" && (
        <div className="fixed inset-0 z-[90] bg-black/50 flex items-center justify-center p-4" onClick={() => !busy && setConfirmMode(null)}>
          <div className="bg-white rounded-2xl w-full max-w-sm p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-bold text-lg mb-1">{selectedCount}টি অর্ডার ট্রাশে পাঠাবেন?</h3>
            <p className="text-sm text-gray-500 mb-4">এগুলো ট্রাশে চলে যাবে — পরে <b>রিস্টোর</b> করা যাবে বা স্থায়ীভাবে ডিলিট করা যাবে।</p>
            {err && <p className="text-sm text-red-600 mb-3">{err}</p>}
            <div className="flex justify-end gap-2">
              <button onClick={() => setConfirmMode(null)} disabled={busy} className="rounded-lg border px-4 py-2 text-sm">বাতিল</button>
              <button onClick={doTrash} disabled={busy} className="rounded-lg bg-red-600 text-white px-4 py-2 text-sm disabled:opacity-60">
                {busy ? "..." : `হ্যাঁ, ট্রাশে পাঠান`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Purge confirm (permanent — needs code) */}
      {confirmMode === "purge" && (
        <div className="fixed inset-0 z-[90] bg-black/50 flex items-center justify-center p-4" onClick={() => !busy && setConfirmMode(null)}>
          <div className="bg-white rounded-2xl w-full max-w-sm p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-bold text-lg mb-1">{selectedCount}টি অর্ডার স্থায়ীভাবে ডিলিট?</h3>
            <p className="text-sm text-gray-500 mb-3">এটি আর ফেরানো যাবে না। নিশ্চিত করতে সিকিউরিটি কোড দিন।</p>
            <label className="block text-xs font-medium mb-1">সিকিউরিটি কোড</label>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              onKeyDown={(e) => { if (e.key === "Enter" && !busy) doPurge(); }}
              inputMode="numeric"
              autoFocus
              placeholder="কোড লিখুন"
              className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-red-400 tracking-widest mb-3"
            />
            {err && <p className="text-sm text-red-600 mb-3">{err}</p>}
            <div className="flex justify-end gap-2">
              <button onClick={() => setConfirmMode(null)} disabled={busy} className="rounded-lg border px-4 py-2 text-sm">বাতিল</button>
              <button onClick={doPurge} disabled={busy || !code.trim()} className="rounded-lg bg-red-600 text-white px-4 py-2 text-sm disabled:opacity-60">
                {busy ? "ডিলিট হচ্ছে..." : `স্থায়ীভাবে ডিলিট`}
              </button>
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
/** Human-readable local form (01XXXXXXXXX) for display — full, never truncated. */
function toLocalDisplay(phone: string): string {
  const n = bdIntl(phone); // 8801XXXXXXXXX
  if (n.startsWith("880") && n.length === 13) return "0" + n.slice(3);
  return (phone || "").trim();
}
function telLink(phone: string): string {
  return "tel:+" + bdIntl(phone);
}
function waLink(phone: string): string {
  return "https://wa.me/" + bdIntl(phone);
}

/** Small product thumbnail for an order row — first item's image + a "+N" badge for extra items. */
function OrderThumb({ items }: { items: OrderRow["items"] }) {
  const first = items?.[0];
  const img = first?.image || null;
  const extra = Math.max(0, (items?.length || 0) - 1);

  return (
    <div className="relative h-12 w-12 sm:h-14 sm:w-14 shrink-0 rounded-lg overflow-hidden bg-gray-100 ring-1 ring-black/5">
      {img ? (
        <Image src={img} alt={first?.product_name || ""} fill sizes="56px" className="object-cover" />
      ) : (
        <span className="flex h-full w-full items-center justify-center text-[10px] text-gray-400 text-center px-1">
          {first?.product_name?.slice(0, 12) || "—"}
        </span>
      )}
      {extra > 0 && (
        <span className="absolute bottom-0 right-0 rounded-tl-md bg-black/65 text-white text-[10px] px-1 leading-4">
          +{extra}
        </span>
      )}
    </div>
  );
}
