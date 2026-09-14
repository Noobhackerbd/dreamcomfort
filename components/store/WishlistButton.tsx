"use client";

import { useEffect, useState } from "react";

/** Single heart icon — toggles this product in the wishlist (localStorage + account sync). */
export function WishlistButton({ id, className }: { id: string; className?: string }) {
  const [wish, setWish] = useState(false);

  useEffect(() => {
    try { setWish(JSON.parse(localStorage.getItem("dc-wish") || "[]").includes(id)); } catch {}
  }, [id]);

  function toggle() {
    setWish((w) => {
      const nw = !w;
      try {
        const arr: string[] = JSON.parse(localStorage.getItem("dc-wish") || "[]");
        const next = nw ? Array.from(new Set([...arr, id])) : arr.filter((x) => x !== id);
        localStorage.setItem("dc-wish", JSON.stringify(next));
      } catch {}
      import("@/app/account/wishlist-actions").then((m) => m.toggleWishlist(id, nw)).catch(() => {});
      return nw;
    });
  }

  return (
    <button onClick={toggle} aria-label="উইশলিস্ট" title="উইশলিস্টে যোগ করুন"
      className={className || "shrink-0 h-[50px] w-[50px] grid place-items-center rounded-lg border border-black/10 bg-white hover:border-accent transition"}>
      <svg width="34" height="34" viewBox="0 0 24 24" fill={wish ? "#E0699A" : "none"} stroke={wish ? "#E0699A" : "#9a94a1"} strokeWidth="1.7">
        <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z" />
      </svg>
    </button>
  );
}
