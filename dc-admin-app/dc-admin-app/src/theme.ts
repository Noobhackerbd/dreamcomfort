export const C = {
  brand: "#0d9488",
  brandDark: "#0b7c72",
  bg: "#f6f7f9",
  card: "#ffffff",
  text: "#111827",
  sub: "#6b7280",
  border: "#e5e7eb",
  green: "#16a34a",
  amber: "#f59e0b",
  red: "#ef4444",
  blue: "#3b82f6",
};

export const STATUS: Record<string, { label: string; color: string }> = {
  pending: { label: "পেন্ডিং", color: "#f59e0b" },
  confirmed: { label: "কনফার্মড", color: "#3b82f6" },
  processing: { label: "প্রসেসিং", color: "#8b5cf6" },
  shipped: { label: "শিপড", color: "#0ea5e9" },
  delivered: { label: "ডেলিভার্ড", color: "#16a34a" },
  cancelled: { label: "বাতিল", color: "#ef4444" },
  returned: { label: "রিটার্ন", color: "#6b7280" },
};

export const STATUS_ORDER = ["pending", "confirmed", "processing", "shipped", "delivered", "cancelled", "returned"];
