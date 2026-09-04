"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/lib/cart/store";
import { taka } from "@/lib/format";
import { SHIPPING, type DeliveryArea } from "@/lib/config";
import { placeOrder, checkCoupon } from "./actions";
import { fireEvent } from "@/components/track";

export default function CheckoutPage() {
  const router = useRouter();
  const { items, subtotal, clear } = useCart();
  const [mounted, setMounted] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [deliveryArea, setDeliveryArea] = useState<DeliveryArea>("inside");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Coupon
  const [couponInput, setCouponInput] = useState("");
  const [coupon, setCoupon] = useState<{ code: string; discount: number; label: string } | null>(null);
  const [couponMsg, setCouponMsg] = useState<string | null>(null);
  const [couponBusy, setCouponBusy] = useState(false);

  useEffect(() => setMounted(true), []);

  const shippingFee = deliveryArea === "outside" ? SHIPPING.outsideDhaka : SHIPPING.insideDhaka;

  useEffect(() => {
    if (!mounted || items.length === 0) return;
    try { if (sessionStorage.getItem("dc_ic_fired")) return; } catch {}
    try { sessionStorage.setItem("dc_ic_fired", "1"); } catch {}
    fireEvent("InitiateCheckout", {
      currency: "BDT", value: subtotal() + shippingFee, num_items: items.length,
      content_ids: items.map((i) => i.id), content_type: "product",
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted]);

  if (!mounted) return null;

  if (items.length === 0) {
    return (
      <div className="text-center py-20">
        <p className="text-lg text-gray-500">আপনার কার্ট খালি।</p>
        <a href="/" className="inline-block mt-5 rounded-xl bg-brand text-white px-6 py-3 font-medium">কেনাকাটা শুরু করুন</a>
      </div>
    );
  }

  const sub = subtotal();
  const discount = coupon?.discount ?? 0;
  const total = Math.max(0, sub + shippingFee - discount);

  async function applyCoupon() {
    const code = couponInput.trim();
    if (!code) return;
    setCouponBusy(true); setCouponMsg(null);
    const res = await checkCoupon(code, sub);
    setCouponBusy(false);
    if (res.ok) { setCoupon({ code: res.code, discount: res.discount, label: res.label }); setCouponMsg(null); }
    else { setCoupon(null); setCouponMsg(res.error); }
  }
  function removeCoupon() { setCoupon(null); setCouponInput(""); setCouponMsg(null); }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const phoneDigits = phone.replace(/\D/g, "");
    if (!name.trim()) return setError("নাম লিখুন।");
    if (!/^01\d{9}$/.test(phoneDigits)) return setError("সঠিক মোবাইল নম্বর লিখুন (০১XXXXXXXXX)।");
    if (address.trim().length < 5) return setError("সম্পূর্ণ ঠিকানা লিখুন।");

    const fbclid = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("fbclid") ?? undefined : undefined;

    setSubmitting(true);
    const res = await placeOrder({
      name, phone, address, deliveryArea, notes,
      items: items.map((i) => ({ id: i.id, qty: i.qty })),
      couponCode: coupon?.code,
      fbclid,
    });
    setSubmitting(false);
    if (!res.ok) { setError(res.error ?? "অর্ডার ব্যর্থ হয়েছে।"); return; }
    clear();
    router.push(`/order/${res.orderNumber}`);
  }

  const inputCls = "w-full rounded-xl border border-black/10 bg-white px-4 py-3 outline-none focus:border-brand focus:ring-2 focus:ring-brand-soft transition";

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold font-display mb-6">চেকআউট</h1>

      <form onSubmit={onSubmit} className="grid md:grid-cols-[1.1fr_.9fr] gap-6 items-start">
        {/* Left — details */}
        <div className="rounded-2xl border border-black/5 bg-white p-5 space-y-4 shadow-sm">
          <h2 className="font-bold text-lg">ডেলিভারি তথ্য</h2>
          <div>
            <label className="block text-sm font-medium mb-1">আপনার নাম *</label>
            <input autoComplete="name" autoCapitalize="words" value={name} onChange={(e) => setName(e.target.value)} placeholder="আপনার নাম" className={inputCls} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">মোবাইল নম্বর *</label>
            <input type="tel" autoComplete="tel" inputMode="numeric" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="০১XXXXXXXXX" className={inputCls} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">সম্পূর্ণ ঠিকানা *</label>
            <input autoComplete="street-address" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="বাসা/হোল্ডিং, রোড, এলাকা, থানা, জেলা" className={inputCls} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">অর্ডার নোট (ঐচ্ছিক)</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="বিশেষ কোনো নির্দেশনা" className={inputCls} />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">ডেলিভারি এলাকা</label>
            <div className="grid grid-cols-2 gap-3">
              {(["inside", "outside"] as const).map((area) => (
                <button key={area} type="button" onClick={() => setDeliveryArea(area)}
                  className={"rounded-xl border px-3 py-3 text-sm font-medium transition " + (deliveryArea === area ? "border-brand bg-brand-soft text-brand-dark" : "border-black/10 hover:border-brand/40")}>
                  {area === "inside" ? "ঢাকার ভিতরে" : "ঢাকার বাইরে"} · {taka(area === "inside" ? SHIPPING.insideDhaka : SHIPPING.outsideDhaka)}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right — summary */}
        <div className="rounded-2xl border border-black/5 bg-white p-5 shadow-sm md:sticky md:top-24">
          <h2 className="font-bold text-lg mb-3">অর্ডার সারাংশ</h2>
          <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
            {items.map((i) => (
              <div key={i.id} className="flex justify-between text-sm gap-2">
                <span className="truncate">{i.name} × {i.qty}</span>
                <span className="shrink-0 tabular-nums">{taka(i.price * i.qty)}</span>
              </div>
            ))}
          </div>

          {/* Coupon */}
          <div className="mt-4 pt-4 border-t border-black/5">
            {coupon ? (
              <div className="flex items-center justify-between rounded-xl bg-green-50 border border-green-200 px-3 py-2">
                <span className="text-sm text-green-700 font-medium">🎟️ {coupon.code} · {coupon.label}</span>
                <button type="button" onClick={removeCoupon} className="text-xs text-red-500 font-medium">বাতিল</button>
              </div>
            ) : (
              <>
                <label className="block text-sm font-medium mb-1.5">কুপন কোড</label>
                <div className="flex gap-2">
                  <input value={couponInput} onChange={(e) => setCouponInput(e.target.value.toUpperCase())} placeholder="কোড লিখুন" className={inputCls + " flex-1 font-mono"} />
                  <button type="button" onClick={applyCoupon} disabled={couponBusy || !couponInput.trim()} className="shrink-0 rounded-xl bg-accent text-white px-5 font-medium disabled:opacity-50">
                    {couponBusy ? "…" : "Apply"}
                  </button>
                </div>
                {couponMsg && <p className="mt-1.5 text-xs text-red-500">{couponMsg}</p>}
              </>
            )}
          </div>

          {/* Totals */}
          <div className="mt-4 pt-4 border-t border-black/5 space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-gray-500">সাবটোটাল</span><span className="tabular-nums">{taka(sub)}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">ডেলিভারি চার্জ</span><span className="tabular-nums">{taka(shippingFee)}</span></div>
            {discount > 0 && <div className="flex justify-between text-green-600"><span>কুপন ছাড়</span><span className="tabular-nums">− {taka(discount)}</span></div>}
            <div className="flex justify-between font-bold text-lg pt-2 border-t border-black/5"><span>সর্বমোট</span><span className="text-accent-dark tabular-nums">{taka(total)}</span></div>
          </div>

          {error && <p className="mt-3 rounded-xl bg-red-50 border border-red-200 text-red-700 px-4 py-2 text-sm">{error}</p>}

          <button type="submit" disabled={submitting} className="mt-4 w-full rounded-xl bg-brand text-white px-6 py-3.5 font-bold hover:bg-brand-dark disabled:opacity-60">
            {submitting ? "অর্ডার হচ্ছে..." : "অর্ডার নিশ্চিত করুন"}
          </button>
          <p className="mt-2 text-center text-xs text-gray-400">ক্যাশ অন ডেলিভারি · অর্ডারের পর আমরা কল করে নিশ্চিত করব।</p>
        </div>
      </form>
    </div>
  );
}
