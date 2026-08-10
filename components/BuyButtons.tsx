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
    <div className="flex flex-col sm:flex-row gap-3">
      <button
        onClick={() => {
          add(product, 1);
          trackAddToCart();
          router.push("/checkout");
        }}
        className="rounded-lg bg-brand text-white px-8 py-3 font-medium hover:bg-brand-dark"
      >
        এখনি অর্ডার করুন (ক্যাশ অন ডেলিভারি)
      </button>
      <button
        onClick={() => {
          add(product, 1);
          trackAddToCart();
        }}
        className="rounded-lg border border-brand text-brand px-8 py-3 font-medium hover:bg-brand/5"
      >
        কার্টে যোগ করুন
      </button>
    </div>
  );
}
