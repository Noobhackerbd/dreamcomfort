"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/lib/cart/store";
import { taka } from "@/lib/format";
import { SHIPPING, type DeliveryArea } from "@/lib/config";
import { placeOrder } from "./actions";
import { fireEvent } from "@/components/track";

export default function CheckoutPage() {
  const router = useRouter();
  const { items, subtotal, clear } = useCart();
  const [mounted, setMounted] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [notes, setNotes] = useState("");
  const [deliveryArea, setDeliveryArea] = useState<DeliveryArea>("inside");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => setMounted(true), []);

  const shippingFee = deliveryArea === "outside" ? SHIPPING.outsideDhaka : SHIPPING.insideDhaka;

  // Fire InitiateCheckout (browser + server) once when the checkout loads with items.
  useEffect(() => {
    if (mounted && items.length > 0) {
      fireEvent("InitiateCheckout", {
        currency: "BDT",
        value: subtotal() + shippingFee,
        num_items: items.length,
        content_ids: items.map((i) => i.id),
        content_type: "product",
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted]);

  if (!mounted) return null;

  if (items.length === 0) {
    return (
      <div className="text-center py-20">
        <p className="text-lg text-gray-500">আপনার কার্ট খালি।</p>
        <a href="/" className="inline-block mt-5 rounded-lg bg-brand text-white px-6 py-3">
          কেনাকাটা শুরু করুন
        </a>
      </div>
    );
  }

  const sub = subtotal();
  const total = sub + shippingFee;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const phoneDigits = phone.replace(/\D/g, "");
    if (!name.trim()) return setError("নাম লিখুন।");
    if (!/^01\d{9}$/.test(phoneDigits)) return setError("সঠিক মোবাইল নম্বর লিখুন (০১XXXXXXXXX)।");
    if (address.trim().length < 5) return setError("সম্পূর্ণ ঠিকানা লিখুন।");

    const fbclid =
      typeof window !== "undefined"
        ? new URLSearchParams(window.location.search).get("fbclid") ?? undefined
        : undefined;

    setSubmitting(true);
    const res = await placeOrder({
      name,
      phone,
      address,
      city,
      deliveryArea,
      notes,
      items: items.map((i) => ({ id: i.id, qty: i.qty })),
      fbclid,
    });
    setSubmitting(false);

    if (!res.ok) {
      setError(res.error ?? "অর্ডার ব্যর্থ হয়েছে।");
      return;
    }
    clear();
    router.push(`/order/${res.orderNumber}`);
  }

  const inputCls = "w-full rounded-lg border px-4 py-3 outline-none focus:border-brand";

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold mb-6">চেকআউট</h1>

      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="block text-sm mb-1">আপনার নাম *</label>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="আপনার নাম লিখুন" className={inputCls} />
        </div>

        <div>
          <label className="block text-sm mb-1">মোবাইল নম্বর *</label>
          <input value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="numeric" placeholder="০১XXXXXXXXX" className={inputCls} />
        </div>

        <div>
          <label className="block text-sm mb-1">সম্পূর্ণ ঠিকানা *</label>
          <textarea value={address} onChange={(e) => setAddress(e.target.value)} rows={3} placeholder="বাসা/হোল্ডিং, রোড, এলাকা, থানা" className={inputCls} />
        </div>

        <div>
          <label className="block text-sm mb-1">এলাকা / জেলা</label>
          <input value={city} onChange={(e) => setCity(e.target.value)} placeholder="যেমন: ঢাকা, চট্টগ্রাম" className={inputCls} />
        </div>

        <div>
          <label className="block text-sm mb-1">ডেলিভারি এলাকা</label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setDeliveryArea("inside")}
              className={
                "rounded-lg border px-4 py-3 text-sm " +
                (deliveryArea === "inside" ? "border-brand bg-brand/5 text-brand font-medium" : "")
              }
            >
              ঢাকার ভিতরে · {taka(SHIPPING.insideDhaka)}
            </button>
            <button
              type="button"
              onClick={() => setDeliveryArea("outside")}
              className={
                "rounded-lg border px-4 py-3 text-sm " +
                (deliveryArea === "outside" ? "border-brand bg-brand/5 text-brand font-medium" : "")
              }
            >
              ঢাকার বাইরে · {taka(SHIPPING.outsideDhaka)}
            </button>
          </div>
        </div>

        <div>
          <label className="block text-sm mb-1">অর্ডার নোট (ঐচ্ছিক)</label>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="বিশেষ কোনো নির্দেশনা থাকলে লিখুন" className={inputCls} />
        </div>

        {/* Order summary */}
        <div className="rounded-xl border bg-white p-4 space-y-2">
          {items.map((i) => (
            <div key={i.id} className="flex justify-between text-sm">
              <span className="truncate pr-2">
                {i.name} × {i.qty}
              </span>
              <span>{taka(i.price * i.qty)}</span>
            </div>
          ))}
          <div className="flex justify-between text-sm border-t pt-2">
            <span>ডেলিভারি চার্জ</span>
            <span>{taka(shippingFee)}</span>
          </div>
          <div className="flex justify-between font-bold text-lg border-t pt-2">
            <span>সর্বমোট</span>
            <span className="text-brand">{taka(total)}</span>
          </div>
        </div>

        {error && (
          <p className="rounded-lg bg-red-50 border border-red-200 text-red-700 px-4 py-2 text-sm">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-lg bg-brand text-white px-6 py-3 font-medium hover:bg-brand-dark disabled:opacity-60"
        >
          {submitting ? "অর্ডার হচ্ছে..." : "অর্ডার নিশ্চিত করুন (ক্যাশ অন ডেলিভারি)"}
        </button>
        <p className="text-center text-xs text-gray-400">
          অর্ডার করার পর আমরা কল করে নিশ্চিত করব।
        </p>
      </form>
    </div>
  );
}
