"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/lib/cart/store";
import { taka } from "@/lib/format";
import { SHIPPING, type DeliveryArea } from "@/lib/config";
import { placeOrder, checkCoupon, getCheckoutPrefill } from "./actions";
import { fireEvent } from "@/components/track";

export default function CheckoutPage() {
  const router = useRouter();
  const { items, subtotal, clear, setQty, remove } = useCart();
  const [mounted, setMounted] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [deliveryArea, setDeliveryArea] = useState<DeliveryArea>("inside");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedAddresses, setSavedAddresses] = useState<any[]>([]);
  const [activeAddrId, setActiveAddrId] = useState<string | null>(null);

  // Coupon
  const [couponInput, setCouponInput] = useState("");
  const [coupon, setCoupon] = useState<{ code: string; discount: number; label: string } | null>(null);
  const [couponMsg, setCouponMsg] = useState<string | null>(null);
  const [couponBusy, setCouponBusy] = useState(false);

  useEffect(() => setMounted(true), []);

  // Prefill for a logged-in customer (profile + saved addresses) — faster checkout.
  useEffect(() => {
    let cancelled = false;
    getCheckoutPrefill().then((p: any) => {
      if (cancelled || !p?.loggedIn) return;
      setName((v) => v || p.name || "");
      setPhone((v) => v || p.phone || "");
      const addrs = p.addresses || [];
      setSavedAddresses(addrs);
      const def = addrs.find((a: any) => a.is_default) || addrs[0];
      if (def) {
        setActiveAddrId(def.id);
        setName((v) => v || def.name || p.name || "");
        setPhone((v) => v || def.phone || p.phone || "");
        setAddress((v) => v || [def.address_line, def.area, def.city].filter(Boolean).join(", "));
      }
    }).catch(() => {});
    return () => { cancelled = true; };
  }, []);

  function pickAddress(a: any) {
    setActiveAddrId(a.id);
    setName(a.name || "");
    setPhone(a.phone || "");
    setAddress([a.address_line, a.area, a.city].filter(Boolean).join(", "));
  }

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

          {savedAddresses.length > 0 && (
            <div>
              <label className="block text-sm font-medium mb-1.5">সেভ করা ঠিকানা</label>
              <div className="flex gap-2 flex-wrap">
                {savedAddresses.map((a) => (
                  <button key={a.id} type="button" onClick={() => pickAddress(a)}
                    className={"rounded-xl border px-3 py-2 text-left text-xs max-w-[220px] transition " + (activeAddrId === a.id ? "border-brand bg-brand/5" : "border-black/10 hover:bg-gray-50")}>
                    <span className="font-semibold block truncate">{a.label || a.name}</span>
                    <span className="text-gray-500 block truncate">{[a.address_line, a.area].filter(Boolean).join(", ")}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

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
          <div className="space-y-3 max-h-[22rem] overflow-y-auto pr-1 -mr-1">
            {items.map((i) => (
              <div key={i.id} className="flex gap-3 items-center">
                {/* Product image */}
                <div className="relative h-16 w-16 shrink-0 rounded-xl overflow-hidden border border-black/[0.06] bg-[#fafafa]">
                  {i.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={i.image} alt={i.name} className="h-full w-full object-cover" />
                  ) : (
                    <span className="absolute inset-0 grid place-items-center text-gray-300">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M20.6 6.6l-8-4a2 2 0 00-1.9 0l-8 4M3 6.6v10.8a2 2 0 001.1 1.8l7 3.4a2 2 0 001.8 0l7-3.4a2 2 0 001.1-1.8V6.6M3 6.6l9 4.4 9-4.4M12 22V11" /></svg>
                    </span>
                  )}
                </div>

                {/* Name, price, quantity stepper */}
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-semibold text-gray-800 leading-snug line-clamp-2">{i.name}</p>
                  <p className="text-[12px] text-gray-400 mt-0.5 tabular-nums">{taka(i.price)} × {i.qty}</p>
                  <div className="mt-1.5 inline-flex items-center gap-1 rounded-full border border-black/[0.08] bg-white p-0.5">
                    <button type="button" onClick={() => setQty(i.id, i.qty - 1)} aria-label="কমান"
                      className="h-6 w-6 grid place-items-center rounded-full text-brand-dark bg-brand-soft hover:bg-brand hover:text-white active:scale-90 transition-all">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><path d="M5 12h14" /></svg>
                    </button>
                    <span className="min-w-[1.75rem] text-center text-[13px] font-bold tabular-nums select-none">{i.qty}</span>
                    <button type="button" onClick={() => setQty(i.id, i.qty + 1)} aria-label="বাড়ান"
                      className="h-6 w-6 grid place-items-center rounded-full text-white bg-gradient-to-b from-brand to-brand-dark hover:brightness-105 active:scale-90 transition-all">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
                    </button>
                  </div>
                </div>

                {/* Line total + remove */}
                <div className="flex flex-col items-end justify-between self-stretch shrink-0">
                  <button type="button" onClick={() => remove(i.id)} aria-label="সরান"
                    className="h-7 w-7 grid place-items-center rounded-full text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M8 6V4a1 1 0 011-1h6a1 1 0 011 1v2m2 0v14a1 1 0 01-1 1H7a1 1 0 01-1-1V6" /></svg>
                  </button>
                  <span className="text-[13px] font-bold text-gray-800 tabular-nums whitespace-nowrap">{taka(i.price * i.qty)}</span>
                </div>
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
