"use client";

import Image from "next/image";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useCart } from "@/lib/cart/store";
import { taka } from "@/lib/format";

export function CartDrawer() {
  const router = useRouter();
  const pathname = usePathname() || "/";
  const open = useCart((s) => s.drawerOpen);
  const close = useCart((s) => s.closeDrawer);
  const items = useCart((s) => s.items);
  const setQty = useCart((s) => s.setQty);
  const remove = useCart((s) => s.remove);
  const subtotal = useCart((s) => s.subtotal());
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Lock scroll while open.
  useEffect(() => {
    if (open) { document.body.style.overflow = "hidden"; return () => { document.body.style.overflow = ""; }; }
  }, [open]);

  // Never over the checkout/order/admin/landing flows.
  const hidden = /^\/(admin|order|landing|checkout|worker)(\/|$)/.test(pathname);
  if (!mounted || hidden) return null;

  return (
    <>
      {/* backdrop */}
      <div onClick={close} className={"fixed inset-0 z-[92] bg-black/40 transition-opacity duration-300 " + (open ? "opacity-100" : "opacity-0 pointer-events-none")} />
      {/* panel */}
      <aside className={"fixed top-0 right-0 z-[93] h-full w-[90%] max-w-md bg-white shadow-2xl flex flex-col transition-transform duration-300 " + (open ? "translate-x-0" : "translate-x-full")}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-black/5">
          <h2 className="font-display text-lg font-bold">আপনার কার্ট</h2>
          <button onClick={close} aria-label="close" className="h-9 w-9 grid place-items-center rounded-full hover:bg-black/5 text-xl text-gray-500">×</button>
        </div>

        {items.length === 0 ? (
          <div className="flex-1 grid place-items-center px-6 text-center">
            <div>
              <div className="mx-auto mb-3 h-16 w-16 rounded-full bg-gray-100 grid place-items-center">
                <svg viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.6" className="h-8 w-8"><path d="M6 6h15l-1.5 9h-12z" /><path d="M6 6L5 3H2" /><circle cx="9" cy="20" r="1.4" /><circle cx="18" cy="20" r="1.4" /></svg>
              </div>
              <p className="text-gray-500">আপনার কার্ট খালি।</p>
              <button onClick={close} className="mt-4 rounded-xl bg-brand text-white px-5 py-2.5 text-sm font-semibold hover:bg-brand-dark">শপিং চালিয়ে যান</button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
              {items.map((it) => (
                <div key={it.id} className="flex gap-3">
                  <span className="relative h-16 w-16 rounded-xl overflow-hidden bg-gray-100 ring-1 ring-black/5 shrink-0">
                    {it.image && <Image src={it.image} alt="" fill sizes="64px" className="object-cover" />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900 line-clamp-2">{it.name}</p>
                    <p className="text-sm font-bold text-accent-dark mt-0.5">{taka(it.price)}</p>
                    <div className="mt-1.5 flex items-center gap-2">
                      <div className="inline-flex items-center rounded-lg ring-1 ring-black/10 overflow-hidden">
                        <button onClick={() => setQty(it.id, it.qty - 1)} className="h-7 w-7 grid place-items-center text-gray-600 hover:bg-gray-50">−</button>
                        <span className="w-8 text-center text-sm tabular-nums">{it.qty}</span>
                        <button onClick={() => setQty(it.id, it.qty + 1)} className="h-7 w-7 grid place-items-center text-gray-600 hover:bg-gray-50">+</button>
                      </div>
                      <button onClick={() => remove(it.id)} className="text-xs text-red-500 hover:underline">রিমুভ</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t border-black/5 px-5 py-4 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">সাবটোটাল</span>
                <span className="font-bold text-gray-900">{taka(subtotal)}</span>
              </div>
              <p className="text-[11px] text-gray-400">ডেলিভারি চার্জ চেকআউটে আপনার এলাকা অনুযায়ী যোগ হবে।</p>
              <button onClick={() => { close(); router.push("/checkout"); }} className="w-full rounded-xl bg-brand text-white py-3.5 font-semibold shadow-sm hover:bg-brand-dark transition">চেকআউট · {taka(subtotal)}</button>
              <button onClick={close} className="w-full text-center text-sm font-medium text-gray-500 hover:text-gray-700">শপিং চালিয়ে যান</button>
            </div>
          </>
        )}
      </aside>
    </>
  );
}
