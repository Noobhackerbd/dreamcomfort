"use client";

// app/admin/landing/LandingVariants.tsx — manage extra landing pages (variants).
// Same design as the homepage; each variant only changes which products are shown.
import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { saveLandingVariants } from "./actions";

interface ProductOpt { slug: string; name: string; price?: number; image?: string | null }
interface Variant {
  key: string;
  name: string;
  productSlugs: string[];
  theme: "pillow" | "bee";
  /** Delivery charge for this page in taka, per area; null = use Settings → Shipping. */
  shippingInside: number | null;
  shippingOutside: number | null;
  reviewMode: "inherit" | "custom" | "none";
  reviews: { name: string; text: string; stars: number; image?: string }[];
  reviewTitle: string;
  reviewStat: string;
}

const REVIEW_MODES: { id: Variant["reviewMode"]; label: string; hint: string }[] = [
  { id: "inherit", label: "Same as main landing", hint: "Shows the reviews from the Landing page section above." },
  { id: "custom", label: "Custom for this page", hint: "Write reviews about THIS product. Empty list = section hidden." },
  { id: "none", label: "Hide reviews", hint: "No reviews section on this page at all." },
];

const THEMES: { id: "pillow" | "bee"; label: string; hint: string; swatch: string[] }[] = [
  { id: "pillow", label: "Pink & blue (pregnancy pillow)", hint: "The original Dream Comfort funnel design.", swatch: ["#F0A0C0", "#2F90CC", "#FBF3EA"] },
  { id: "bee", label: "Honey bee (baby head protector)", hint: "Yellow, chocolate brown & cream — built for the bee pillow.", swatch: ["#F7C12B", "#4A2C17", "#FFFBF0"] },
];

const slugifyKey = (s: string) =>
  s.toLowerCase().trim().replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40);

export function LandingVariants({ initial, products }: { initial: Variant[]; products: ProductOpt[] }) {
  const router = useRouter();
  const [list, setList] = useState<Variant[]>(
    (initial ?? []).map((v) => ({
      ...v,
      theme: v.theme === "bee" ? "bee" : "pillow",
      shippingInside: v.shippingInside ?? null,
      shippingOutside: v.shippingOutside ?? null,
      reviewMode: v.reviewMode === "custom" || v.reviewMode === "none" ? v.reviewMode : "inherit",
      reviews: Array.isArray(v.reviews) ? v.reviews : [],
      reviewTitle: v.reviewTitle ?? "",
      reviewStat: v.reviewStat ?? "",
    }))
  );
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
    setList((l) => [...l, { key, name: `Landing ${key.replace("landing", "")}`, productSlugs: [], theme: "pillow", shippingInside: null, shippingOutside: null, reviewMode: "inherit", reviews: [], reviewTitle: "", reviewStat: "" }]);
  }
  function update(i: number, patch: Partial<Variant>) {
    setList((l) => l.map((v, idx) => (idx === i ? { ...v, ...patch } : v)));
  }
  function remove(i: number) {
    setList((l) => l.filter((_, idx) => idx !== i));
  }
  function updReview(i: number, ri: number, patch: Partial<Variant["reviews"][number]>) {
    setList((l) => l.map((v, idx) => (idx === i ? { ...v, reviews: v.reviews.map((r, k) => (k === ri ? { ...r, ...patch } : r)) } : v)));
  }
  function addReview(i: number) {
    setList((l) => l.map((v, idx) => (idx === i ? { ...v, reviewMode: "custom", reviews: [...v.reviews, { name: "", text: "", stars: 5 }] } : v)));
  }
  function delReview(i: number, ri: number) {
    setList((l) => l.map((v, idx) => (idx === i ? { ...v, reviews: v.reviews.filter((_, k) => k !== ri) } : v)));
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

            {/* Design theme */}
            <label className="block text-xs font-medium dc-muted mb-1.5">Design theme</label>
            <div className="grid gap-2 sm:grid-cols-2 mb-3">
              {THEMES.map((t) => {
                const on = v.theme === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => update(i, { theme: t.id })}
                    className="flex items-center gap-2.5 rounded-xl border p-2.5 text-left transition"
                    style={on
                      ? { borderColor: "var(--a-violet)", background: "var(--a-violet-soft)", boxShadow: "0 0 0 2px var(--a-violet-soft)" }
                      : { borderColor: "var(--a-border)" }}
                  >
                    <span className="flex shrink-0 -space-x-1.5">
                      {t.swatch.map((c) => (
                        <span key={c} className="h-5 w-5 rounded-full border-2 border-white" style={{ background: c }} />
                      ))}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-xs font-semibold leading-tight">{t.label}</span>
                      <span className="block text-[11px] dc-muted leading-tight mt-0.5">{t.hint}</span>
                    </span>
                    <span
                      className="shrink-0 h-4 w-4 rounded-full border flex items-center justify-center text-[10px]"
                      style={on ? { background: "var(--a-violet)", color: "#fff", borderColor: "var(--a-violet)" } : { borderColor: "var(--a-border)" }}
                    >{on ? "✓" : ""}</span>
                  </button>
                );
              })}
            </div>

            {/* Delivery charge for THIS landing page */}
            <label className="block text-xs font-medium dc-muted mb-1.5">Delivery charge for this page</label>
            <div className="mb-1.5 flex flex-wrap items-end gap-3">
              {([
                { k: "shippingInside" as const, label: "Inside Dhaka" },
                { k: "shippingOutside" as const, label: "Outside Dhaka" },
              ]).map(({ k, label }) => (
                <div key={k}>
                  <span className="block text-[11px] dc-muted mb-1">{label}</span>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm dc-muted">৳</span>
                    <input
                      type="number"
                      min={0}
                      step={1}
                      inputMode="numeric"
                      value={v[k] ?? ""}
                      onChange={(e) => update(i, { [k]: e.target.value === "" ? null : Math.max(0, Math.round(Number(e.target.value) || 0)) })}
                      placeholder="Default"
                      className="dc-input py-2 pl-7 w-32"
                    />
                  </div>
                </div>
              ))}
              <button type="button" onClick={() => update(i, { shippingInside: 0, shippingOutside: 0 })} className="dc-btn text-xs py-1.5">Free everywhere</button>
              <button type="button" onClick={() => update(i, { shippingInside: null, shippingOutside: null })} className="dc-btn text-xs py-1.5">Use global setting</button>
            </div>
            <p className="mb-3 text-[11px] dc-muted">
              {v.shippingInside === null && v.shippingOutside === null
                ? "Using Settings → Shipping."
                : v.shippingInside === v.shippingOutside
                  ? `One flat charge — the order form won't ask for an area.${v.shippingInside === 0 ? " Delivery is free." : ""}`
                  : "Different charges, so the order form asks the customer to pick inside or outside Dhaka."}
              {" "}Blank = that area uses the global setting.
            </p>

            {/* Customer reviews shown on THIS page */}
            <label className="block text-xs font-medium dc-muted mb-1.5">Customer reviews</label>
            <div className="mb-2 flex flex-wrap gap-2">
              {REVIEW_MODES.map((m) => {
                const on = v.reviewMode === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => update(i, { reviewMode: m.id })}
                    title={m.hint}
                    className="rounded-xl border px-3 py-2 text-xs font-semibold transition"
                    style={on
                      ? { borderColor: "var(--a-violet)", background: "var(--a-violet-soft)", boxShadow: "0 0 0 2px var(--a-violet-soft)" }
                      : { borderColor: "var(--a-border)" }}
                  >{m.label}</button>
                );
              })}
            </div>
            <p className="mb-3 text-[11px] dc-muted">{REVIEW_MODES.find((m) => m.id === v.reviewMode)?.hint}</p>

            {v.reviewMode === "custom" && (
              <div className="mb-3 rounded-xl p-3" style={{ border: "1px solid var(--a-border)", background: "var(--a-surface-2)" }}>
                <div className="mb-3 grid gap-2 sm:grid-cols-2">
                  <div>
                    <label className="block text-[11px] dc-muted mb-1">Reviews headline</label>
                    <input value={v.reviewTitle} onChange={(e) => update(i, { reviewTitle: e.target.value })} className="dc-input py-2" placeholder="হাজারো মায়ের বিশ্বাসের নাম ড্রিম কমফোর্ট" />
                  </div>
                  <div>
                    <label className="block text-[11px] dc-muted mb-1">Rating line</label>
                    <input value={v.reviewStat} onChange={(e) => update(i, { reviewStat: e.target.value })} className="dc-input py-2" placeholder="৪.৯/৫ (৫০,০০০+ রিভিউ)" />
                  </div>
                </div>

                {v.reviews.length === 0 && (
                  <p className="mb-2 text-[11px] dc-muted">No reviews yet — the section stays hidden on this page until you add one.</p>
                )}

                <div className="space-y-2">
                  {v.reviews.map((r, ri) => (
                    <div key={ri} className="rounded-lg p-2" style={{ border: "1px solid var(--a-border)", background: "var(--a-surface)" }}>
                      <div className="mb-2 flex flex-wrap items-center gap-2">
                        <input value={r.name} onChange={(e) => updReview(i, ri, { name: e.target.value })} className="dc-input py-1.5 w-40" placeholder="Customer name" />
                        <select value={r.stars} onChange={(e) => updReview(i, ri, { stars: Number(e.target.value) })} className="dc-input py-1.5 w-24">
                          {[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{n} ★</option>)}
                        </select>
                        <input value={r.image ?? ""} onChange={(e) => updReview(i, ri, { image: e.target.value })} className="dc-input py-1.5 flex-1 min-w-[140px]" placeholder="Photo URL (optional)" />
                        <button type="button" onClick={() => delReview(i, ri)} className="dc-btn text-xs py-1" style={{ color: "#dc2626", borderColor: "#f0c9c9" }}>Remove</button>
                      </div>
                      <textarea value={r.text} onChange={(e) => updReview(i, ri, { text: e.target.value })} rows={2} className="dc-input py-2" placeholder="What the customer said, in Bangla" />
                    </div>
                  ))}
                </div>
                <button type="button" onClick={() => addReview(i)} className="dc-btn text-xs py-1.5 mt-2">+ Add review</button>
              </div>
            )}

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
