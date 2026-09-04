"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/admin/icons";
import { saveCategory, deleteCategory, reorderCategory } from "./actions";

export interface CategoryRow {
  id: string;
  slug: string;
  name_bn: string;
  name_en: string;
  sort_order: number;
  products: number;
  activeProducts: number;
}

function EditRow({ c, onDone }: { c: CategoryRow; onDone: () => void }) {
  const [nameBn, setNameBn] = useState(c.name_bn);
  const [nameEn, setNameEn] = useState(c.name_en);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function save() {
    if (!nameBn.trim() && !nameEn.trim()) return setErr("Enter a name.");
    setBusy(true); setErr(null);
    const res = await saveCategory({ id: c.id, name_bn: nameBn, name_en: nameEn, sort_order: c.sort_order });
    setBusy(false);
    if (!res.ok) return setErr(res.error ?? "Save failed.");
    onDone();
  }

  return (
    <div className="flex flex-wrap items-end gap-2 flex-1">
      <div className="min-w-[130px] flex-1"><label className="block text-[11px] dc-muted mb-1">Name (Bangla)</label><input value={nameBn} onChange={(e) => setNameBn(e.target.value)} className="dc-input" /></div>
      <div className="min-w-[130px] flex-1"><label className="block text-[11px] dc-muted mb-1">Name (English)</label><input value={nameEn} onChange={(e) => setNameEn(e.target.value)} className="dc-input" /></div>
      <button onClick={save} disabled={busy} className="dc-btn dc-btn-solid disabled:opacity-60" style={{ background: "var(--a-violet)", borderColor: "var(--a-violet)" }}>{busy ? "…" : "Save"}</button>
      <button onClick={onDone} className="dc-btn">Cancel</button>
      {err && <p className="w-full text-[12px]" style={{ color: "#dc2626" }}>{err}</p>}
    </div>
  );
}

function DeleteButton({ id, name, onDone }: { id: string; name: string; onDone: () => void }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  return (
    <span className="relative inline-flex">
      <button onClick={() => setOpen((o) => !o)} className="dc-act dc-act-sm" title="Delete" style={{ color: "#dc2626" }}><Icon name="trash" className="h-4 w-4" /></button>
      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-9 z-40 w-52 dc-card p-3" style={{ boxShadow: "var(--a-shadow-lg)" }}>
            <p className="text-sm font-semibold mb-1">Delete “{name}”?</p>
            <p className="text-xs dc-muted mb-3">Products keep existing but lose this category.</p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setOpen(false)} className="dc-btn">Cancel</button>
              <button disabled={busy} onClick={async () => { setBusy(true); await deleteCategory(id); setBusy(false); setOpen(false); onDone(); }} className="dc-btn disabled:opacity-60" style={{ background: "#dc2626", borderColor: "#dc2626", color: "#fff" }}>{busy ? "…" : "Delete"}</button>
            </div>
          </div>
        </>
      )}
    </span>
  );
}

export function CategoryManager({ categories }: { categories: CategoryRow[] }) {
  const router = useRouter();
  const [nameBn, setNameBn] = useState("");
  const [nameEn, setNameEn] = useState("");
  const [sort, setSort] = useState("0");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [movingId, setMovingId] = useState<string | null>(null);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!nameBn.trim() && !nameEn.trim()) return setError("Enter a name.");
    setBusy(true);
    const res = await saveCategory({ name_bn: nameBn, name_en: nameEn, sort_order: Number(sort) });
    setBusy(false);
    if (!res.ok) return setError(res.error ?? "Failed.");
    setNameBn(""); setNameEn(""); setSort("0");
    router.refresh();
  }

  async function move(id: string, direction: "up" | "down") {
    setMovingId(id);
    await reorderCategory(id, direction);
    setMovingId(null);
    router.refresh();
  }

  return (
    <div>
      {/* Add form */}
      <form onSubmit={add} className="dc-card p-4 mb-4">
        <div className="flex flex-wrap gap-3 items-end">
          <div className="min-w-[150px] flex-1"><label className="block text-[12px] dc-muted mb-1">Name (Bangla)</label><input value={nameBn} onChange={(e) => setNameBn(e.target.value)} className="dc-input" placeholder="e.g. বিছানাপত্র" /></div>
          <div className="min-w-[150px] flex-1"><label className="block text-[12px] dc-muted mb-1">Name (English)</label><input value={nameEn} onChange={(e) => setNameEn(e.target.value)} className="dc-input" placeholder="e.g. Bedding" /></div>
          <div><label className="block text-[12px] dc-muted mb-1">Order</label><input value={sort} onChange={(e) => setSort(e.target.value)} inputMode="numeric" className="dc-input w-20" /></div>
          <button disabled={busy} className="dc-btn dc-btn-solid disabled:opacity-60" style={{ background: "var(--a-violet)", borderColor: "var(--a-violet)" }}><Icon name="plus" className="h-4 w-4" /> {busy ? "Adding…" : "Add category"}</button>
        </div>
        {error && <p className="mt-2 text-sm" style={{ color: "#dc2626" }}>{error}</p>}
      </form>

      {/* List */}
      {categories.length === 0 ? (
        <p className="text-center dc-muted py-12">No categories yet.</p>
      ) : (
        <div className="space-y-2">
          {categories.map((c, i) => (
            <div key={c.id} className="dc-card p-3 flex items-center gap-3">
              {/* Reorder arrows */}
              <div className="flex flex-col shrink-0">
                <button onClick={() => move(c.id, "up")} disabled={i === 0 || movingId === c.id} className="dc-act dc-act-sm disabled:opacity-30" title="Move up"><Icon name="chevronDown" className="h-3.5 w-3.5 rotate-180" /></button>
                <button onClick={() => move(c.id, "down")} disabled={i === categories.length - 1 || movingId === c.id} className="dc-act dc-act-sm disabled:opacity-30" title="Move down"><Icon name="chevronDown" className="h-3.5 w-3.5" /></button>
              </div>

              {editId === c.id ? (
                <EditRow c={c} onDone={() => { setEditId(null); router.refresh(); }} />
              ) : (
                <>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-[14px] truncate">{c.name_bn || c.name_en}</p>
                      <span className="text-[10.5px] font-semibold px-1.5 py-0.5 rounded-full" style={{ background: "var(--a-violet-soft)", color: "var(--a-violet)" }}>
                        {c.products} product{c.products === 1 ? "" : "s"}
                      </span>
                      {c.products > 0 && c.activeProducts < c.products && (
                        <span className="text-[10.5px] font-medium" style={{ color: "var(--a-faint)" }}>({c.activeProducts} active)</span>
                      )}
                    </div>
                    <p className="text-[11.5px]" style={{ color: "var(--a-faint)" }}>{c.slug} · order {c.sort_order}</p>
                  </div>
                  <div className="flex items-center gap-0.5 shrink-0">
                    <a href={`/admin/products`} className="dc-act dc-act-sm" title="View products"><Icon name="eye" className="h-4 w-4" /></a>
                    <button onClick={() => setEditId(c.id)} className="dc-act dc-act-sm" title="Edit"><Icon name="edit" className="h-4 w-4" /></button>
                    <DeleteButton id={c.id} name={c.name_bn || c.name_en} onDone={() => router.refresh()} />
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
