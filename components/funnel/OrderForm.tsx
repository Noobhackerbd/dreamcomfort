"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { placeOrder } from "@/app/checkout/actions";
import { fireEvent } from "@/components/track";
import { taka } from "@/lib/format";
import { playTick, playPop, playConfirm, playError } from "@/lib/sound";
import type { Variant } from "@/lib/types";
import type { DeliveryArea } from "@/lib/config";

interface Props {
  productId: string;
  productName: string;
  basePrice: number;
  baseCompare?: number | null;
  baseImage?: string;
  images?: string[];
  variants: Variant[];
  hasOptions?: boolean;
  shipping: { inside: number; outside: number };
  ctaText: string;
}

export function OrderForm({
  productId,
  productName,
  basePrice,
  baseCompare,
  baseImage,
  images = [],
  variants,
  hasOptions = false,
  shipping,
  ctaText,
}: Props) {
  const router = useRouter();
  const [variantId, setVariantId] = useState<string>(variants[0]?.id ?? "");
  const [qty, setQty] = useState(1);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const deliveryArea: DeliveryArea = "inside";
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [invalid, setInvalid] = useState({ name: false, phone: false, address: false });
  const [shakeKey, setShakeKey] = useState(0);
  const [zoomIdx, setZoomIdx] = useState<number | null>(null);
  const initiated = useRef(false);

  const gallery = images.length ? images : baseImage ? [baseImage] : [];
  const thumb = gallery[0];

  const selected = variants.find((v) => v.id === variantId);
  const unitPrice = selected ? selected.price : basePrice;
  const unitCompare = selected ? selected.compare_at_price ?? null : baseCompare ?? null;
  const subtotal = unitPrice * qty;
  const shippingFee = shipping.inside;
  const total = subtotal + shippingFee;
  const freeDelivery = shipping.inside === 0 && shipping.outside === 0;

  function markInitiated() {
    if (initiated.current) return;
    initiated.current = true;
    fireEvent("InitiateCheckout", {
      currency: "BDT",
      value: total,
      num_items: qty,
      content_ids: [productId],
      content_type: "product",
    });
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const phoneDigits = phone.replace(/\D/g, "");
    const bad = {
      name: !name.trim(),
      phone: !/^01\d{9}$/.test(phoneDigits),
      address: address.trim().length < 5,
    };

    if (bad.name || bad.phone || bad.address) {
      setInvalid(bad);
      setShakeKey((k) => k + 1);
      playError();
      const firstId = bad.name ? "dc-name" : bad.phone ? "dc-phone" : "dc-address";
      const el = document.getElementById(firstId);
      el?.scrollIntoView({ behavior: "smooth", block: "center" });
      setTimeout(() => el?.focus(), 200);
      return;
    }

    setInvalid({ name: false, phone: false, address: false });
    playConfirm();

    const fbclid =
      typeof window !== "undefined"
        ? new URLSearchParams(window.location.search).get("fbclid") ?? undefined
        : undefined;

    setSubmitting(true);
    const res = await placeOrder({
      name,
      phone,
      address,
      deliveryArea,
      items: [{ id: productId, qty, variantId: variantId || undefined }],
      fbclid,
    });
    if (!res.ok) {
      setSubmitting(false);
      return setError(res.error ?? "অর্ডার ব্যর্থ হয়েছে।");
    }
    // keep the loading overlay visible while we navigate to the thank-you page
    router.push(`/order/${res.orderNumber}`);
  }

  const fieldCls = (bad: boolean) =>
    "w-full rounded-2xl border px-4 py-3 outline-none transition " +
    (bad
      ? "border-red-400 bg-red-50/50 ring-4 ring-red-100 dc-shake"
      : "border-brand/20 bg-white focus:border-brand focus:ring-4 focus:ring-brand/10");

  return (
    <form
      id="order-form"
      onSubmit={onSubmit}
      onFocusCapture={markInitiated}
      className="rounded-[2rem] border border-white bg-white/80 backdrop-blur p-5 md:p-6 shadow-soft ring-1 ring-brand/10"
    >
      <div className="flex items-center gap-2 mb-4">
        <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-brand to-accent text-white">🛒</span>
        <h3 className="font-display text-lg font-bold">অর্ডার করতে ফর্মটি পূরণ করুন</h3>
      </div>

      {variants.length > 0 && (
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">রং / মডেল বেছে নিন</label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {variants.map((v) => {
              const on = v.id === variantId;
              return (
                <button
                  type="button"
                  key={v.id}
                  onClick={() => { setVariantId(v.id); playTick(); markInitiated(); }}
                  className={
                    "flex items-center gap-2 rounded-2xl border p-2 text-left transition " +
                    (on ? "border-accent ring-4 ring-accent/15 bg-accent-soft" : "border-brand/15 hover:border-brand/40")
                  }
                >
                  {v.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={v.image} alt={v.label} className="h-10 w-10 rounded-xl object-cover" />
                  ) : (
                    <span className="h-10 w-10 rounded-xl bg-gradient-to-br from-brand-light to-accent-light" />
                  )}
                  <span className="min-w-0">
                    <span className="block text-sm font-medium truncate">{v.label}</span>
                    <span className="block text-xs text-accent-dark font-bold">{taka(v.price)}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="mb-4 flex items-center justify-between">
        <label className="text-sm font-medium">পরিমাণ</label>
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => { setQty((q) => Math.max(1, q - 1)); playPop(); }} className="h-9 w-9 rounded-xl border border-brand/20 text-lg hover:bg-brand-soft">−</button>
          <span className="w-8 text-center font-bold">{qty}</span>
          <button type="button" onClick={() => { setQty((q) => q + 1); playPop(); }} className="h-9 w-9 rounded-xl border border-brand/20 text-lg hover:bg-brand-soft">+</button>
        </div>
      </div>

      <div className="space-y-3">
        <div>
          <input
            id="dc-name"
            value={name}
            onChange={(e) => { setName(e.target.value); if (invalid.name) setInvalid((v) => ({ ...v, name: false })); }}
            placeholder="আপনার নাম *"
            className={fieldCls(invalid.name)}
          />
          {invalid.name && <p className="mt-1 text-xs text-red-600">⚠️ আপনার নাম লিখুন</p>}
        </div>
        <div>
          <input
            id="dc-phone"
            value={phone}
            onChange={(e) => { setPhone(e.target.value); if (invalid.phone) setInvalid((v) => ({ ...v, phone: false })); }}
            inputMode="numeric"
            placeholder="মোবাইল নম্বর (০১XXXXXXXXX) *"
            className={fieldCls(invalid.phone)}
          />
          {invalid.phone && <p className="mt-1 text-xs text-red-600">⚠️ সঠিক ১১ ডিজিটের মোবাইল নম্বর দিন</p>}
        </div>
        <div>
          <textarea
            id="dc-address"
            value={address}
            onChange={(e) => { setAddress(e.target.value); if (invalid.address) setInvalid((v) => ({ ...v, address: false })); }}
            rows={2}
            placeholder="সম্পূর্ণ ঠিকানা *"
            className={fieldCls(invalid.address)}
          />
          {invalid.address && <p className="mt-1 text-xs text-red-600">⚠️ সম্পূর্ণ ঠিকানা লিখুন</p>}
        </div>
      </div>

      <div className="mt-4 rounded-2xl bg-cream-deep/60 p-4 text-sm space-y-1.5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            {thumb && (
              <button
                type="button"
                onClick={() => setZoomIdx(0)}
                className="shrink-0 relative group"
                title="ছবি বড় করে দেখুন"
              >
                <Image src={thumb} alt={productName} width={44} height={44} sizes="44px" className="h-11 w-11 rounded-lg object-cover ring-1 ring-black/10 group-hover:ring-accent transition" />
                <span className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full bg-white text-[9px] flex items-center justify-center shadow ring-1 ring-black/5">🔍</span>
              </button>
            )}
            <span className="text-gray-600 truncate">{productName}{selected ? ` — ${selected.label}` : ""} × {qty}</span>
          </div>
          <span className="shrink-0">{taka(subtotal)}</span>
        </div>
        {hasOptions && (
          <button
            type="button"
            onClick={() => {
              playTick();
              document.getElementById("product-picker")?.scrollIntoView({ behavior: "smooth", block: "center" });
            }}
            className="text-xs text-brand-dark underline underline-offset-2 hover:text-accent-dark"
          >
            🔄 পণ্য পরিবর্তন করুন
          </button>
        )}
        <div className="flex justify-between">
          <span className="text-gray-500">ডেলিভারি</span>
          <span>{shippingFee === 0 ? "ফ্রি 🎉" : taka(shippingFee)}</span>
        </div>
        <div className="flex justify-between border-t border-black/5 pt-2 text-base font-bold">
          <span>সর্বমোট</span>
          <span className="text-accent-dark">{taka(total)}</span>
        </div>
        {unitCompare && unitCompare > unitPrice && (
          <p className="text-xs text-green-600">🎁 আপনি সাশ্রয় করছেন {taka((unitCompare - unitPrice) * qty)}!</p>
        )}
      </div>

      {error && (
        <p
          key={shakeKey}
          className="dc-shake mt-3 rounded-2xl bg-red-50 border border-red-300 text-red-700 px-4 py-2.5 text-sm font-semibold flex items-center gap-2"
        >
          <span className="text-lg">⚠️</span> {error}
        </p>
      )}

      <button
        id="order-submit"
        type="submit"
        disabled={submitting}
        className="dc-pulse mt-4 w-full rounded-2xl bg-accent-dark text-white px-6 py-4 text-lg font-extrabold shadow-[0_12px_30px_-6px_rgba(231,123,166,0.95)] ring-2 ring-white hover:bg-accent transition disabled:opacity-60 flex items-center justify-center gap-2"
      >
        {submitting ? (
          "অর্ডার হচ্ছে..."
        ) : (
          <>
            <span className="text-2xl">🛒</span>
            <span>{ctaText}</span>
            <span className="rounded-full bg-white/25 px-2 py-0.5 text-base">{taka(total)}</span>
          </>
        )}
      </button>
      <p className="mt-2 text-center text-xs text-gray-400">
        💵 ক্যাশ অন ডেলিভারি {freeDelivery ? "· ফ্রি ডেলিভারি" : ""} · অর্ডারের পর কল করে কনফার্ম করা হবে
      </p>

      {/* Premium "confirming your order" loading overlay */}
      {submitting && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-cream/80 backdrop-blur-md">
          {/* floating hearts */}
          <div aria-hidden className="absolute inset-0 overflow-hidden pointer-events-none">
            {["💙", "💗", "💙", "💗", "💙", "💗", "💙", "💗"].map((h, i) => (
              <span
                key={i}
                className="absolute text-2xl"
                style={{ left: `${5 + i * 12}%`, bottom: "-30px", animation: `dc-heart ${6 + (i % 4)}s linear ${i * 0.45}s infinite`, opacity: 0.6 }}
              >
                {h}
              </span>
            ))}
          </div>

          <div className="relative rounded-[2rem] bg-white/85 backdrop-blur-xl shadow-soft ring-1 ring-brand/15 px-9 py-10 text-center">
            {/* conic gradient ring spinner with logo in the middle */}
            <div className="relative mx-auto h-28 w-28">
              <div
                className="absolute inset-0 rounded-full animate-spin"
                style={{
                  background: "conic-gradient(from 0deg, #5FB4E4, #F0A0C0, #BFE3F5, #5FB4E4)",
                  WebkitMask: "radial-gradient(farthest-side, transparent calc(100% - 9px), #000 calc(100% - 9px))",
                  mask: "radial-gradient(farthest-side, transparent calc(100% - 9px), #000 calc(100% - 9px))",
                  animationDuration: "1.1s",
                }}
              />
              <div className="absolute inset-[11px] rounded-full bg-white flex items-center justify-center shadow-inner">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/logo.png" alt="" className="h-16 w-16 object-contain dc-float" />
              </div>
            </div>

            <p className="mt-6 font-display text-xl font-bold text-accent-dark">আপনার অর্ডার নিশ্চিত হচ্ছে</p>
            <div className="mt-3 flex justify-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-accent animate-bounce" style={{ animationDelay: "0ms" }} />
              <span className="h-2.5 w-2.5 rounded-full bg-brand animate-bounce" style={{ animationDelay: "150ms" }} />
              <span className="h-2.5 w-2.5 rounded-full bg-accent animate-bounce" style={{ animationDelay: "300ms" }} />
            </div>
            <p className="mt-3 text-sm text-gray-500">একটু অপেক্ষা করুন 💕</p>

            {/* indeterminate progress */}
            <div className="mt-5 h-1.5 w-52 mx-auto rounded-full bg-brand-soft overflow-hidden">
              <div className="h-full w-1/3 rounded-full bg-gradient-to-r from-brand to-accent" style={{ animation: "dc-progress 1.3s ease-in-out infinite" }} />
            </div>
          </div>
        </div>
      )}

      {/* Image popup / lightbox */}
      {zoomIdx !== null && gallery[zoomIdx] && (
        <div
          onClick={() => setZoomIdx(null)}
          className="fixed inset-0 z-[70] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <div className="relative w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={gallery[zoomIdx]} alt={productName} className="w-full max-h-[80vh] object-contain rounded-2xl bg-white shadow-2xl" />
            <button
              type="button"
              onClick={() => setZoomIdx(null)}
              className="absolute -top-3 -right-3 h-9 w-9 rounded-full bg-white text-gray-700 text-xl shadow-lg"
            >
              ×
            </button>
            {gallery.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={() => setZoomIdx((z) => (z! - 1 + gallery.length) % gallery.length)}
                  className="absolute left-2 top-1/2 -translate-y-1/2 h-11 w-11 rounded-full bg-white/90 text-gray-700 text-2xl shadow flex items-center justify-center"
                >
                  ‹
                </button>
                <button
                  type="button"
                  onClick={() => setZoomIdx((z) => (z! + 1) % gallery.length)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 h-11 w-11 rounded-full bg-white/90 text-gray-700 text-2xl shadow flex items-center justify-center"
                >
                  ›
                </button>
                <div className="mt-3 flex justify-center gap-2 flex-wrap">
                  {gallery.map((g, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setZoomIdx(idx)}
                      className={"h-14 w-14 rounded-lg overflow-hidden ring-2 " + (idx === zoomIdx ? "ring-accent" : "ring-white/60")}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={g} alt="" className="h-full w-full object-cover" />
                    </button>
                  ))}
                </div>
              </>
            )}
            <p className="mt-2 text-center text-white/80 text-xs">ছবি বন্ধ করতে বাইরে ট্যাপ করুন</p>
          </div>
        </div>
      )}
    </form>
  );
}
