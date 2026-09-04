"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { taka } from "@/lib/format";
import { Icon } from "@/components/admin/icons";
import { createCoupon, setCouponActive, deleteCoupon } from "./actions";

export interface CouponRow {
  id: string;
  code: string;
  type: "percent" | "flat";
  value: number;
  minOrder: number;
  expiresAt: string | null;
  usageLimit: number | null;
  usedCount: number;
  active: boolean;
}

function DeleteBtn({ id, code, onDone }: { id: string; code: string; onDone: () => void }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  return (
    <span className="relative inline-flex">
      <button onClick={() => setOpen((o) => !o)} className="dc-act dc-act-sm" style={{ color: "#dc2626" }} title="Delete"><Icon name="trash" className="h-4 w-4" /></button>
      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-9 z-40 w-48 dc-card p-3" style={{ boxShadow: "var(--a-shadow-lg)" }}>
            <p className="text-sm font-semibold mb-2">Delete {code}?</p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setOpen(false)} className="dc-btn">Cancel</button>
              <button disabled={busy} onClick={async () => { setBusy(true); await deleteCoupon(id); setBusy(false); setOpen(false); onDone(); }} className="dc-btn" style={{ background: "#dc2626", borderColor: "#dc2626", color: "#fff" }}>{busy ? "…" : "Delete"}</button>
            </div>
          </div>
        </>
      )}
    </span>
  );
}

export function CouponManager({ coupons }: { coupons: CouponRow[] }) {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [type, setType] = useState<"percent" | "flat">("percent");
  const [value, setValue] = useState("");
  const [minOrder, setMinOrder] = useState("");
  const [expires, setExpires] = useState("");
  const [limit, setLimit] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setErr(null); setSaved(false); setBusy(true);
    const res = await createCoupon({
      code, type, value: Number(value),
      minOrder: minOrder ? Number(minOrder) : 0,
      expiresAt: expires || null,
      usageLimit: limit ? Number(limit) : null,
    });
    setBusy(false);
    if (!res.ok) { setErr(res.error ?? "ব্যর্থ।"); return; }
    setCode(""); setValue(""); setMinOrder(""); setExpires(""); setLimit("");
    setSaved(true); router.refresh();
  }

  const lbl = "block text-[12px] dc-muted mb-1";

  return (
    <div className="max-w-2xl">
      {/* Add form */}
      <form onSubmit={add} className="dc-card p-4 mb-4">
        <div className="grid sm:grid-cols-2 gap-3">
          <div><label className={lbl}>Code</label><input value={code} onChange={(e) => setCode(e.target.value.toUpperCase().replace(/\s/g, ""))} placeholder="EID10" className="dc-input font-mono" /></div>
          <div>
            <label className={lbl}>Discount type</label>
            <select value={type} onChange={(e) => setType(e.target.value as any)} className="dc-input">
              <option value="percent">Percent (%)</option>
              <option value="flat">Flat (৳)</option>
            </select>
          </div>
          <div><label className={lbl}>{type === "percent" ? "Value (%)" : "Value (৳)"}</label><input value={value} onChange={(e) => setValue(e.target.value.replace(/[^\d.]/g, ""))} inputMode="decimal" placeholder={type === "percent" ? "10" : "100"} className="dc-input" /></div>
          <div><label className={lbl}>Min order (৳, optional)</label><input value={minOrder} onChange={(e) => setMinOrder(e.target.value.replace(/\D/g, ""))} inputMode="numeric" placeholder="0" className="dc-input" /></div>
          <div><label className={lbl}>Expires (optional)</label><input type="date" value={expires} onChange={(e) => setExpires(e.target.value)} className="dc-input" /></div>
          <div><label className={lbl}>Usage limit (optional)</label><input value={limit} onChange={(e) => setLimit(e.target.value.replace(/\D/g, ""))} inputMode="numeric" placeholder="unlimited" className="dc-input" /></div>
        </div>
        <div className="mt-3 flex items-center gap-3">
          <button disabled={busy} className="dc-btn dc-btn-solid disabled:opacity-60" style={{ background: "var(--a-violet)", borderColor: "var(--a-violet)" }}><Icon name="plus" className="h-4 w-4" /> {busy ? "Adding…" : "Add coupon"}</button>
          {saved && <span className="text-sm" style={{ color: "var(--a-ok)" }}>Added ✓</span>}
          {err && <span className="text-sm" style={{ color: "#dc2626" }}>{err}</span>}
        </div>
      </form>

      {/* List */}
      {coupons.length === 0 ? (
        <p className="text-center dc-muted py-10">No coupons yet.</p>
      ) : (
        <div className="space-y-2">
          {coupons.map((c) => {
            const expired = c.expiresAt && new Date(c.expiresAt).getTime() < Date.now();
            const limitDone = c.usageLimit != null && c.usedCount >= c.usageLimit;
            return (
              <div key={c.id} className="dc-card p-3.5 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono font-bold text-[14px]">{c.code}</span>
                    <span className="text-[11px] font-semibold px-1.5 py-0.5 rounded-full" style={{ background: "var(--a-violet-soft)", color: "var(--a-violet)" }}>
                      {c.type === "percent" ? `${c.value}%` : taka(c.value)} off
                    </span>
                    {!c.active && <span className="text-[10.5px] font-semibold px-1.5 py-0.5 rounded-full" style={{ background: "var(--a-surface-2)", color: "var(--a-muted)" }}>Inactive</span>}
                    {expired && <span className="text-[10.5px] font-semibold px-1.5 py-0.5 rounded-full" style={{ background: "#fdeaea", color: "#dc2626" }}>Expired</span>}
                    {limitDone && <span className="text-[10.5px] font-semibold px-1.5 py-0.5 rounded-full" style={{ background: "#fdeaea", color: "#dc2626" }}>Limit reached</span>}
                  </div>
                  <p className="text-[11.5px] dc-muted mt-0.5">
                    {c.minOrder > 0 ? `Min ${taka(c.minOrder)} · ` : ""}Used {c.usedCount}{c.usageLimit != null ? `/${c.usageLimit}` : ""}
                    {c.expiresAt ? ` · Expires ${new Date(c.expiresAt).toLocaleDateString("en-GB")}` : ""}
                  </p>
                </div>
                <label className="flex items-center gap-1.5 text-[12px] dc-muted shrink-0 cursor-pointer">
                  <input type="checkbox" checked={c.active} onChange={async (e) => { await setCouponActive(c.id, e.target.checked); router.refresh(); }} className="h-4 w-4" style={{ accentColor: "var(--a-violet)" }} />
                  Active
                </label>
                <DeleteBtn id={c.id} code={c.code} onDone={() => router.refresh()} />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
