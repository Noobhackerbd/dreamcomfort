"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { deleteReview } from "./actions";

export function DeleteReviewButton({ id }: { id: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <button
      onClick={async () => { setBusy(true); await deleteReview(id); setBusy(false); router.refresh(); }}
      disabled={busy}
      className="dc-act-sm text-red-600 disabled:opacity-50"
    >
      {busy ? "..." : "Delete"}
    </button>
  );
}
