"use client";

import { useRouter } from "next/navigation";
import { useCart, CartItem } from "@/lib/cart/store";
import { fireEvent } from "@/components/track";

export function BuyButtons({ product }: { product: Omit<CartItem, "qty"> }) {
  const router = useRouter();
  const add = useCart((s) => s.add);

  function trackAddToCart() {
    // AddToCart — browser Pixel + server CAPI, shared event_id.
    fireEvent("AddToCart", {
      currency: "BDT",
      value: product.price,
      content_ids: [product.id],
      content_type: "product",
      contents: [{ id: product.id, quantity: 1, item_price: product.price }],
      num_items: 1,
    });
  }

  return (
    <div className="flex flex-row items-stretch gap-2">
      <button
        onClick={() => {
          add(product, 1);
          trackAddToCart();
          router.push("/checkout");
        }}
        className="flex-1 rounded-lg bg-brand text-white px-2 py-2 text-[12px] font-semibold hover:bg-brand-dark whitespace-nowrap"
      >
        অর্ডার করুন
      </button>
      <button
        onClick={() => {
          add(product, 1);
          trackAddToCart();
        }}
        className="flex-1 rounded-lg border border-brand text-brand px-2 py-2 text-[12px] font-semibold hover:bg-brand/5 whitespace-nowrap"
      >
        কার্টে যোগ
      </button>
    </div>
  );
}
