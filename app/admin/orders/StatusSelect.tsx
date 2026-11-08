"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateOrderStatus } from "./actions";

const OPTIONS: { value: string; label: string }[] = [
  { value: "pending", label: "Pending" },
  { value: "confirmed", label: "Confirmed" },
  { value: "processing", label: "Processing" },
  { value: "shipped", label: "Shipped" },
  { value: "delivered", label: "Delivered" },
  { value: "cancelled", label: "Cancelled" },
  { value: "returned", label: "Returned" },
];

export function StatusSelect({ id, value }: { id: string; value: string }) {
  const router = useRouter();
  const [current, setCurrent] = useState(value);
  const [pending, startTransition] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  return (
    <span className="inline-flex flex-col gap-1">
    <select
      value={current}
      disabled={pending}
      onChange={(e) => {
        const next = e.target.value;
        const prev = current;
        setCurrent(next);
        setErr(null);
        startTransition(async () => {
          const r = await updateOrderStatus(id, next);
          // Not confirmed (e.g. CarryBee refused the order) → old status back + the reason.
          if (!r.ok) { setCurrent(prev); setErr(r.error || "Status change failed."); }
          router.refresh();
        });
      }}
      className="dc-input !w-auto !py-1.5 !px-2.5 text-xs font-medium"
    >
      {OPTIONS.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
    {err && <span className="max-w-xs text-[11px] leading-snug" style={{ color: "#b91c1c" }}>{err}</span>}
    </span>
  );
}
