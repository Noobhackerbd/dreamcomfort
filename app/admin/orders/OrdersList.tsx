"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { taka, bdDateTime } from "@/lib/format";
import { StatusSelect } from "./StatusSelect";
import { CarryBeeActions } from "./CarryBeeActions";
import { bulkDeleteOrders } from "./actions";

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
  items: { product_name: string; quantity: number }[];
}

export function OrdersList({ orders, cbReady }: { orders: OrderRow[]; cbReady: boolean }) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

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

  async function doBulkDelete() {
    setBusy(true); setErr(null);
    const res = await bulkDeleteOrders(Array.from(selected));
    setBusy(false);
    if (!res.ok) return setErr(res.error ?? "ডিলিট ব্যর্থ।");
    setConfirm(false);
    setSelected(new Set());
    router.refresh();
  }

  const selectedCount = selected.size;
  const selectedTotal = useMemo(
    () => orders.filter((o) => selected.has(o.id)).reduce((n, o) => n + Number(o.total || 0), 0),
    [orders, selected]
  );

  if (orders.length === 0) {
    return <p className="text-center text-gray-400 py-10">কোনো অর্ডার নেই।</p>;
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
          <button
            onClick={() => { setErr(null); setConfirm(true); }}
            className="rounded-lg bg-red-600 text-white px-4 py-1.5 text-sm font-medium hover:bg-red-700"
          >
            🗑️ নির্বাচিত {selectedCount}টি ডিলিট করুন
          </button>
        )}
      </div>

      <div className="space-y-3">
        {orders.map((o) => {
          const on = selected.has(o.id);
          return (
            <div key={o.id} className={"rounded-xl border bg-white p-4 transition " + (on ? "ring-2 ring-red-300 border-red-200" : "")}>
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={on}
                  onChange={() => toggle(o.id)}
                  className="mt-1 h-4 w-4 accent-brand shrink-0"
                  aria-label={`নির্বাচন ${o.order_number}`}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <a href={`/admin/orders/${o.id}`} className="font-bold text-brand hover:underline">
                          {o.order_number}
                        </a>
                        <span className="text-xs text-gray-400">🕒 {bdDateTime(o.created_at)}</span>
                      </div>
                      <p className="text-sm mt-1">
                        {o.customer_name} · {o.customer_phone}
                      </p>
                      <p className="text-sm text-gray-500 truncate">{o.address_line}</p>
                      <p className="text-xs text-gray-400 mt-1">
                        {(o.items ?? []).map((it) => `${it.product_name} ×${it.quantity}`).join("، ")}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-bold text-lg">{taka(Number(o.total))}</p>
                      <div className="mt-2">
                        <StatusSelect id={o.id} value={o.status} />
                      </div>
                      <a href={`/admin/orders/${o.id}`} className="text-xs text-brand hover:underline">
                        বিস্তারিত →
                      </a>
                    </div>
                  </div>

                  <div className="mt-3 pt-3 border-t flex justify-end">
                    <div className="w-48">
                      <CarryBeeActions
                        configured={cbReady}
                        compact
                        order={{
                          id: o.id,
                          orderNumber: o.order_number,
                          name: o.customer_name,
                          phone: o.customer_phone,
                          address: [o.address_line, o.area, o.city, o.district].filter(Boolean).join(", "),
                          total: Number(o.total),
                          quantity: (o.items ?? []).reduce((n, it) => n + Number(it.quantity || 0), 0) || 1,
                          description: (o.items ?? []).map((it) => `${it.product_name} x${it.quantity}`).join(", "),
                          courier: o.courier ?? "",
                          trackingId: o.tracking_id ?? "",
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Sticky bulk-action bar (mobile-friendly) */}
      {someSelected && (
        <div className="fixed bottom-4 inset-x-3 z-40 mx-auto max-w-md rounded-2xl bg-gray-900 text-white shadow-2xl px-4 py-3 flex items-center justify-between gap-3">
          <span className="text-sm">{selectedCount}টি অর্ডার · {taka(selectedTotal)}</span>
          <div className="flex items-center gap-2">
            <button onClick={() => setSelected(new Set())} className="rounded-lg bg-white/15 px-3 py-1.5 text-sm">বাতিল</button>
            <button onClick={() => { setErr(null); setConfirm(true); }} className="rounded-lg bg-red-600 px-3 py-1.5 text-sm font-medium">🗑️ ডিলিট</button>
          </div>
        </div>
      )}

      {/* Confirm modal */}
      {confirm && (
        <div className="fixed inset-0 z-[90] bg-black/50 flex items-center justify-center p-4" onClick={() => !busy && setConfirm(false)}>
          <div className="bg-white rounded-2xl w-full max-w-sm p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-bold text-lg mb-1">{selectedCount}টি অর্ডার ডিলিট করবেন?</h3>
            <p className="text-sm text-gray-500 mb-4">
              নির্বাচিত অর্ডারগুলো স্থায়ীভাবে মুছে যাবে। এটি ফেরানো যাবে না।
            </p>
            {err && <p className="text-sm text-red-600 mb-3">{err}</p>}
            <div className="flex justify-end gap-2">
              <button onClick={() => setConfirm(false)} disabled={busy} className="rounded-lg border px-4 py-2 text-sm">বাতিল</button>
              <button onClick={doBulkDelete} disabled={busy} className="rounded-lg bg-red-600 text-white px-4 py-2 text-sm disabled:opacity-60">
                {busy ? "ডিলিট হচ্ছে..." : `হ্যাঁ, ${selectedCount}টি ডিলিট করুন`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
