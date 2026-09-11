// Small Bengali status badge for customer-facing order lists / details.

const META: Record<string, { label: string; bg: string; fg: string }> = {
  pending: { label: "পেন্ডিং", bg: "#fef3e2", fg: "#b45309" },
  confirmed: { label: "কনফার্মড", bg: "#e8eefc", fg: "#2563eb" },
  processing: { label: "প্রসেসিং", bg: "#f0e9fc", fg: "#7c3aed" },
  shipped: { label: "শিপড", bg: "#e2f3f7", fg: "#0e7490" },
  delivered: { label: "ডেলিভারড", bg: "#e7f6ec", fg: "#16a34a" },
  cancelled: { label: "বাতিল", bg: "#fdeaea", fg: "#dc2626" },
  returned: { label: "রিটার্ন", bg: "#fdeede", fg: "#ea580c" },
};

export function OrderStatusBadge({ status }: { status: string }) {
  const m = META[status] ?? { label: status, bg: "#f1f5f9", fg: "#475569" };
  return (
    <span className="inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold whitespace-nowrap" style={{ background: m.bg, color: m.fg }}>
      {m.label}
    </span>
  );
}
