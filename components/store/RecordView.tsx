"use client";

import { useEffect } from "react";

/** Records a product view in localStorage (most-recent-first, deduped, capped) so the
 *  account dashboard can show "Recently viewed". Per-device by design. */
export function RecordView({ id }: { id: string }) {
  useEffect(() => {
    if (!id) return;
    try {
      const key = "dc-recent";
      const arr: string[] = JSON.parse(localStorage.getItem(key) || "[]");
      const next = [id, ...arr.filter((x) => x !== id)].slice(0, 24);
      localStorage.setItem(key, JSON.stringify(next));
    } catch {}
  }, [id]);
  return null;
}
