"use client";

import { useEffect, useState } from "react";

function parts(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  return { d: Math.floor(s / 86400), h: Math.floor((s % 86400) / 3600), m: Math.floor((s % 3600) / 60), s: s % 60 };
}

export function FlashCountdown({ endsAt }: { endsAt: string }) {
  const [ms, setMs] = useState<number | null>(null);

  useEffect(() => {
    const target = new Date(endsAt).getTime();
    if (isNaN(target)) return;
    const tick = () => setMs(target - Date.now());
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [endsAt]);

  if (ms === null || ms <= 0) return null; // null avoids hydration mismatch; <=0 hides when ended
  const p = parts(ms);

  const Box = ({ v }: { v: number }) => (
    <span className="min-w-[24px] rounded-md text-white text-[12.5px] font-bold tabular-nums px-1.5 py-0.5 text-center" style={{ background: "#F0530E" }}>
      {String(v).padStart(2, "0")}
    </span>
  );
  const Sep = () => <span className="font-bold" style={{ color: "#F0530E" }}>:</span>;

  return (
    <span className="inline-flex items-center gap-1">
      <span className="text-[11px] font-semibold text-gray-500 mr-0.5">শেষ হতে</span>
      {p.d > 0 && (<><Box v={p.d} /><Sep /></>)}
      <Box v={p.h} /><Sep /><Box v={p.m} /><Sep /><Box v={p.s} />
    </span>
  );
}
