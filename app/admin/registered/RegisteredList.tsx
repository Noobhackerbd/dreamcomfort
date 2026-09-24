"use client";

import { useMemo, useState } from "react";
import { taka, bdDate } from "@/lib/format";
import { RegisteredDetailModal } from "./RegisteredDetailModal";

export interface RegisteredRow {
  id: string;
  name: string;
  phone: string;
  email: string;
  createdAt: string | null;
  signupMethod: string;
  lastSignInAt: string | null;
  orders: number;
  delivered: number;
  cancelled: number;
  spent: number;
  lastOrderAt: string | null;
  wishlist: number;
  addresses: number;
  adminNotes: string;
  adminTags: string[];
}

type Segment = "all" | "ordered" | "never" | "repeat" | "wishlist";
type Sort = "recent" | "spent" | "orders";

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
const waLink = (p: string) => "https://wa.me/" + bdIntl(p);

function initials(name: string, email: string): string {
  const n = (name || "").trim();
  if (n) return n.slice(0, 2).toUpperCase();
  return (email || "?").slice(0, 2).toUpperCase();
}

const METHOD_META: Record<string, { label: string; bg: string; fg: string }> = {
  google: { label: "Google", bg: "#e8f0fe", fg: "#1a73e8" },
  facebook: { label: "Facebook", bg: "#e7edff", fg: "#1877F2" },
  phone: { label: "Phone", bg: "#e7f6ec", fg: "#16a34a" },
  email: { label: "Email", bg: "#f1f0f4", fg: "#6b6870" },
};
function MethodChip({ method }: { method: string }) {
  const m = METHOD_META[method] || METHOD_META.email;
  return <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full shrink-0" style={{ background: m.bg, color: m.fg }}>{m.label}</span>;
}

export function RegisteredList({ customers }: { customers: RegisteredRow[] }) {
  const [q, setQ] = useState("");
  const [seg, setSeg] = useState<Segment>("all");
  const [sort, setSort] = useState<Sort>("recent");
  const [openId, setOpenId] = useState<string | null>(null);

  const rows = useMemo(() => {
    let r = customers;
    const s = q.trim().toLowerCase();
    if (s) r = r.filter((c) => c.name.toLowerCase().includes(s) || c.email.toLowerCase().includes(s) || c.phone.replace(/\D/g, "").includes(s.replace(/\D/g, "")));
    if (seg === "ordered") r = r.filter((c) => c.orders > 0);
    else if (seg === "never") r = r.filter((c) => c.orders === 0);
    else if (seg === "repeat") r = r.filter((c) => c.orders >= 2);
    else if (seg === "wishlist") r = r.filter((c) => c.wishlist > 0);
    const arr = [...r];
    if (sort === "spent") arr.sort((a, b) => b.spent - a.spent);
    else if (sort === "orders") arr.sort((a, b) => b.orders - a.orders);
    else arr.sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")));
    return arr;
  }, [customers, q, seg, sort]);

  function exportCsv() {
    const head = ["Name", "Phone", "Email", "Signup", "Joined", "Orders", "Delivered", "Cancelled", "Spent(BDT)", "Wishlist", "Addresses", "Tags", "LastOrder"];
    const lines = rows.map((c) => [
      c.name, toLocalDisplay(c.phone), c.email, c.signupMethod,
      c.createdAt ? c.createdAt.slice(0, 10) : "", c.orders, c.delivered, c.cancelled, c.spent,
      c.wishlist, c.addresses, (c.adminTags || []).join("|"), c.lastOrderAt ? c.lastOrderAt.slice(0, 10) : "",
    ].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","));
    const csv = [head.join(","), ...lines].join("\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `registered-customers-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  const SEGS: { key: Segment; label: string }[] = [
    { key: "all", label: `All (${customers.length})` },
    { key: "ordered", label: "Ordered" },
    { key: "never", label: "Never ordered" },
    { key: "repeat", label: "Repeat" },
    { key: "wishlist", label: "Has wishlist" },
  ];

  const open = customers.find((c) => c.id === openId) || null;

  return (
    <div>
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <div className="relative flex-1 min-w-[180px]">
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, phone or email…"
            className="w-full rounded-lg border px-3.5 py-2 text-sm outline-none" style={{ borderColor: "var(--a-border)", background: "var(--a-surface)" }} />
        </div>
        <select value={sort} onChange={(e) => setSort(e.target.value as Sort)}
          className="rounded-lg border px-3 py-2 text-sm" style={{ borderColor: "var(--a-border)", background: "var(--a-surface)" }}>
          <option value="recent">Newest signup</option>
          <option value="spent">Top spenders</option>
          <option value="orders">Most orders</option>
        </select>
        <button onClick={exportCsv} className="rounded-lg border px-3.5 py-2 text-sm font-medium hover:border-brand" style={{ borderColor: "var(--a-border)" }}>Export CSV</button>
      </div>

      {/* Segments */}
      <div className="dc-scroll-x flex items-center gap-1.5 overflow-x-auto pb-1 mb-3">
        {SEGS.map((sgm) => (
          <button key={sgm.key} onClick={() => setSeg(sgm.key)}
            className={"shrink-0 whitespace-nowrap rounded-full border px-3.5 py-1.5 text-[13px] font-medium transition " + (seg === sgm.key ? "dc-pill-active" : "dc-pill")}>
            {sgm.label}
          </button>
        ))}
      </div>

      {rows.length === 0 ? (
        <p className="dc-card p-8 text-center dc-muted text-sm">No registered customers match.</p>
      ) : (
        <div className="space-y-2">
          {rows.map((c) => {
            const resolved = c.delivered + c.cancelled;
            const rate = resolved > 0 ? Math.round((c.delivered / resolved) * 100) : null;
            return (
              <button key={c.id} onClick={() => setOpenId(c.id)} className="dc-card w-full text-left p-3 flex items-center gap-3 hover:border-brand transition">
                <span className="h-10 w-10 shrink-0 rounded-full grid place-items-center font-bold text-sm text-white" style={{ background: "linear-gradient(135deg,#2F90CC,#1E7AAF)" }}>{initials(c.name, c.email)}</span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-semibold text-[13.5px] truncate">{c.name || "গ্রাহক"}</span>
                    <MethodChip method={c.signupMethod} />
                    {c.orders >= 2 && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: "#f3e8ff", color: "#7c3aed" }}>Repeat ×{c.orders}</span>}
                    {(c.adminTags || []).slice(0, 2).map((t) => (
                      <span key={t} className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full" style={{ background: "var(--a-surface-2)", color: "var(--a-muted)" }}>{t}</span>
                    ))}
                  </div>
                  <p className="text-[11.5px] dc-muted truncate">
                    {toLocalDisplay(c.phone) || "—"}{c.email ? ` · ${c.email}` : ""}
                    {c.createdAt ? ` · joined ${bdDate(c.createdAt)}` : ""}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-bold text-[13.5px] tabular-nums">{taka(c.spent)}</p>
                  <p className="text-[10.5px] dc-muted">
                    {c.orders} order{c.orders === 1 ? "" : "s"}{rate != null ? ` · ${rate}%` : ""}{c.wishlist ? ` · ♥ ${c.wishlist}` : ""}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      )}

      <RegisteredDetailModal customer={open} onClose={() => setOpenId(null)} waLink={waLink} toLocalDisplay={toLocalDisplay} />
    </div>
  );
}
