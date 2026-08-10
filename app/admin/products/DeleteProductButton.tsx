"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { deleteProduct } from "./actions";

export function DeleteProductButton({ id }: { id: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState(false);

  if (confirm) {
    return (
      <span className="text-xs">
        <button
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            await deleteProduct(id);
            router.refresh();
          }}
          className="text-red-600 font-medium mr-2"
        >
          {busy ? "..." : "নিশ্চিত?"}
        </button>
        <button onClick={() => setConfirm(false)} className="text-gray-400">
          না
        </button>
      </span>
    );
  }

  return (
    <button onClick={() => setConfirm(true)} className="text-red-500 hover:underline">
      ডিলিট
    </button>
  );
}
