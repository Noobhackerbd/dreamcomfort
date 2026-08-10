"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  sendToCarryBee,
  sendToCarryBeeCustom,
  refreshCarryBeeStatus,
  cbCities,
  cbZones,
  cbAreas,
} from "./actions";

export interface CbOrder {
  id: string;
  orderNumber: string;
  name: string;
  phone: string;
  address: string;
  total: number;
  quantity: number;
  description: string;
  courier: string;
  trackingId: string;
}

interface Opt { id: number; name: string }

export function CarryBeeActions({
  order,
  configured,
  compact,
}: {
  order: CbOrder;
  configured: boolean;
  compact?: boolean;
}) {
  const router = useRouter();
  const sent = order.courier === "CarryBee" && !!order.trackingId;
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [modal, setModal] = useState(false);

  async function directSend() {
    setBusy(true); setErr(null); setMsg(null);
    const res = await sendToCarryBee(order.id);
    setBusy(false);
    if (!res.ok) return setErr(res.error ?? "ব্যর্থ।");
    setMsg(`পাঠানো হয়েছে ✓ ${res.consignmentId}`);
    router.refresh();
  }

  async function refresh() {
    setBusy(true); setErr(null);
    const res = await refreshCarryBeeStatus(order.trackingId);
    setBusy(false);
    if (!res.ok) return setErr(res.error ?? "ব্যর্থ।");
    setStatus(res.status ?? "—");
  }

  if (sent) {
    return (
      <div className={compact ? "text-xs space-y-1" : "text-sm space-y-2"}>
        <div className="rounded-md bg-gray-100 px-2 py-1 font-mono inline-block">{order.trackingId}</div>
        {status && <div>স্ট্যাটাস: <b>{status}</b></div>}
        <div className="flex gap-2">
          <a
            href={`/admin/orders/${order.id}/label`}
            target="_blank"
            rel="noopener"
            className="rounded-lg border px-3 py-1 hover:border-brand"
          >
            🖨️ Print
          </a>
          <button onClick={refresh} disabled={busy} className="rounded-lg border px-3 py-1 hover:border-brand disabled:opacity-60">
            {busy ? "..." : "🔄"}
          </button>
        </div>
        {err && <p className="text-red-600">{err}</p>}
      </div>
    );
  }

  return (
    <div className={compact ? "space-y-1.5" : "space-y-2"}>
      <div className="flex flex-col gap-1.5">
        <button
          onClick={() => setModal(true)}
          disabled={!configured}
          className="rounded-lg bg-blue-600 text-white px-3 py-1.5 text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
        >
          Send to CarryBee
        </button>
        <button
          onClick={directSend}
          disabled={busy || !configured}
          className="rounded-lg bg-amber-500 text-white px-3 py-1.5 text-sm font-medium hover:bg-amber-600 disabled:opacity-50"
        >
          {busy ? "..." : "Direct Send to CarryBee"}
        </button>
      </div>
      {!configured && <p className="text-[11px] text-amber-600">CarryBee কনফিগার করা নেই</p>}
      {msg && <p className="text-xs text-green-700">{msg}</p>}
      {err && <p className="text-xs text-red-600">{err}</p>}

      {modal && (
        <SendModal
          order={order}
          onClose={() => setModal(false)}
          onSent={(cid) => { setModal(false); setMsg(`পাঠানো হয়েছে ✓ ${cid}`); router.refresh(); }}
        />
      )}
    </div>
  );
}

function SendModal({
  order,
  onClose,
  onSent,
}: {
  order: CbOrder;
  onClose: () => void;
  onSent: (consignmentId: string) => void;
}) {
  const [productType, setProductType] = useState(2);
  const [name, setName] = useState(order.name);
  const [phone, setPhone] = useState(order.phone);
  const [phone2, setPhone2] = useState("");
  const [address, setAddress] = useState(order.address);
  const [qty, setQty] = useState(String(order.quantity || 1));
  const [weight, setWeight] = useState("0.5");
  const [amount, setAmount] = useState(String(order.total));
  const [desc, setDesc] = useState(order.description);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // City / Zone / Area (optional — blank = courier resolves from address)
  const [cities, setCities] = useState<Opt[]>([]);
  const [zones, setZones] = useState<Opt[]>([]);
  const [areas, setAreas] = useState<Opt[]>([]);
  const [cityId, setCityId] = useState(0);
  const [zoneId, setZoneId] = useState(0);
  const [areaId, setAreaId] = useState(0);

  useEffect(() => {
    cbCities().then((r) => { if (r.ok && r.options) setCities(r.options); });
  }, []);
  useEffect(() => {
    setZones([]); setZoneId(0); setAreas([]); setAreaId(0);
    if (cityId > 0) cbZones(cityId).then((r) => { if (r.ok && r.options) setZones(r.options); });
  }, [cityId]);
  useEffect(() => {
    setAreas([]); setAreaId(0);
    if (cityId > 0 && zoneId > 0) cbAreas(cityId, zoneId).then((r) => { if (r.ok && r.options) setAreas(r.options); });
  }, [cityId, zoneId]);

  async function submit() {
    setErr(null);
    if (!name.trim() || !phone.trim() || address.trim().length < 5) {
      return setErr("নাম, ফোন ও ঠিকানা দিন।");
    }
    setBusy(true);
    const form = {
      recipientName: name,
      recipientPhone: phone,
      recipientSecondaryPhone: phone2 || undefined,
      recipientAddress: address,
      amountToCollect: Number(amount) || 0,
      quantity: Number(qty) || 1,
      weightKg: Number(weight) || 0.5,
      productDescription: desc,
      productType,
      cityId: cityId || undefined,
      zoneId: zoneId || undefined,
      areaId: areaId || undefined,
    };
    const res = await sendToCarryBeeCustom(order.id, form);
    setBusy(false);
    if (!res.ok) return setErr(res.error ?? "ব্যর্থ।");
    onSent(res.consignmentId ?? "");
  }

  const cls = "w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-brand";
  const lbl = "block text-xs font-medium mb-1";

  return (
    <div className="fixed inset-0 z-[80] bg-black/50 flex items-start justify-center overflow-y-auto p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-2xl my-8 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b px-5 py-3">
          <h3 className="font-bold text-lg">Send Order to Courier</h3>
          <button onClick={onClose} className="text-gray-400 text-xl">×</button>
        </div>
        <div className="p-5 grid sm:grid-cols-2 gap-3">
          <div>
            <label className={lbl}>Product Type *</label>
            <select value={productType} onChange={(e) => setProductType(Number(e.target.value))} className={cls}>
              <option value={2}>Parcel</option>
              <option value={1}>Document</option>
            </select>
          </div>
          <div>
            <label className={lbl}>Merchant Order ID</label>
            <input value={order.orderNumber} readOnly className={cls + " bg-gray-50"} />
          </div>
          <div>
            <label className={lbl}>Recipient Name *</label>
            <input value={name} onChange={(e) => setName(e.target.value)} className={cls} />
          </div>
          <div>
            <label className={lbl}>Recipient Phone *</label>
            <input value={phone} onChange={(e) => setPhone(e.target.value)} className={cls} />
          </div>
          <div>
            <label className={lbl}>Phone (Secondary)</label>
            <input value={phone2} onChange={(e) => setPhone2(e.target.value)} className={cls} />
          </div>
          <div className="sm:col-span-2">
            <label className={lbl}>Recipient Address *</label>
            <textarea value={address} onChange={(e) => setAddress(e.target.value)} rows={2} className={cls} />
          </div>
          <div>
            <label className={lbl}>City (ঐচ্ছিক)</label>
            <select value={cityId} onChange={(e) => setCityId(Number(e.target.value))} className={cls}>
              <option value={0}>— অটো (ঠিকানা থেকে) —</option>
              {cities.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className={lbl}>Zone</label>
            <select value={zoneId} onChange={(e) => setZoneId(Number(e.target.value))} disabled={!cityId} className={cls}>
              <option value={0}>—</option>
              {zones.map((z) => <option key={z.id} value={z.id}>{z.name}</option>)}
            </select>
          </div>
          <div>
            <label className={lbl}>Area</label>
            <select value={areaId} onChange={(e) => setAreaId(Number(e.target.value))} disabled={!zoneId} className={cls}>
              <option value={0}>—</option>
              {areas.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </div>
          <div>
            <label className={lbl}>Package Quantity *</label>
            <input value={qty} onChange={(e) => setQty(e.target.value)} inputMode="numeric" className={cls} />
          </div>
          <div>
            <label className={lbl}>Weight (kg) *</label>
            <input value={weight} onChange={(e) => setWeight(e.target.value)} inputMode="decimal" className={cls} />
          </div>
          <div>
            <label className={lbl}>Amount to Collect *</label>
            <input value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="numeric" className={cls} />
          </div>
          <div className="sm:col-span-2">
            <label className={lbl}>Package Description *</label>
            <textarea value={desc} onChange={(e) => setDesc(e.target.value)} rows={2} className={cls} />
          </div>
          {err && <p className="sm:col-span-2 text-sm text-red-600">{err}</p>}
        </div>
        <div className="flex justify-end gap-2 border-t px-5 py-3">
          <button onClick={onClose} className="rounded-lg border px-5 py-2 text-sm">Cancel</button>
          <button onClick={submit} disabled={busy} className="rounded-lg bg-blue-600 text-white px-5 py-2 text-sm font-medium hover:bg-blue-700 disabled:opacity-60">
            {busy ? "পাঠানো হচ্ছে..." : "Send to CarryBee"}
          </button>
        </div>
      </div>
    </div>
  );
}
