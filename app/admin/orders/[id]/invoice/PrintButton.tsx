"use client";

export function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="no-print rounded-lg bg-brand text-white px-5 py-2 text-sm"
    >
      🖨️ প্রিন্ট / সেভ PDF
    </button>
  );
}
