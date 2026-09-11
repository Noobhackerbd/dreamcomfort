"use client";

import { useRouter } from "next/navigation";
import { useCart, type CartItem } from "@/lib/cart/store";
import { fireEvent } from "@/components/track";
import { taka } from "@/lib/format";

export function MobileBuyBar({ product, compareAt }: { product: Omit<CartItem, "qty">; compareAt?: number | null }) {
  const router = useRouter();
  const add = useCart((s) => s.add);

  function track() {
    fireEvent("AddToCart", { currency: "BDT", value: product.price, content_ids: [product.id], content_type: "product", contents: [{ id: product.id, quantity: 1, item_price: product.price }], num_items: 1 });
  }

  return (
    <div className="md:hidden fixed inset-x-0 bottom-0 z-[60] bg-white/95 backdrop-blur border-t border-black/10 px-3 py-2.5" style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 10px)" }}>
      <div className="flex items-center gap-2.5">
        <div className="shrink-0">
          <p className="text-lg font-extrabold text-accent-dark leading-none">{taka(product.price)}</p>
          {compareAt && compareAt > product.price && <p className="text-[11px] text-gray-400 line-through leading-none mt-0.5">{taka(compareAt)}</p>}
        </div>
        <button onClick={() => { add(product, 1); track(); }} className="flex-1 rounded-xl border border-brand text-brand py-2.5 text-sm font-semibold">কার্টে</button>
        <button onClick={() => { add(product, 1); track(); router.push("/checkout"); }} className="flex-[1.4] rounded-xl bg-brand text-white py-2.5 text-sm font-bold shadow-sm">অর্ডার করুন</button>
      </div>
    </div>
  );
}
