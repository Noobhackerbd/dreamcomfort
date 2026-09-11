// Premium vertical order-tracking timeline. Derives the current step from the order's
// main status + its CarryBee courier_status (set by the courier-status cron).

const STEPS = [
  { key: "received", label: "অর্ডার গৃহীত", sub: "আমরা আপনার অর্ডার পেয়েছি" },
  { key: "confirmed", label: "কনফার্মড", sub: "কল করে নিশ্চিত করা হয়েছে" },
  { key: "processing", label: "প্রসেসিং", sub: "প্রস্তুত করা হচ্ছে" },
  { key: "packed", label: "প্যাকড", sub: "কুরিয়ারের জন্য প্যাক" },
  { key: "shipped", label: "শিপড", sub: "কুরিয়ারে পাঠানো হয়েছে" },
  { key: "out", label: "ডেলিভারিতে", sub: "আপনার এলাকায় পৌঁছেছে" },
  { key: "delivered", label: "ডেলিভারড", sub: "সফলভাবে ডেলিভার হয়েছে" },
];

function stepIndex(status: string, courier?: string | null): number {
  if (status === "delivered" || courier === "delivered") return 6;
  if (courier === "in_transit") return 5;
  if (status === "shipped") return 4;
  if (courier === "pickup_requested") return 3;
  if (status === "processing") return 2;
  if (status === "confirmed") return 1;
  return 0;
}

export function OrderTimeline({ status, courierStatus }: { status: string; courierStatus?: string | null }) {
  if (status === "cancelled") {
    return <div className="rounded-2xl bg-red-50 text-red-700 px-4 py-3 text-sm font-medium">এই অর্ডারটি বাতিল করা হয়েছে।</div>;
  }
  if (status === "returned") {
    return <div className="rounded-2xl px-4 py-3 text-sm font-medium" style={{ background: "#fdeede", color: "#ea580c" }}>এই অর্ডারটি রিটার্ন হয়েছে।</div>;
  }
  const current = stepIndex(status, courierStatus);

  return (
    <ol className="relative">
      {STEPS.map((s, i) => {
        const done = i < current;
        const active = i === current;
        const color = done || active ? "#16a34a" : "#d1d5db";
        return (
          <li key={s.key} className="relative flex gap-4 pb-6 last:pb-0">
            {/* connector line */}
            {i < STEPS.length - 1 && (
              <span className="absolute left-[11px] top-6 bottom-0 w-0.5" style={{ background: i < current ? "#16a34a" : "#e5e7eb" }} />
            )}
            {/* dot */}
            <span className="relative z-10 mt-0.5 h-6 w-6 shrink-0 rounded-full grid place-items-center"
              style={{ background: done ? "#16a34a" : active ? "#e7f6ec" : "#f3f4f6", boxShadow: active ? "0 0 0 4px #e7f6ec" : "none" }}>
              {done ? (
                <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" className="h-3.5 w-3.5"><path d="M5 13l4 4L19 7" /></svg>
              ) : (
                <span className="h-2 w-2 rounded-full" style={{ background: active ? "#16a34a" : "#c7cbd1" }} />
              )}
            </span>
            <div className="min-w-0">
              <p className="font-semibold text-[15px]" style={{ color: done || active ? "#111827" : "#9ca3af" }}>{s.label}</p>
              <p className="text-xs mt-0.5" style={{ color: active ? "#16a34a" : "#9ca3af" }}>{active ? "এখন এখানে" : s.sub}</p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
