"use client";

import { useState } from "react";
import { subscribeNewsletter } from "@/app/newsletter-actions";

export function NewsletterSignup({ source = "home" }: { source?: string }) {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setErr(null); setBusy(true);
    const res = await subscribeNewsletter(email, source);
    setBusy(false);
    if (!res.ok) { setErr(res.error ?? "ব্যর্থ।"); return; }
    setDone(true); setEmail("");
  }

  return (
    <div className="rounded-3xl bg-gradient-to-br from-brand to-brand-dark text-white p-6 sm:p-8 text-center overflow-hidden relative">
      <h3 className="font-display text-xl sm:text-2xl font-bold">নতুন অফার সবার আগে পান</h3>
      <p className="mt-1.5 text-white/85 text-sm max-w-md mx-auto">ইমেইল দিন — নতুন পণ্য, বিশেষ ছাড় ও আপডেট সরাসরি আপনার ইনবক্সে।</p>
      {done ? (
        <p className="mt-4 inline-block rounded-xl bg-white/15 px-5 py-3 font-semibold">ধন্যবাদ! আপনি সাবস্ক্রাইব করেছেন ✓</p>
      ) : (
        <form onSubmit={submit} className="mt-4 flex flex-col sm:flex-row gap-2.5 max-w-md mx-auto">
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com"
            className="flex-1 rounded-xl px-4 py-3 text-gray-900 text-[15px] outline-none" />
          <button type="submit" disabled={busy} className="rounded-xl bg-white text-brand-dark font-bold px-6 py-3 hover:bg-white/90 disabled:opacity-70 whitespace-nowrap">
            {busy ? "..." : "সাবস্ক্রাইব"}
          </button>
        </form>
      )}
      {err && <p className="mt-2 text-sm text-white/90">{err}</p>}
    </div>
  );
}
