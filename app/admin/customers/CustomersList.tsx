"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { taka, bdDate } from "@/lib/format";
import { Icon } from "@/components/admin/icons";
import { deleteCustomer } from "./actions";
import { CustomerDetailModal } from "./CustomerDetailModal";

export interface CustomerRow {
  id: string;
  name: string;
  phone: string;
  email: string;
  totalOrders: number;
  totalSpent: number;
  createdAt: string | null;
  storeOrders: number;
  delivered: number;
  cancelled: number;
  lastOrderAt: string | null;
}

type Segment = "all" | "vip" | "repeat" | "new";
type Sort = "spent" | "orders" | "recent";

/** delivered / (delivered + cancelled) as a percentage, or null when nothing has resolved. */
export function ownRate(c: { delivered: number; cancelled: number }): number | null {
  const resolved = c.delivered + c.cancelled;
  return resolved > 0 ? Math.round((c.delivered / resolved) * 100) : null;
}
export function rateBand(r: number): { fg: string; bg: string } {
  if (r >= 85) return { fg: "#16a34a", bg: "#e7f6ec" };
  if (r >= 70) return { fg: "#4d7c0f", bg: "#eef6e0" };
  if (r >= 50) return { fg: "#b45309", bg: "#fef3e2" };
  return { fg: "#dc2626", bg: "#fdeaea" };
}

/** BD phone → international digits (8801XXXXXXXXX). */
function bdIntl(phone: string): string {
  let n = (phone || "").replace(/\D/g, "");
  if (n.startsWith("00")) n = n.slice(2);
  if (n.startsWith("0")) n = "88" + n;
  else if (n.startsWith("1")) n = "880" + n;
  else if (!n.startsWith("880")) n = "880" + n;
  return n;
}
function toLocalDisplay(phone: string): string {
  const n = bdIntl(phone);
  if (n.startsWith("880") && n.length === 13) return "0" + n.slice(3);
  return (phone || "").trim();
}
const telLink = (p: string) => "tel:+" + bdIntl(p);
const waLink = (p: string) => "https://wa.me/" + bdIntl(p);

function initials(name: string, phone: string): string {
  const n = (name || "").trim();
  if (n) return n.slice(0, 2).toUpperCase();
  const d = (phone || "").replace(/\D/g, "");
  return d.slice(-2) || "—";
}

function DeleteButton({ id, name, onDone }: { id: string; name: string; onDone: () => void }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  return (
    <span className="relative inline-flex">
      <button onClick={() => setOpen((o) => !o)} className="dc-act dc-act-sm" title="Delete customer" style={{ color: "#dc2626" }}>
        <Icon name="trash" className="h-4 w-4" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-9 z-40 w-56 dc-card p-3" style={{ boxShadow: "var(--a-shadow-lg)" }}>
            <p className="text-sm font-semibold mb-1">Delete {name || "this customer"}?</p>
            <p className="text-xs dc-muted mb-3">Removes the customer record. Their past orders stay.</p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setOpen(false)} className="dc-btn">Cancel</button>
              <button
                disabled={busy}
                onClick={async () => { setBusy(true); await deleteCustomer(id); setBusy(false); setOpen(false); onDone(); }}
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

const SEGMENTS: { key: Segment; label: string }[] = [
  { key: "all", label: "All" },
  { key: "vip", label: "VIP (3+)" },
  { key: "repeat", label: "Repeat (2+)" },
  { key: "new", label: "New" },
];
const SORTS: { key: Sort; label: string }[] = [
  { key: "spent", label: "Highest spend" },
  { key: "orders", label: "Most orders" },
  { key: "recent", label: "Most recent" },
];

export function CustomersList({ customers, bdcReady }: { customers: CustomerRow[]; bdcReady: boolean }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [seg, setSeg] = useState<Segment>("all");
  const [sort, setSort] = useState<Sort>("spent");
  const [detail, setDetail] = useState<CustomerRow | null>(null);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    let list = customers.filter((c) => {
      if (seg === "vip" && c.totalOrders < 3) return false;
      if (seg === "repeat" && c.totalOrders < 2) return false;
      if (seg === "new" && c.totalOrders > 1) return false;
      if (s) {
        const hay = `${c.name} ${c.phone} ${toLocalDisplay(c.phone)} ${c.email}`.toLowerCase();
        if (!hay.includes(s)) return false;
      }
      return true;
    });
    list = list.slice().sort((a, b) => {
      if (sort === "orders") return b.totalOrders - a.totalOrders;
      if (sort === "recent") return String(b.lastOrderAt ?? "").localeCompare(String(a.lastOrderAt ?? ""));
      return b.totalSpent - a.totalSpent;
    });
    return list;
  }, [customers, q, seg, sort]);

  return (
    <div>
      {/* Search */}
      <div className="relative mb-3">
        <span className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--a-faint)" }}>
          <Icon name="search" className="h-4 w-4" />
        </span>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search name or phone…"
          className="dc-input pl-9"
        />
      </div>

      {/* Segment chips + sort */}
      <div className="flex items-center gap-2 mb-4">
        <div className="dc-scroll-x flex items-center gap-1.5 overflow-x-auto pb-1 flex-1 min-w-0">
          {SEGMENTS.map((sgm) => (
            <button
              key={sgm.key}
              onClick={() => setSeg(sgm.key)}
              className={"shrink-0 whitespace-nowrap rounded-full border px-3.5 py-1.5 text-[13px] font-medium transition " + (seg === sgm.key ? "dc-pill-active" : "dc-pill")}
            >
              {sgm.label}
            </button>
          ))}
        </div>
        <select value={sort} onChange={(e) => setSort(e.target.value as Sort)} className="dc-input shrink-0 w-auto text-[13px] py-1.5">
          {SORTS.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
        </select>
      </div>

      <p className="text-xs dc-muted mb-3">{filtered.length} customer{filtered.length === 1 ? "" : "s"}</p>

      {filtered.length === 0 ? (
        <p className="text-center dc-muted py-12">No customers found.</p>
      ) : (
        <div className="space-y-2">
          {filtered.map((c) => {
            const r = ownRate(c);
            const b = r != null ? rateBand(r) : null;
            return (
              <div key={c.id} className="dc-card p-3">
                <div className="flex items-start gap-3">
                  {/* Avatar */}
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-full text-[13px] font-bold shrink-0" style={{ background: "var(--a-violet-soft)", color: "var(--a-violet)" }}>
                    {initials(c.name, c.phone)}
                  </span>

                  <div className="flex-1 min-w-0">
                    {/* Name + spend */}
                    <div className="flex items-center justify-between gap-2">
                      <button onClick={() => setDetail(c)} className="text-[14px] font-bold hover:underline truncate">{c.name || "Unknown"}</button>
                      <span className="font-bold text-[14px] whitespace-nowrap shrink-0">{taka(c.totalSpent)}</span>
                    </div>

                    {/* Phone */}
                    <div className="text-[12.5px] mt-0.5">
                      {c.phone && <a href={telLink(c.phone)} className="font-semibold tabular-nums" style={{ color: "var(--a-brand)" }}>{toLocalDisplay(c.phone)}</a>}
                    </div>

                    {/* Meta pills */}
                    <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
                      <span className="text-[10.5px] font-semibold px-1.5 py-0.5 rounded-full" style={{ background: "var(--a-surface-2)", color: "var(--a-muted)" }}>
                        {c.totalOrders} order{c.totalOrders === 1 ? "" : "s"}
                      </span>
                      {r != null && b && (
                        <span className="inline-flex items-center gap-1 text-[10.5px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: b.bg, color: b.fg }} title="Your own delivered vs cancelled">
                          <Icon name="truck" className="h-3 w-3" /> {r}% ({c.delivered}/{c.delivered + c.cancelled})
                        </span>
                      )}
                      {c.totalOrders >= 3 && (
                        <span className="text-[10.5px] font-semibold px-1.5 py-0.5 rounded-full" style={{ background: "#fdf3d6", color: "#b7791f" }}>★ VIP</span>
                      )}
                      {c.lastOrderAt && (
                        <span className="text-[10.5px] font-medium" style={{ color: "var(--a-faint)" }}>· last {bdDate(c.lastOrderAt)}</span>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="mt-1.5 flex items-center gap-0.5">
                      {c.phone && <a href={telLink(c.phone)} className="dc-act dc-act-sm" title="Call"><Icon name="phone" className="h-4 w-4" /></a>}
                      {c.phone && <a href={waLink(c.phone)} target="_blank" rel="noopener" className="dc-act dc-act-sm" title="WhatsApp"><Icon name="chat" className="h-4 w-4" /></a>}
                      <button onClick={() => setDetail(c)} className="dc-act dc-act-sm" title="View details"><Icon name="eye" className="h-4 w-4" /></button>
                      <span className="ml-auto"><DeleteButton id={c.id} name={c.name} onDone={() => router.refresh()} /></span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <CustomerDetailModal customer={detail} bdcReady={bdcReady} onClose={() => setDetail(null)} />
    </div>
  );
}
