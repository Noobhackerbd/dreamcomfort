"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { saveCategory, deleteCategory } from "./actions";
import type { Category } from "@/lib/types";

export function CategoryManager({ categories }: { categories: Category[] }) {
  const router = useRouter();
  const [nameBn, setNameBn] = useState("");
  const [nameEn, setNameEn] = useState("");
  const [sort, setSort] = useState("0");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputCls = "rounded-lg border px-3 py-2 text-sm outline-none focus:border-brand";

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!nameBn.trim() && !nameEn.trim()) return setError("নাম লিখুন।");
    setBusy(true);
    const res = await saveCategory({
      name_bn: nameBn,
      name_en: nameEn,
      sort_order: Number(sort),
    });
    setBusy(false);
    if (!res.ok) return setError(res.error ?? "ব্যর্থ।");
    setNameBn("");
    setNameEn("");
    setSort("0");
    router.refresh();
  }

  return (
    <div>
      <form onSubmit={add} className="flex flex-wrap gap-2 items-end mb-6 rounded-xl border bg-white p-4">
        <div>
          <label className="block text-xs mb-1">নাম (বাংলা)</label>
          <input value={nameBn} onChange={(e) => setNameBn(e.target.value)} className={inputCls} placeholder="যেমন: বিছানাপত্র" />
        </div>
        <div>
          <label className="block text-xs mb-1">Name (English)</label>
          <input value={nameEn} onChange={(e) => setNameEn(e.target.value)} className={inputCls} placeholder="e.g. Bedding" />
        </div>
        <div>
          <label className="block text-xs mb-1">ক্রম</label>
          <input value={sort} onChange={(e) => setSort(e.target.value)} inputMode="numeric" className={inputCls + " w-20"} />
        </div>
        <button disabled={busy} className="rounded-lg bg-brand text-white px-5 py-2 text-sm disabled:opacity-60">
          {busy ? "..." : "+ যোগ করুন"}
        </button>
        {error && <p className="w-full text-red-600 text-sm">{error}</p>}
      </form>

      <div className="rounded-xl border bg-white divide-y">
        {categories.length === 0 && (
          <p className="px-4 py-8 text-center text-gray-400">কোনো ক্যাটাগরি নেই।</p>
        )}
        {categories.map((c) => (
          <div key={c.id} className="flex items-center justify-between px-4 py-3">
            <div>
              <p className="font-medium">{c.name_bn || c.name_en}</p>
              <p className="text-xs text-gray-400">{c.slug} · ক্রম {c.sort_order}</p>
            </div>
            <button
              onClick={async () => {
                if (!confirm("এই ক্যাটাগরি ডিলিট করবেন?")) return;
                await deleteCategory(c.id);
                router.refresh();
              }}
              className="text-red-500 text-sm hover:underline"
            >
              ডিলিট
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
