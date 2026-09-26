"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useCart, CartItem } from "@/lib/cart/store";
import { fireEvent } from "@/components/track";
import { useL } from "@/components/i18n/I18nProvider";
import { T } from "@/components/i18n/T";

export function BuyButtons({ product, nameEn }: { product: Omit<CartItem, "qty">; nameEn?: string }) {
  const { L, lang } = useL();
  const router = useRouter();
  const addRaw = useCart((s) => s.add);
  // Store the name in the language the shopper is using right now (cart/checkout show it).
  const add = (p: Omit<CartItem, "qty">, q: number) => addRaw(lang === "en" && nameEn ? { ...p, name: nameEn } : p, q);
  const [qty, setQty] = useState(1);

  function trackAddToCart(quantity: number) {
    // AddToCart — browser Pixel + server CAPI, shared event_id.
    fireEvent("AddToCart", {
      currency: "BDT",
      value: product.price * quantity,
      content_ids: [product.id],
      content_type: "product",
      contents: [{ id: product.id, quantity, item_price: product.price }],
      num_items: quantity,
    });
  }

  const dec = () => setQty((q) => Math.max(1, q - 1));
  const inc = () => setQty((q) => Math.min(99, q + 1));

  return (
    <div className="space-y-3.5">
      {/* Quantity stepper — premium pill with circular brand controls */}
      <div className="flex items-center gap-3">
        <span className="text-sm font-semibold text-gray-700"><T en="Quantity" bn="পরিমাণ" /></span>
        <div className="inline-flex items-center gap-1 rounded-full border border-black/[0.07] bg-white p-1 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.12)]">
          <button
            type="button"
            onClick={dec}
            disabled={qty <= 1}
            aria-label={L("Decrease", "কমান")}
            className="h-9 w-9 grid place-items-center rounded-full text-brand-dark bg-brand-soft
                       transition-all duration-150 hover:bg-brand hover:text-white active:scale-90
                       disabled:opacity-35 disabled:bg-gray-100 disabled:text-gray-400 disabled:hover:bg-gray-100 disabled:hover:text-gray-400"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round"><path d="M5 12h14" /></svg>
          </button>
          <span className="min-w-[2.5rem] text-center text-[16px] font-extrabold tabular-nums select-none text-gray-800">{qty}</span>
          <button
            type="button"
            onClick={inc}
            disabled={qty >= 99}
            aria-label={L("Increase", "বাড়ান")}
            className="h-9 w-9 grid place-items-center rounded-full text-white bg-gradient-to-b from-brand to-brand-dark
                       shadow-[0_4px_10px_-3px_rgba(47,144,204,0.6)]
                       transition-all duration-150 hover:brightness-105 active:scale-90
                       disabled:opacity-40 disabled:shadow-none"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
          </button>
        </div>
      </div>

      {/* Buy actions */}
      <div className="flex flex-row items-stretch gap-2.5">
        <button
          onClick={() => {
            add(product, qty);
            trackAddToCart(qty);
            router.push("/checkout");
          }}
          className="group relative flex-[1.35] inline-flex items-center justify-center gap-2 rounded-xl px-3 py-3.5 text-sm font-bold text-white overflow-hidden
                     bg-gradient-to-b from-brand to-brand-dark
                     shadow-[0_10px_24px_-8px_rgba(47,144,204,0.55)]
                     transition-all duration-200 hover:shadow-[0_14px_30px_-8px_rgba(47,144,204,0.7)] hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.985]"
        >
          {/* subtle top sheen */}
          <span className="pointer-events-none absolute inset-x-0 top-0 h-1/2 bg-white/15 opacity-60" aria-hidden />
          <svg className="relative shrink-0" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2L4.5 13.5H11l-1 8.5L19.5 10H13z" /></svg>
          <span className="relative whitespace-nowrap"><T en="Order Now" bn="এখনই অর্ডার করুন" /></span>
        </button>
        <button
          onClick={() => {
            add(product, qty);
            trackAddToCart(qty);
          }}
          aria-label={L("Add to cart", "কার্টে যোগ করুন")}
          className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl px-3 py-3.5 text-sm font-bold
                     border-[1.5px] border-brand/70 text-brand-dark bg-brand-soft/40
                     transition-all duration-200 hover:bg-brand-soft hover:border-brand active:scale-[0.985]"
        >
          <svg className="shrink-0" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="21" r="1.4" /><circle cx="19" cy="21" r="1.4" /><path d="M2.5 3h2l2.2 12.4a1.6 1.6 0 001.6 1.3h8.8a1.6 1.6 0 001.6-1.3L21 7H6" /></svg>
          <span className="whitespace-nowrap"><T en="Add to Cart" bn="কার্টে যোগ" /></span>
        </button>
      </div>
    </div>
  );
}
