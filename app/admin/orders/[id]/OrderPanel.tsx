"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { taka, bdDateTime, toBdInputValue, bdInputValueToIso } from "@/lib/format";
import { StatusSelect } from "../StatusSelect";
import { CarryBeeActions, type CbOrder } from "../CarryBeeActions";
import {
  saveOrderInfo,
  saveOrderItemsAndTotals,
  deleteOrder,
  updateOrderCourier,
  sendManualOrderSms,
  saveBooking,
} from "../actions";

export interface PanelItem {
  id: string;
  product_id?: string | null;
  product_name: string;
  unit_price: number;
  quantity: number;
}

export interface PanelOrder {
  id: string;
  order_number: string;
  status: string;
  created_at: string;
  customer_name: string;
  customer_phone: string;
  customer_email: string;
  address_line: string;
  area: string;
  city: string;
  district: string;
  postcode: string;
  notes: string;
  courier: string;
  tracking_id: string;
  payment_method: string;
  shipping_fee: number;
  discount: number;
  is_booked: boolean;
  booked_date: string | null;
  items: PanelItem[];
}

const STATUS_LABELS: Record<string, string> = {
  pending: "পেন্ডিং",
  confirmed: "কনফার্মড",
  processing: "প্রসেসিং",
  shipped: "শিপড",
  delivered: "ডেলিভার্ড",
  cancelled: "বাতিল",
  returned: "রিটার্ন",
};
const STATUS_COLORS: Record<string, string> = {
  pending: "bg-gray-100 text-gray-700",
  confirmed: "bg-blue-100 text-blue-700",
  processing: "bg-indigo-100 text-indigo-700",
  shipped: "bg-amber-100 text-amber-700",
  delivered: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-700",
  returned: "bg-orange-100 text-orange-700",
};

const inputCls = "w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-brand";
const lblCls = "block text-xs font-medium text-gray-500 mb-1";

function rid() {
  // client-only temp id for new rows (avoids Math.random in shared code paths)
  return "new-" + Date.now().toString(36) + Math.floor(performance.now()).toString(36);
}

export function OrderPanel({ order, cbConfigured }: { order: PanelOrder; cbConfigured: boolean }) {
  const router = useRouter();

  // ---- Customer / address / date ----
  const [name, setName] = useState(order.customer_name);
  const [phone, setPhone] = useState(order.customer_phone);
  const [email, setEmail] = useState(order.customer_email);
  const [addr, setAddr] = useState(order.address_line);
  const [area, setArea] = useState(order.area);
  const [city, setCity] = useState(order.city);
  const [district, setDistrict] = useState(order.district);
  const [postcode, setPostcode] = useState(order.postcode);
  const [notes, setNotes] = useState(order.notes);
  const [dateVal, setDateVal] = useState(toBdInputValue(order.created_at));
  const [infoBusy, setInfoBusy] = useState(false);
  const [infoMsg, setInfoMsg] = useState<string | null>(null);
  const [infoErr, setInfoErr] = useState<string | null>(null);

  async function saveInfo() {
    setInfoBusy(true); setInfoMsg(null); setInfoErr(null);
    const res = await saveOrderInfo(order.id, {
      customer_name: name,
      customer_phone: phone,
      customer_email: email,
      address_line: addr,
      area, city, district, postcode, notes,
      created_at: bdInputValueToIso(dateVal),
    });
    setInfoBusy(false);
    if (!res.ok) return setInfoErr(res.error ?? "সেভ ব্যর্থ।");
    setInfoMsg("সেভ হয়েছে ✓");
    router.refresh();
  }

  // ---- Products / totals ----
  const [items, setItems] = useState<PanelItem[]>(order.items.map((i) => ({ ...i })));
  const [shipping, setShipping] = useState(String(order.shipping_fee));
  const [discount, setDiscount] = useState(String(order.discount));
  const [itemsBusy, setItemsBusy] = useState(false);
  const [itemsMsg, setItemsMsg] = useState<string | null>(null);
  const [itemsErr, setItemsErr] = useState<string | null>(null);

  const subtotal = useMemo(
    () => items.reduce((n, it) => n + (Number(it.unit_price) || 0) * (Number(it.quantity) || 0), 0),
    [items]
  );
  const totalQty = useMemo(
    () => items.reduce((n, it) => n + (Number(it.quantity) || 0), 0),
    [items]
  );
  const total = Math.max(0, subtotal + (Number(shipping) || 0) - (Number(discount) || 0));

  function setItem(id: string, patch: Partial<PanelItem>) {
    setItems((arr) => arr.map((it) => (it.id === id ? { ...it, ...patch } : it)));
  }
  function addItem() {
    setItems((arr) => [...arr, { id: rid(), product_name: "", unit_price: 0, quantity: 1 }]);
  }
  function removeItem(id: string) {
    setItems((arr) => arr.filter((it) => it.id !== id));
  }

  async function saveItems() {
    setItemsBusy(true); setItemsMsg(null); setItemsErr(null);
    const res = await saveOrderItemsAndTotals(
      order.id,
      items.map((it) => ({
        product_id: it.product_id ?? null,
        product_name: it.product_name,
        unit_price: Number(it.unit_price) || 0,
        quantity: Number(it.quantity) || 1,
      })),
      Number(shipping) || 0,
      Number(discount) || 0
    );
    setItemsBusy(false);
    if (!res.ok) return setItemsErr(res.error ?? "সেভ ব্যর্থ।");
    setItemsMsg("পণ্য ও হিসাব সেভ হয়েছে ✓");
    router.refresh();
  }

  // ---- Booking (scheduled delivery) ----
  const [booked, setBooked] = useState(order.is_booked);
  const [bookedDate, setBookedDate] = useState(order.booked_date || "");
  const [bookBusy, setBookBusy] = useState(false);
  const [bookMsg, setBookMsg] = useState<string | null>(null);
  async function saveBook() {
    if (booked && !bookedDate) { setBookMsg("তারিখ দিন।"); return; }
    setBookBusy(true); setBookMsg(null);
    const res = await saveBooking(order.id, booked, booked ? bookedDate : null);
    setBookBusy(false);
    setBookMsg(res.ok ? "সেভ হয়েছে ✓" : res.error ?? "ব্যর্থ।");
    if (res.ok) router.refresh();
  }

  // ---- Courier (quick manual) ----
  const [courier, setCourier] = useState(order.courier);
  const [tracking, setTracking] = useState(order.tracking_id);
  const [courierBusy, setCourierBusy] = useState(false);
  const [courierMsg, setCourierMsg] = useState<string | null>(null);
  async function saveCourier() {
    setCourierBusy(true); setCourierMsg(null);
    await updateOrderCourier(order.id, courier, tracking);
    setCourierBusy(false);
    setCourierMsg("সেভ হয়েছে ✓");
    router.refresh();
  }

  // ---- Manual SMS ----
  const [sms, setSms] = useState("");
  const [smsBusy, setSmsBusy] = useState(false);
  const [smsMsg, setSmsMsg] = useState<string | null>(null);
  async function sendSms() {
    if (!sms.trim()) return;
    setSmsBusy(true); setSmsMsg(null);
    const res = await sendManualOrderSms(order.id, sms);
    setSmsBusy(false);
    if (!res.ok) return setSmsMsg(res.error ?? "ব্যর্থ।");
    setSmsMsg("এসএমএস পাঠানো হয়েছে ✓");
    setSms("");
  }

  // ---- Delete ----
  const [delOpen, setDelOpen] = useState(false);
  const [delBusy, setDelBusy] = useState(false);
  async function doDelete() {
    setDelBusy(true);
    const res = await deleteOrder(order.id);
    if (!res.ok) { setDelBusy(false); return; }
    router.push("/admin/orders");
  }

  // CarryBee order built from LIVE edited values so the modal prefills current data.
  const cbOrder: CbOrder = {
    id: order.id,
    orderNumber: order.order_number,
    name,
    phone,
    address: [addr, area, city, district].filter(Boolean).join(", "),
    total,
    quantity: totalQty || 1,
    description: items.map((it) => `${it.product_name} x${it.quantity}`).join(", "),
    courier: order.courier,
    trackingId: order.tracking_id,
  };

  return (
    <div className="max-w-5xl">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div>
          <a href="/admin/orders" className="text-sm text-gray-400 hover:underline">← অর্ডার তালিকা</a>
          <div className="flex items-center gap-3 mt-1">
            <h1 className="text-2xl font-bold">{order.order_number}</h1>
            <span className={"rounded-full px-3 py-1 text-xs font-semibold " + (STATUS_COLORS[order.status] ?? "bg-gray-100 text-gray-700")}>
              {STATUS_LABELS[order.status] ?? order.status}
            </span>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            🕒 অর্ডারের সময় (বাংলাদেশ): <b className="text-gray-700">{bdDateTime(order.created_at)}</b>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <a href={`/admin/orders/${order.id}/invoice`} target="_blank" className="rounded-lg border px-4 py-2 text-sm hover:border-brand">🧾 ইনভয়েস</a>
          <button onClick={() => setDelOpen(true)} className="rounded-lg border border-red-200 text-red-600 px-4 py-2 text-sm hover:bg-red-50">🗑️ ডিলিট</button>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        {/* LEFT: products + customer (2 cols) */}
        <div className="lg:col-span-2 space-y-4">
          {/* Products */}
          <section className="rounded-xl border bg-white p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold">পণ্য ও হিসাব</h2>
              <button onClick={addItem} className="rounded-lg border px-3 py-1.5 text-sm hover:border-brand">+ পণ্য যোগ করুন</button>
            </div>

            {/* header row (desktop) */}
            <div className="hidden sm:grid grid-cols-12 gap-2 text-[11px] font-medium text-gray-400 px-1 mb-1">
              <div className="col-span-6">পণ্যের নাম</div>
              <div className="col-span-2 text-right">দর (৳)</div>
              <div className="col-span-1 text-center">পরিমাণ</div>
              <div className="col-span-2 text-right">লাইন টোটাল</div>
              <div className="col-span-1"></div>
            </div>

            <div className="space-y-2">
              {items.map((it) => {
                const line = (Number(it.unit_price) || 0) * (Number(it.quantity) || 0);
                return (
                  <div key={it.id} className="grid grid-cols-12 gap-2 items-center">
                    <div className="col-span-12 sm:col-span-6">
                      <input
                        value={it.product_name}
                        onChange={(e) => setItem(it.id, { product_name: e.target.value })}
                        placeholder="পণ্যের নাম"
                        className={inputCls}
                      />
                    </div>
                    <div className="col-span-4 sm:col-span-2">
                      <input
                        value={String(it.unit_price)}
                        onChange={(e) => setItem(it.id, { unit_price: Number(e.target.value.replace(/[^\d.]/g, "")) || 0 })}
                        inputMode="decimal"
                        className={inputCls + " text-right"}
                      />
                    </div>
                    <div className="col-span-3 sm:col-span-1">
                      <input
                        value={String(it.quantity)}
                        onChange={(e) => setItem(it.id, { quantity: Math.max(1, Math.floor(Number(e.target.value.replace(/[^\d]/g, "")) || 1)) })}
                        inputMode="numeric"
                        className={inputCls + " text-center"}
                      />
                    </div>
                    <div className="col-span-3 sm:col-span-2 text-right text-sm font-medium tabular-nums">{taka(line)}</div>
                    <div className="col-span-2 sm:col-span-1 text-right">
                      <button onClick={() => removeItem(it.id)} className="rounded-md border border-red-200 text-red-500 w-8 h-8 hover:bg-red-50" title="সরান">×</button>
                    </div>
                  </div>
                );
              })}
              {items.length === 0 && <p className="text-sm text-gray-400 py-2">কোনো পণ্য নেই — “+ পণ্য যোগ করুন” চাপুন।</p>}
            </div>

            {/* Totals */}
            <div className="mt-4 pt-3 border-t grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div>
                  <label className={lblCls}>ডেলিভারি চার্জ (৳)</label>
                  <input value={shipping} onChange={(e) => setShipping(e.target.value.replace(/[^\d.]/g, ""))} inputMode="decimal" className={inputCls} />
                </div>
                <div>
                  <label className={lblCls}>ডিসকাউন্ট (৳)</label>
                  <input value={discount} onChange={(e) => setDiscount(e.target.value.replace(/[^\d.]/g, ""))} inputMode="decimal" className={inputCls} />
                </div>
              </div>
              <div className="rounded-lg bg-gray-50 p-3 text-sm space-y-1.5 self-end">
                <div className="flex justify-between"><span className="text-gray-500">সাবটোটাল</span><span className="tabular-nums">{taka(subtotal)}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">ডেলিভারি</span><span className="tabular-nums">{taka(Number(shipping) || 0)}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">ডিসকাউন্ট</span><span className="tabular-nums text-red-500">− {taka(Number(discount) || 0)}</span></div>
                <div className="flex justify-between border-t pt-1.5 font-bold text-base"><span>সর্বমোট</span><span className="text-brand tabular-nums">{taka(total)}</span></div>
              </div>
            </div>

            <div className="mt-3 flex items-center gap-3">
              <button onClick={saveItems} disabled={itemsBusy} className="rounded-lg bg-brand text-white px-5 py-2 text-sm disabled:opacity-60">
                {itemsBusy ? "সেভ হচ্ছে..." : "পণ্য ও হিসাব সেভ করুন"}
              </button>
              {itemsMsg && <span className="text-sm text-green-600">{itemsMsg}</span>}
              {itemsErr && <span className="text-sm text-red-600">{itemsErr}</span>}
            </div>
          </section>

          {/* Customer & address */}
          <section className="rounded-xl border bg-white p-4">
            <h2 className="font-semibold mb-3">গ্রাহক ও ঠিকানা</h2>
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className={lblCls}>নাম *</label>
                <input value={name} onChange={(e) => setName(e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className={lblCls}>ফোন *</label>
                <input value={phone} onChange={(e) => setPhone(e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className={lblCls}>ইমেইল</label>
                <input value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className={lblCls}>অর্ডারের তারিখ ও সময় (বাংলাদেশ)</label>
                <input type="datetime-local" value={dateVal} onChange={(e) => setDateVal(e.target.value)} className={inputCls} />
              </div>
              <div className="sm:col-span-2">
                <label className={lblCls}>ঠিকানা *</label>
                <textarea value={addr} onChange={(e) => setAddr(e.target.value)} rows={2} className={inputCls} />
              </div>
              <div>
                <label className={lblCls}>এলাকা</label>
                <input value={area} onChange={(e) => setArea(e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className={lblCls}>শহর / থানা</label>
                <input value={city} onChange={(e) => setCity(e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className={lblCls}>জেলা</label>
                <input value={district} onChange={(e) => setDistrict(e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className={lblCls}>পোস্ট কোড</label>
                <input value={postcode} onChange={(e) => setPostcode(e.target.value)} className={inputCls} />
              </div>
              <div className="sm:col-span-2">
                <label className={lblCls}>নোট</label>
                <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className={inputCls} />
              </div>
            </div>
            <div className="mt-3 flex items-center gap-3">
              <button onClick={saveInfo} disabled={infoBusy} className="rounded-lg bg-brand text-white px-5 py-2 text-sm disabled:opacity-60">
                {infoBusy ? "সেভ হচ্ছে..." : "গ্রাহক তথ্য সেভ করুন"}
              </button>
              {infoMsg && <span className="text-sm text-green-600">{infoMsg}</span>}
              {infoErr && <span className="text-sm text-red-600">{infoErr}</span>}
            </div>
          </section>
        </div>

        {/* RIGHT: status / courier / carrybee / sms */}
        <div className="space-y-4">
          <section className="rounded-xl border bg-white p-4">
            <h2 className="font-semibold mb-2">অবস্থা</h2>
            <StatusSelect id={order.id} value={order.status} />
            <p className="text-[11px] text-gray-400 mt-2">
              কনফার্মড / শিপড / ডেলিভার্ড করলে গ্রাহককে স্বয়ংক্রিয় এসএমএস যাবে।
            </p>
          </section>

          <section className="rounded-xl border bg-white p-4">
            <div className="flex items-center gap-2 mb-2">
              <span>📅</span>
              <h2 className="font-semibold">বুকিং (পরে ডেলিভারি)</h2>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={booked} onChange={(e) => setBooked(e.target.checked)} className="h-4 w-4 accent-amber-500" />
              বুকড অর্ডার
            </label>
            {booked && (
              <div className="mt-2">
                <label className="block text-xs text-gray-500 mb-1">ডেলিভারি তারিখ</label>
                <input type="date" value={bookedDate} onChange={(e) => setBookedDate(e.target.value)} className={inputCls} />
                <p className="mt-1 text-[11px] text-amber-700">তারিখের ৩ দিন আগে থেকে ড্যাশবোর্ডে রিমাইন্ডার দেখাবে।</p>
              </div>
            )}
            <div className="mt-3 flex items-center gap-3">
              <button onClick={saveBook} disabled={bookBusy} className="rounded-lg bg-amber-500 text-white px-4 py-1.5 text-sm disabled:opacity-60">
                {bookBusy ? "সেভ হচ্ছে..." : "বুকিং সেভ করুন"}
              </button>
              {bookMsg && <span className="text-sm text-green-600">{bookMsg}</span>}
            </div>
          </section>

          <section className="rounded-xl border bg-white p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-amber-100 text-amber-700 text-xs">🐝</span>
              <h2 className="font-semibold">CarryBee কুরিয়ার</h2>
            </div>
            <CarryBeeActions configured={cbConfigured} order={cbOrder} />
          </section>

          <section className="rounded-xl border bg-white p-4">
            <h2 className="font-semibold mb-2">অন্য কুরিয়ার (ম্যানুয়াল)</h2>
            <div className="space-y-2">
              <input value={courier} onChange={(e) => setCourier(e.target.value)} placeholder="কুরিয়ার (যেমন: Steadfast)" className={inputCls} />
              <input value={tracking} onChange={(e) => setTracking(e.target.value)} placeholder="ট্র্যাকিং আইডি" className={inputCls} />
              <button onClick={saveCourier} disabled={courierBusy} className="w-full rounded-lg border px-4 py-2 text-sm hover:border-brand disabled:opacity-60">
                {courierBusy ? "সেভ হচ্ছে..." : courierMsg ?? "কুরিয়ার সেভ করুন"}
              </button>
            </div>
          </section>

          <section className="rounded-xl border bg-white p-4">
            <h2 className="font-semibold mb-2">ম্যানুয়াল এসএমএস</h2>
            <textarea value={sms} onChange={(e) => setSms(e.target.value)} rows={3} placeholder="গ্রাহককে মেসেজ লিখুন..." className={inputCls} />
            <button onClick={sendSms} disabled={smsBusy || !sms.trim()} className="mt-2 w-full rounded-lg bg-brand text-white px-4 py-2 text-sm disabled:opacity-60">
              {smsBusy ? "পাঠানো হচ্ছে..." : "এসএমএস পাঠান"}
            </button>
            {smsMsg && <p className="text-xs text-green-600 mt-2">{smsMsg}</p>}
          </section>
        </div>
      </div>

      {/* Delete confirm */}
      {delOpen && (
        <div className="fixed inset-0 z-[90] bg-black/50 flex items-center justify-center p-4" onClick={() => setDelOpen(false)}>
          <div className="bg-white rounded-2xl w-full max-w-sm p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-bold text-lg mb-1">অর্ডার ডিলিট করবেন?</h3>
            <p className="text-sm text-gray-500 mb-4">
              <b>{order.order_number}</b> স্থায়ীভাবে মুছে যাবে। এটি ফেরানো যাবে না।
            </p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setDelOpen(false)} className="rounded-lg border px-4 py-2 text-sm">বাতিল</button>
              <button onClick={doDelete} disabled={delBusy} className="rounded-lg bg-red-600 text-white px-4 py-2 text-sm disabled:opacity-60">
                {delBusy ? "ডিলিট হচ্ছে..." : "হ্যাঁ, ডিলিট করুন"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
