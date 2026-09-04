"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { taka } from "@/lib/format";
import { Icon } from "@/components/admin/icons";
import { globalSearch, type SearchResults } from "@/app/admin/search-actions";

const STATUS_COLOR: Record<string, string> = {
  pending: "#b45309", confirmed: "#2563eb", processing: "#7c3aed", shipped: "#0e7490",
  delivered: "#16a34a", cancelled: "#dc2626", returned: "#ea580c",
};

function localPhone(phone: string): string {
  let n = (phone || "").replace(/\D/g, "");
  if (n.startsWith("880") && n.length === 13) return "0" + n.slice(3);
  return (phone || "").trim();
}
function initials(name: string, phone: string): string {
  const n = (name || "").trim();
  if (n) return n.slice(0, 2).toUpperCase();
  return (phone || "").replace(/\D/g, "").slice(-2) || "—";
}

const EMPTY: SearchResults = { orders: [], products: [], customers: [] };

export function GlobalSearch() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [res, setRes] = useState<SearchResults>(EMPTY);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const reqId = useRef(0);

  // Ctrl/Cmd+K toggles, Esc closes.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      } else if (e.key === "Escape") {
        setOpen(false);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 60);
    else { setQ(""); setRes(EMPTY); }
  }, [open]);

  // Debounced search.
  useEffect(() => {
    const s = q.trim();
    if (s.length < 2) { setRes(EMPTY); setBusy(false); return; }
    setBusy(true);
    const id = ++reqId.current;
    const t = setTimeout(async () => {
      try {
        const r = await globalSearch(s);
        if (id === reqId.current) { setRes(r); setBusy(false); }
      } catch {
        if (id === reqId.current) { setRes(EMPTY); setBusy(false); }
      }
    }, 250);
    return () => clearTimeout(t);
  }, [q]);

  function go(href: string) {
    setOpen(false);
    router.push(href);
  }

  const total = res.orders.length + res.products.length + res.customers.length;
  const hasQuery = q.trim().length >= 2;
  const showEmpty = useMemo(() => hasQuery && !busy && total === 0, [hasQuery, busy, total]);

  return (
    <>
      {/* Floating search button */}
      <button
        onClick={() => setOpen(true)}
        aria-label="Search"
        className="fixed z-[60] right-4 bottom-24 md:bottom-6 rounded-full flex items-center justify-center transition active:scale-95"
        style={{ height: 52, width: 52, background: "var(--a-violet)", color: "#fff", boxShadow: "0 10px 24px rgba(109,90,230,.42)" }}
      >
        <Icon name="search" className="h-5 w-5" />
      </button>

      {open && (
        <div className="fixed inset-0 z-[100] flex items-start justify-center p-3 sm:p-6" style={{ background: "rgba(17,24,39,.45)" }} onClick={() => setOpen(false)}>
          <div className="w-full max-w-xl mt-[6vh] dc-card overflow-hidden p-0" style={{ boxShadow: "var(--a-shadow-lg)" }} onClick={(e) => e.stopPropagation()}>
            {/* Input */}
            <div className="flex items-center gap-2.5 px-4 py-3" style={{ borderBottom: "1px solid var(--a-border)" }}>
              <Icon name="search" className={"h-5 w-5 shrink-0 " + (busy ? "animate-pulse" : "")} style={{ color: "var(--a-faint)" }} />
              <input
                ref={inputRef}
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search orders, products, customers…"
                className="flex-1 bg-transparent outline-none text-[15px]"
              />
              <button onClick={() => setOpen(false)} className="dc-act dc-act-sm shrink-0" title="Close (Esc)"><Icon name="close" className="h-4 w-4" /></button>
            </div>

            {/* Results */}
            <div className="max-h-[62vh] overflow-y-auto">
              {!hasQuery && (
                <p className="px-4 py-8 text-center text-sm dc-muted">Type at least 2 letters — search by order number, name, phone, or product.</p>
              )}
              {showEmpty && (
                <p className="px-4 py-8 text-center text-sm dc-muted">No matches for &ldquo;{q.trim()}&rdquo;.</p>
              )}

              {res.orders.length > 0 && (
                <Section label="Orders">
                  {res.orders.map((o) => (
                    <button key={o.id} onClick={() => go(`/admin/orders?q=${encodeURIComponent(o.order_number)}`)} className="dc-search-row">
                      <Thumb src={o.image} fallback="📦" />
                      <div className="flex-1 min-w-0 text-left">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-[13px]">{o.order_number}</span>
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold" style={{ color: STATUS_COLOR[o.status] ?? "var(--a-muted)" }}>
                            <span className="h-1.5 w-1.5 rounded-full" style={{ background: STATUS_COLOR[o.status] ?? "var(--a-faint)" }} />
                            {o.status}
                          </span>
                        </div>
                        <p className="text-[12px] dc-muted truncate">{o.name}{o.phone ? ` · ${localPhone(o.phone)}` : ""}</p>
                      </div>
                      <span className="font-bold text-[13px] shrink-0">{taka(o.total)}</span>
                    </button>
                  ))}
                </Section>
              )}

              {res.products.length > 0 && (
                <Section label="Products">
                  {res.products.map((p) => (
                    <button key={p.id} onClick={() => go(`/admin/products/${p.id}`)} className="dc-search-row">
                      <Thumb src={p.image} fallback="🛍️" />
                      <div className="flex-1 min-w-0 text-left">
                        <p className="font-semibold text-[13px] truncate">{p.name}</p>
                        <p className="text-[12px] dc-muted">{taka(p.price)} · <span style={{ color: p.stock <= 5 ? "#dc2626" : "var(--a-faint)" }}>stock {p.stock}</span></p>
                      </div>
                      <Icon name="chevronRight" className="h-4 w-4 shrink-0" style={{ color: "var(--a-faint)" }} />
                    </button>
                  ))}
                </Section>
              )}

              {res.customers.length > 0 && (
                <Section label="Customers">
                  {res.customers.map((c) => (
                    <button key={c.id} onClick={() => go(`/admin/orders?q=${encodeURIComponent(c.phone)}`)} className="dc-search-row">
                      <span className="inline-flex h-9 w-9 items-center justify-center rounded-full text-[12px] font-bold shrink-0" style={{ background: "var(--a-violet-soft)", color: "var(--a-violet)" }}>
                        {initials(c.name, c.phone)}
                      </span>
                      <div className="flex-1 min-w-0 text-left">
                        <p className="font-semibold text-[13px] truncate">{c.name || "Unknown"}</p>
                        <p className="text-[12px] dc-muted">{localPhone(c.phone)} · {c.orders} order{c.orders === 1 ? "" : "s"}</p>
                      </div>
                      <span className="font-bold text-[13px] shrink-0">{taka(c.spent)}</span>
                    </button>
                  ))}
                </Section>
              )}
            </div>

            <div className="px-4 py-2 text-[11px] dc-muted flex items-center justify-between" style={{ borderTop: "1px solid var(--a-border)", background: "var(--a-surface-2)" }}>
              <span>Tap a result to open</span>
              <span className="hidden sm:inline">Ctrl/⌘ + K</span>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .dc-search-row{display:flex;align-items:center;gap:10px;width:100%;padding:9px 16px;transition:background .12s}
        .dc-search-row:hover{background:var(--a-surface-2)}
      `}</style>
    </>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="py-1">
      <p className="px-4 pt-2 pb-1 text-[10.5px] font-bold uppercase tracking-wide" style={{ color: "var(--a-faint)" }}>{label}</p>
      {children}
    </div>
  );
}

function Thumb({ src, fallback }: { src: string | null; fallback: string }) {
  return (
    <span className="h-9 w-9 shrink-0 rounded-lg overflow-hidden flex items-center justify-center" style={{ background: "var(--a-surface-2)", boxShadow: "inset 0 0 0 1px var(--a-border)" }}>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" className="h-full w-full object-cover" />
      ) : (
        <span className="text-base">{fallback}</span>
      )}
    </span>
  );
}
