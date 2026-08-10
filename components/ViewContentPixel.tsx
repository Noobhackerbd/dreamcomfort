"use client";

import { useEffect, useRef } from "react";
import { fireEvent } from "@/components/track";

/** Fires ViewContent (browser + server) once when a product page mounts. */
export function ViewContentPixel({
  id,
  value,
  name,
}: {
  id: string;
  value: number;
  name: string;
}) {
  const fired = useRef(false);
  useEffect(() => {
    if (fired.current) return;
    fired.current = true;
    fireEvent("ViewContent", {
      currency: "BDT",
      value,
      content_ids: [id],
      content_type: "product",
      content_name: name,
      contents: [{ id, quantity: 1, item_price: value }],
    });
  }, [id, value, name]);
  return null;
}
