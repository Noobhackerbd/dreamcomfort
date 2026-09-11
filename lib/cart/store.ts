// lib/cart/store.ts — client-side cart (persists to localStorage).
"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface CartItem {
  id: string;      // product id
  slug: string;
  name: string;    // display name (Bangla preferred)
  price: number;
  image?: string;
  qty: number;
}

interface CartState {
  items: CartItem[];
  drawerOpen: boolean;
  openDrawer: () => void;
  closeDrawer: () => void;
  add: (item: Omit<CartItem, "qty">, qty?: number) => void;
  remove: (id: string) => void;
  setQty: (id: string, qty: number) => void;
  clear: () => void;
  count: () => number;
  subtotal: () => number;
}

export const useCart = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      drawerOpen: false,
      openDrawer: () => set({ drawerOpen: true }),
      closeDrawer: () => set({ drawerOpen: false }),
      add: (item, qty = 1) =>
        set((s) => {
          const existing = s.items.find((i) => i.id === item.id);
          const items = existing
            ? s.items.map((i) => (i.id === item.id ? { ...i, qty: i.qty + qty } : i))
            : [...s.items, { ...item, qty }];
          return { items, drawerOpen: true };
        }),
      remove: (id) => set((s) => ({ items: s.items.filter((i) => i.id !== id) })),
      setQty: (id, qty) =>
        set((s) => ({
          items: s.items
            .map((i) => (i.id === id ? { ...i, qty: Math.max(1, qty) } : i))
            .filter((i) => i.qty > 0),
        })),
      clear: () => set({ items: [] }),
      count: () => get().items.reduce((n, i) => n + i.qty, 0),
      subtotal: () => get().items.reduce((sum, i) => sum + i.price * i.qty, 0),
    }),
    { name: "dc-cart", partialize: (s) => ({ items: s.items }) }
  )
);

// Re-export the formatter from the plain (non-client) module so existing
// `import { taka } from "@/lib/cart/store"` in CLIENT components keeps working.
// Server components should import { taka } from "@/lib/format" directly.
export { taka } from "@/lib/format";
