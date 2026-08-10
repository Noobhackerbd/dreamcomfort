"use client";

import Image from "next/image";
import { useCart } from "@/lib/cart/store";
import { taka } from "@/lib/format";
import { DELIVERY_CHARGE } from "@/lib/config";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function CartPage() {
  const router = useRouter();
  const { items, setQty, remove, subtotal } = useCart();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) return null;

  if (items.length === 0) {
    return (
      <div className="text-center py-20">
        <p className="text-lg text-gray-500">আপনার কার্ট খালি।</p>
        <a
          href="/"
          className="inline-block mt-5 rounded-lg bg-brand text-white px-6 py-3"
        >
          কেনাকাটা শুরু করুন
        </a>
      </div>
    );
  }

  const sub = subtotal();
  const total = sub + DELIVERY_CHARGE;

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-bold mb-6">আপনার কার্ট</h1>

      <div className="space-y-4">
        {items.map((i) => (
          <div
            key={i.id}
            className="flex items-center gap-4 rounded-xl border bg-white p-3"
          >
            <div className="relative h-16 w-16 rounded-lg bg-gray-100 overflow-hidden flex items-center justify-center shrink-0">
              {i.image ? (
                <Image src={i.image} alt={i.name} fill sizes="64px" className="object-cover" />
              ) : (
                <span className="text-[10px] text-gray-400 text-center px-1">{i.name}</span>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{i.name}</p>
              <p className="text-brand font-semibold">{taka(i.price)}</p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setQty(i.id, i.qty - 1)}
                className="h-8 w-8 rounded border text-lg leading-none"
              >
                −
              </button>
              <span className="w-6 text-center">{i.qty}</span>
              <button
                onClick={() => setQty(i.id, i.qty + 1)}
                className="h-8 w-8 rounded border text-lg leading-none"
              >
                +
              </button>
            </div>

            <button
              onClick={() => remove(i.id)}
              className="text-red-500 text-sm ml-2"
            >
              সরান
            </button>
          </div>
        ))}
      </div>

      <div className="mt-6 rounded-xl border bg-white p-4 space-y-2">
        <div className="flex justify-between text-sm">
          <span>সাবটোটাল</span>
          <span>{taka(sub)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span>ডেলিভারি চার্জ</span>
          <span>{taka(DELIVERY_CHARGE)}</span>
        </div>
        <div className="flex justify-between font-bold text-lg border-t pt-2">
          <span>সর্বমোট</span>
          <span className="text-brand">{taka(total)}</span>
        </div>
      </div>

      <button
        onClick={() => router.push("/checkout")}
        className="mt-5 w-full rounded-lg bg-brand text-white px-6 py-3 font-medium hover:bg-brand-dark"
      >
        চেকআউট করুন
      </button>
    </div>
  );
}
