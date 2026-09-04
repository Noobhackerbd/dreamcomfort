"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/admin/icons";
import { deleteProduct } from "./actions";

export function DeleteProductButton({ id }: { id: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);

  return (
    <span className="relative inline-flex">
      <button onClick={() => setOpen((o) => !o)} className="dc-act dc-act-sm" title="Delete" style={{ color: "#dc2626" }}>
        <Icon name="trash" className="h-4 w-4" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-9 z-40 w-52 dc-card p-3" style={{ boxShadow: "var(--a-shadow-lg)" }}>
            <p className="text-sm font-semibold mb-1">Delete this product?</p>
            <p className="text-xs dc-muted mb-3">This cannot be undone.</p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setOpen(false)} className="dc-btn">Cancel</button>
              <button
                disabled={busy}
                onClick={async () => { setBusy(true); await deleteProduct(id); setOpen(false); router.refresh(); }}
                className="dc-btn disabled:opacity-60"
                style={{ background: "#dc2626", borderColor: "#dc2626", color: "#fff" }}
              >
                {busy ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </>
      )}
    </span>
  );
}
