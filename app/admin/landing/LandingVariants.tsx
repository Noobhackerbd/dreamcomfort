"use client";

// app/admin/landing/LandingVariants.tsx — manage extra landing pages (variants).
// Same design as the homepage; each variant only changes which products are shown.
import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { saveLandingVariants } from "./actions";

interface ProductOpt { slug: string; name: string; price?: number; image?: string | null }
interface Variant { key: string; name: string; productSlugs: string[] }

const slugifyKey = (s: string) =>
  s.toLowerCase().trim().replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40);

export function LandingVariants({ initial, products }: { initial: Variant[]; products: ProductOpt[] }) {
  const router = useRouter();
  const [list, setList] = useState<Variant[]>(initial ?? []);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const origin = typeof window !== "undefined" ? window.location.origin : "https://dreamcomfortbd.com";

  function nextKey(): string {
    const keys = new Set(list.map((v) => v.key));
    let n = list.length + 2; // homepage is "1"
    while (keys.has(`landing${n}`)) n++;
    return `landing${n}`;
  }

  function addVariant() {
    const key = nextKey();
    setList((l) => [...l, { key, name: `Landing ${key.replace("landing", "")}`, productSlugs: [] }]);
  }
  function update(i: number, patch: Partial<Variant>) {
    setList((l) => l.map((v, idx) => (idx === i ? { ...v, ...patch } : v)));
  }
  function remove(i: number) {
    setList((l) => l.filter((_, idx) => idx !== i));
  }
  function toggleProduct(i: number, slug: string) {
    setList((l) =>
      l.map((v, idx) =>
        idx === i
          ? { ...v, productSlugs: v.productSlugs.includes(slug) ? v.productSlugs.filter((s) => s !== slug) : [...v.productSlugs, slug] }
          : v
      )
    );
  }

  async function save() {
    setBusy(true);
    setMsg(null);
    const res = await saveLandingVariants(list);
    setBusy(false);
    if (!res.ok) { setMsg(res.error ?? "Save failed."); return; }
    setMsg("Saved ✓");
    router.refresh();
  }

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-lg font-bold">🧩 Extra landing pages</h2>
        <button onClick={addVariant} className="dc-btn dc-btn-solid" style={{ background: "var(--a-violet)", borderColor: "var(--a-violet)" }}>+ New landing</button>
      </div>
      <p className="text-sm dc-muted mb-4">Same design — only the products differ. Each opens at its own URL (e.g. <code className="px-1 rounded" style={{ background: "var(--a-surface-2)" }}>/landing2</code>). Use that URL in your ads.</p>

      {list.length === 0 && (
        <p className="rounded-xl p-4 text-sm dc-muted" style={{ border: "1px dashed var(--a-border)" }}>No extra landing pages yet — press &ldquo;+ New landing&rdquo;.</p>
      )}

      <div className="space-y-4">
        {list.map((v, i) => (
          <div key={i} className="dc-card p-4">
            <div className="flex flex-wrap items-end gap-3 mb-3">
              <div className="flex-1 min-w-[140px]">
                <label className="block text-xs font-medium dc-muted mb-1">Name (for yourself)</label>
                <input value={v.name} onChange={(e) => update(i, { name: e.target.value })} className="dc-input py-2" placeholder="e.g. Baby products landing" />
              </div>
              <div className="min-w-[140px]">
                <label className="block text-xs font-medium dc-muted mb-1">URL key</label>
                <input value={v.key} onChange={(e) => update(i, { key: slugifyKey(e.target.value) })} className="dc-input py-2 font-mono" placeholder="landing2" />
              </div>
              <button onClick={() => remove(i)} className="dc-btn" style={{ color: "#dc2626", borderColor: "#f0c9c9" }}>Remove</button>
            </div>

            <div className="mb-3 text-xs">
              <span className="dc-muted">Link: </span>
              <a href={`/${v.key}`} target="_blank" rel="noopener" className="font-medium break-all hover:underline" style={{ color: "var(--a-brand)" }}>{origin}/{v.key}</a>
            </div>

            <label className="block text-xs font-medium dc-muted mb-2">Select products ({v.productSlugs.length})</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {products.map((p) => {
                const on = v.productSlugs.includes(p.slug);
                return (
                  <button
                    key={p.slug}
                    type="button"
                    onClick={() => toggleProduct(i, p.slug)}
                    className="flex items-center gap-2 rounded-xl border p-2 text-left transition"
                    style={on
                      ? { borderColor: "var(--a-violet)", background: "var(--a-violet-soft)", boxShadow: "0 0 0 2px var(--a-violet-soft)" }
                      : { borderColor: "var(--a-border)" }}
                  >
                    <span className="h-9 w-9 rounded-lg overflow-hidden shrink-0 flex items-center justify-center" style={{ background: "var(--a-surface-2)" }}>
                      {p.image ? (
                        <Image src={p.image} alt="" width={36} height={36} className="h-full w-full object-cover" />
                      ) : (
                        <span className="text-[9px] dc-muted">—</span>
                      )}
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className="block text-xs font-medium leading-tight line-clamp-2">{p.name}</span>
                    </span>
                    <span className="shrink-0 h-4 w-4 rounded-full border flex items-center justify-center text-[10px]" style={on ? { background: "var(--a-violet)", color: "#fff", borderColor: "var(--a-violet)" } : { borderColor: "var(--a-border)" }}>{on ? "✓" : ""}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {list.length > 0 && (
        <div className="mt-4 flex items-center gap-3">
          <button onClick={save} disabled={busy} className="dc-btn dc-btn-solid disabled:opacity-60" style={{ background: "var(--a-violet)", borderColor: "var(--a-violet)" }}>
            {busy ? "Saving…" : "Save"}
          </button>
          {msg && <span className="text-sm" style={{ color: msg.includes("✓") ? "var(--a-ok)" : "#dc2626" }}>{msg}</span>}
        </div>
      )}
    </div>
  );
}
