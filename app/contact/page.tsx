import type { Metadata } from "next";
import { STORE } from "@/lib/config";
import { ContactForm } from "./ContactForm";

export const metadata: Metadata = {
  title: "যোগাযোগ",
  description: `${STORE.name} এর সাথে যোগাযোগ করুন — ফোন, ইমেইল বা মেসেজ।`,
};

export default function ContactPage() {
  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">যোগাযোগ করুন</h1>

      <div className="grid gap-3 sm:grid-cols-3 mb-8 text-center text-sm">
        <a href={`tel:${STORE.phone}`} className="rounded-xl border bg-white py-4 hover:border-brand">
          <div className="text-2xl">📞</div>
          <div className="mt-1">{STORE.phone}</div>
        </a>
        <a href={`mailto:${STORE.email}`} className="rounded-xl border bg-white py-4 hover:border-brand">
          <div className="text-2xl">✉️</div>
          <div className="mt-1 break-all">{STORE.email}</div>
        </a>
        <a href={STORE.facebook} target="_blank" rel="noopener" className="rounded-xl border bg-white py-4 hover:border-brand">
          <div className="text-2xl">💬</div>
          <div className="mt-1">Facebook</div>
        </a>
      </div>

      <ContactForm />
    </div>
  );
}
