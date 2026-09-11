"use client";

import { useState, useMemo } from "react";
import { createTicket } from "@/app/account/support-actions";

const FAQS: { q: string; a: string; tags: string }[] = [
  { q: "ডেলিভারিতে কত দিন লাগে?", a: "ঢাকার ভেতরে সাধারণত ১–২ কর্মদিবস, ঢাকার বাইরে ২–৪ কর্মদিবস লাগে। অর্ডার কনফার্ম হওয়ার পর কুরিয়ারে পাঠানো হয়।", tags: "ডেলিভারি সময় shipping delivery" },
  { q: "পেমেন্ট কীভাবে করব?", a: "আমরা ক্যাশ অন ডেলিভারি (COD) সাপোর্ট করি — পণ্য হাতে পেয়ে ডেলিভারিম্যানকে টাকা দিন। আগে কোনো টাকা দিতে হয় না।", tags: "payment cod ক্যাশ পেমেন্ট" },
  { q: "ডেলিভারি চার্জ কত?", a: "ঢাকার ভেতরে ও বাইরে চার্জ ভিন্ন হতে পারে — চেকআউটে আপনার এলাকা অনুযায়ী সঠিক চার্জ দেখানো হয়।", tags: "delivery charge চার্জ shipping" },
  { q: "পণ্য রিটার্ন বা এক্সচেঞ্জ করা যাবে?", a: "পণ্যে সমস্যা থাকলে ডেলিভারির পর নির্দিষ্ট সময়ের মধ্যে রিটার্ন/এক্সচেঞ্জ করা যায়। বিস্তারিত জানতে আমাদের সাপোর্টে টিকিট খুলুন বা WhatsApp করুন।", tags: "return refund exchange রিটার্ন রিফান্ড" },
  { q: "অর্ডার কীভাবে ট্র্যাক করব?", a: "‘অর্ডার ট্র্যাক’ পেজে গিয়ে অর্ডার নম্বর ও মোবাইল নম্বর দিলে বর্তমান অবস্থা দেখতে পাবেন। অ্যাকাউন্ট থাকলে ড্যাশবোর্ড থেকেও দেখা যায়।", tags: "track tracking অর্ডার ট্র্যাক" },
  { q: "অর্ডার বাতিল করতে চাই।", a: "পণ্য কুরিয়ারে পাঠানোর আগে হলে বাতিল করা যায়। দ্রুত আমাদের কল করুন বা সাপোর্ট টিকিট খুলুন।", tags: "cancel বাতিল order" },
  { q: "কীভাবে অ্যাকাউন্ট তৈরি করব?", a: "উপরে ডান পাশে অ্যাকাউন্ট আইকনে ক্লিক করে ‘অ্যাকাউন্ট তৈরি করুন’ — নাম, ফোন, ইমেইল ও পাসওয়ার্ড দিলেই হয়ে যাবে।", tags: "account signup register অ্যাকাউন্ট" },
];

const CATS = [
  { key: "order", label: "অর্ডার সংক্রান্ত" },
  { key: "return", label: "রিটার্ন / রিফান্ড" },
  { key: "payment", label: "পেমেন্ট" },
  { key: "general", label: "সাধারণ" },
];

export function HelpCenter({ prefill }: { prefill?: { name?: string; phone?: string; email?: string } }) {
  const [query, setQuery] = useState("");
  const [openIdx, setOpenIdx] = useState<number | null>(0);

  const [name, setName] = useState(prefill?.name || "");
  const [phone, setPhone] = useState((prefill?.phone || "").replace(/^88/, ""));
  const [email, setEmail] = useState(prefill?.email || "");
  const [subject, setSubject] = useState("");
  const [category, setCategory] = useState("order");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const filtered = useMemo(() => {
    const s = query.trim().toLowerCase();
    if (!s) return FAQS;
    return FAQS.filter((f) => (f.q + " " + f.a + " " + f.tags).toLowerCase().includes(s));
  }, [query]);

  const input = "w-full rounded-xl border border-black/10 bg-white px-4 py-3 text-[15px] outline-none focus:border-brand focus:ring-2 focus:ring-brand/15 transition";
  const label = "block text-[13px] font-medium text-gray-600 mb-1.5";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null); setBusy(true);
    const res = await createTicket({ name, phone, email, subject, category, message });
    setBusy(false);
    if (!res.ok) { setErr(res.error ?? "ব্যর্থ।"); return; }
    setDone(true); setSubject(""); setMessage("");
  }

  return (
    <div className="space-y-10">
      {/* Search */}
      <div className="relative max-w-xl mx-auto">
        <svg viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.8" className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5"><circle cx="11" cy="11" r="7" /><path d="M21 21l-4-4" /></svg>
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="প্রশ্ন খুঁজুন — যেমন ডেলিভারি, রিটার্ন..." className="w-full rounded-2xl border border-black/10 bg-white pl-12 pr-4 py-3.5 text-[15px] outline-none focus:border-brand focus:ring-2 focus:ring-brand/15 shadow-sm" />
      </div>

      {/* FAQ */}
      <div className="max-w-2xl mx-auto">
        <h2 className="font-display text-xl font-bold text-gray-900 mb-4">সাধারণ প্রশ্ন</h2>
        {filtered.length === 0 ? (
          <p className="text-sm text-gray-500">কোনো ফলাফল নেই — নিচের ফর্মে আমাদের প্রশ্ন করুন।</p>
        ) : (
          <div className="space-y-2.5">
            {filtered.map((f, i) => {
              const open = openIdx === i;
              return (
                <div key={f.q} className="rounded-2xl bg-white ring-1 ring-black/5 shadow-sm overflow-hidden">
                  <button onClick={() => setOpenIdx(open ? null : i)} className="w-full flex items-center justify-between gap-3 px-5 py-4 text-left">
                    <span className="font-semibold text-[15px] text-gray-900">{f.q}</span>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={"h-4 w-4 shrink-0 text-gray-400 transition-transform " + (open ? "rotate-180" : "")}><path d="M6 9l6 6 6-6" /></svg>
                  </button>
                  {open && <p className="px-5 pb-4 -mt-1 text-sm text-gray-600 leading-relaxed">{f.a}</p>}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Contact form */}
      <div className="max-w-2xl mx-auto">
        <h2 className="font-display text-xl font-bold text-gray-900 mb-1">এখনো প্রশ্ন আছে?</h2>
        <p className="text-sm text-gray-500 mb-4">আমাদের একটি বার্তা পাঠান — আমরা দ্রুত উত্তর দেব।</p>
        {done ? (
          <div className="rounded-3xl bg-green-50 ring-1 ring-green-200 px-5 py-8 text-center">
            <p className="font-semibold text-green-700">আপনার বার্তা পাঠানো হয়েছে ✓</p>
            <p className="text-sm text-green-600 mt-1">আমরা শীঘ্রই যোগাযোগ করব। অ্যাকাউন্ট থাকলে ড্যাশবোর্ডে উত্তর দেখতে পাবেন।</p>
          </div>
        ) : (
          <form onSubmit={submit} className="rounded-3xl bg-white ring-1 ring-black/5 shadow-sm p-6 space-y-3.5">
            <div className="grid sm:grid-cols-2 gap-3.5">
              <div><label className={label}>নাম *</label><input value={name} onChange={(e) => setName(e.target.value)} className={input} /></div>
              <div><label className={label}>মোবাইল *</label><input value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="numeric" className={input} placeholder="01XXXXXXXXX" /></div>
            </div>
            <div className="grid sm:grid-cols-2 gap-3.5">
              <div><label className={label}>ইমেইল (ঐচ্ছিক)</label><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={input} /></div>
              <div>
                <label className={label}>বিষয়ের ধরন</label>
                <select value={category} onChange={(e) => setCategory(e.target.value)} className={input}>{CATS.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}</select>
              </div>
            </div>
            <div><label className={label}>বিষয় *</label><input value={subject} onChange={(e) => setSubject(e.target.value)} className={input} placeholder="সংক্ষেপে" /></div>
            <div><label className={label}>বার্তা *</label><textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={4} className={input} /></div>
            {err && <p className="rounded-xl bg-red-50 text-red-600 text-sm px-3 py-2">{err}</p>}
            <button type="submit" disabled={busy} className="rounded-xl bg-brand text-white px-6 py-3 font-semibold hover:bg-brand-dark disabled:opacity-60 transition">{busy ? "..." : "বার্তা পাঠান"}</button>
          </form>
        )}
      </div>
    </div>
  );
}
