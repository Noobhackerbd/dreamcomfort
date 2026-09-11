// app/worker/page.tsx — the worker panel has NO shared list. Each worker opens their
// OWN private link (/worker/<id>) that the owner shares individually.
import type { Metadata } from "next";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "কর্মী প্যানেল", robots: { index: false, follow: false } };

export default function WorkerIndex() {
  return (
    <div className="max-w-md mx-auto px-4 py-16 text-center">
      <div className="mx-auto mb-4 h-14 w-14 rounded-full bg-brand-soft text-brand-dark grid place-items-center">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="h-7 w-7"><path d="M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1" /><path d="M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1" /></svg>
      </div>
      <h1 className="font-display text-2xl font-bold text-gray-900">কর্মী প্যানেল</h1>
      <p className="mt-2 text-gray-500 leading-relaxed">
        আপনার নিজের ব্যক্তিগত লিংক দিয়ে প্রবেশ করুন।<br />
        লিংক না থাকলে মালিকের কাছ থেকে সংগ্রহ করুন।
      </p>
    </div>
  );
}
