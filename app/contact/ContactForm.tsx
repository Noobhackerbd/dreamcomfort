"use client";

import { useState } from "react";
import { fireEvent } from "@/components/track";

export function ContactForm() {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState(false);
  const inputCls = "w-full rounded-lg border px-4 py-3 outline-none focus:border-brand";

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) return;
    // Lead — browser Pixel + server CAPI, shared event_id. Improves audience matching.
    fireEvent(
      "Lead",
      { content_name: "contact_form" },
      { firstName: name.split(" ")[0], phone }
    );
    setSent(true);
  }

  if (sent) {
    return (
      <div className="rounded-xl border bg-green-50 border-green-200 text-green-700 p-6 text-center">
        ধন্যবাদ! আপনার মেসেজ পেয়েছি। আমরা শীঘ্রই যোগাযোগ করব।
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label className="block text-sm mb-1">আপনার নাম</label>
        <input value={name} onChange={(e) => setName(e.target.value)} className={inputCls} />
      </div>
      <div>
        <label className="block text-sm mb-1">মোবাইল নম্বর</label>
        <input value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="numeric" placeholder="০১XXXXXXXXX" className={inputCls} />
      </div>
      <div>
        <label className="block text-sm mb-1">মেসেজ</label>
        <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={4} className={inputCls} />
      </div>
      <button className="rounded-lg bg-brand text-white px-6 py-3 font-medium hover:bg-brand-dark">
        পাঠান
      </button>
    </form>
  );
}
