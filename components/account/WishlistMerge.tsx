"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { mergeWishlist } from "@/app/account/wishlist-actions";

/** On first load of the wishlist page, push the guest's localStorage hearts into the
 *  account so nothing is lost after login. Runs at most once per session. */
export function WishlistMerge() {
  const router = useRouter();
  const done = useRef(false);
  useEffect(() => {
    if (done.current) return;
    done.current = true;
    try {
      if (sessionStorage.getItem("dc-wish-merged")) return;
      const ids: string[] = JSON.parse(localStorage.getItem("dc-wish") || "[]");
      if (Array.isArray(ids) && ids.length) {
        mergeWishlist(ids).then(() => {
          sessionStorage.setItem("dc-wish-merged", "1");
          router.refresh();
        }).catch(() => {});
      } else {
        sessionStorage.setItem("dc-wish-merged", "1");
      }
    } catch {}
  }, [router]);
  return null;
}
