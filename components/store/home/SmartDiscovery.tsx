"use client";

// SmartDiscovery — beat 02. A premium shopping-assistant interaction: the mother
// tells us where she is in her journey, and we surface the right products from the
// real catalog (client-side keyword match over name + category). No new backend.

import { useMemo, useState } from "react";
import type { Product, Category } from "@/lib/types";
import { SoftProductCard } from "@/components/store/home/SoftProductCard";

type PersonaKey = "pregnant" | "newmom" | "baby" | "comfort" | "gift";

const PERSONAS: { key: PersonaKey; label: string; hint: string; keywords: string[]; d: string }[] = [
  { key: "pregnant", label: "আমি গর্ভবতী", hint: "গর্ভাবস্থার যত্ন", keywords: ["pregn", "maternity", "pillow", "পিলো", "গর্ভ", "প্রেগ", "ম্যাটার"], d: "M12 21c4-4 7-7 7-11a7 7 0 10-14 0c0 4 3 7 7 11z M12 12a3 3 0 100-6 3 3 0 000 6z" },
  { key: "newmom", label: "আমি নতুন মা", hint: "মায়ের যত্ন", keywords: ["mom", "mother", "মা", "feeding", "ফিডিং", "nursing", "postpartum", "breast", "কেয়ার"], d: "M12 8a4 4 0 100-8 4 4 0 000 8z M4 21c0-4 4-6 8-6s8 2 8 6" },
  { key: "baby", label: "শিশুর জন্য", hint: "বেবি কেয়ার", keywords: ["baby", "শিশু", "বেবি", "infant", "newborn", "নবজাত", "diaper", "ডায়াপার"], d: "M9 12h.01M15 12h.01M9.5 16c.8.6 1.6.9 2.5.9s1.7-.3 2.5-.9M12 3a9 9 0 100 18 9 9 0 000-18z" },
  { key: "comfort", label: "মায়ের আরামের জন্য", hint: "ঘুম ও আরাম", keywords: ["pillow", "পিলো", "sleep", "স্লিপ", "comfort", "আরাম", "cushion", "কুশন", "mattress", "বিছানা", "bed"], d: "M3 12h18M5 12V8a2 2 0 012-2h10a2 2 0 012 2v4M3 12v6M21 12v6M6 18h12" },
  { key: "gift", label: "উপহার দিতে চাই", hint: "সেরা বাছাই", keywords: [], d: "M20 12v9H4v-9M2 7h20v5H2zM12 22V7M12 7S9 2 6.5 4 8 7 12 7zM12 7s3-5 5.5-3S16 7 12 7z" },
];

export function SmartDiscovery({ products, categories }: { products: Product[]; categories: Category[] }) {
  const [active, setActive] = useState<PersonaKey>("pregnant");

  const catById = useMemo(() => {
    const m = new Map<string, string>();
    categories.forEach((c) => m.set(c.id, `${c.name_bn || ""} ${c.name_en || ""} ${c.slug}`.toLowerCase()));
    return m;
  }, [categories]);

  const matches = useMemo(() => {
    const persona = PERSONAS.find((p) => p.key === active)!;
    if (persona.key === "gift") {
      return [...products]
        .sort((a, b) => (b.review_count ?? 0) - (a.review_count ?? 0) || (b.rating ?? 0) - (a.rating ?? 0))
        .slice(0, 4);
    }
    const kw = persona.keywords;
    const hay = (p: Product) =>
      `${p.name_en || ""} ${p.name_bn || ""} ${p.slug} ${p.category_id ? catById.get(p.category_id) || "" : ""}`.toLowerCase();
    const hit = products.filter((p) => kw.some((k) => hay(p).includes(k)));
    const list = hit.length >= 2 ? hit : products;
    return list.slice(0, 4);
  }, [active, products, catById]);

  return (
    <section className="mx-auto max-w-6xl px-5 sm:px-6 py-16 sm:py-20">
      <div className="text-center max-w-xl mx-auto">
        <p className="sc-eyebrow text-blush-deep">০২ — আবিষ্কার</p>
        <h2 className="mt-3 font-sans font-bold text-ink text-[26px] sm:text-[32px] leading-tight">আপনি কী খুঁজছেন?</h2>
        <p className="mt-2 text-ink-muted text-[14.5px]">একটি বেছে নিন — আমরা আপনার জন্য সঠিক পণ্য সাজিয়ে দিচ্ছি।</p>
      </div>

      <div className="mt-8 flex flex-wrap justify-center gap-2.5">
        {PERSONAS.map((p) => {
          const on = p.key === active;
          return (
            <button
              key={p.key}
              onClick={() => setActive(p.key)}
              className={`group inline-flex items-center gap-2.5 rounded-full px-4 sm:px-5 py-3 text-[13.5px] font-semibold transition-all duration-300 ease-soft-spring ring-1 ${
                on ? "bg-ink text-white ring-ink shadow-card" : "bg-white text-ink-soft ring-ink/[0.08] hover:ring-blush hover:text-ink"
              }`}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className={on ? "text-blush-light" : "text-blush-deep"}><path d={p.d} /></svg>
              {p.label}
            </button>
          );
        })}
      </div>

      <div className="mt-10 grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
        {matches.map((p) => <SoftProductCard key={p.id} p={p} />)}
      </div>

      <div className="mt-8 text-center">
        <a href="/products" className="inline-flex items-center gap-1.5 text-[14px] font-semibold text-ink hover:text-blush-deep transition">
          এই ধরনের সব পণ্য দেখুন
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
        </a>
      </div>
    </section>
  );
}
