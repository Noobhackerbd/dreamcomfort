import type { Metadata } from "next";
import { getStoreSettings } from "@/lib/settings";
import { getCustomerSession } from "@/lib/customer-auth";
import { HelpCenter } from "@/components/store/HelpCenter";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "সাহায্য কেন্দ্র",
  description: "সাধারণ প্রশ্নের উত্তর, অর্ডার সহায়তা ও যোগাযোগ।",
};

function waLink(phone: string): string {
  let n = (phone || "").replace(/\D/g, "");
  if (n.startsWith("00")) n = n.slice(2);
  if (n.startsWith("0")) n = "88" + n; else if (n.startsWith("1")) n = "880" + n; else if (!n.startsWith("880")) n = "880" + n;
  return "https://wa.me/" + n;
}

export default async function HelpPage() {
  const [store, session] = await Promise.all([getStoreSettings(), getCustomerSession()]);
  const prefill = session ? { name: session.profile?.name || "", phone: session.profile?.phone || "", email: session.email || "" } : undefined;

  const tiles = [
    { label: "WhatsApp", sub: "দ্রুত উত্তর", href: waLink(store.phone), color: "#25D366", icon: (<path fill="currentColor" d="M12 2a10 10 0 0 0-8.5 15.3L2 22l4.8-1.5A10 10 0 1 0 12 2zm5.8 14.2c-.25.7-1.45 1.32-2 1.37-.55.05-1.06.24-3.57-.75-3-1.2-4.9-4.28-5.05-4.48-.15-.2-1.2-1.6-1.2-3.05s.76-2.16 1.03-2.46c.27-.3.59-.37.79-.37h.57c.18 0 .43-.07.67.51.25.6.84 2.05.91 2.2.07.15.12.32.02.51-.34.68-.7.65-.4 1.16.82 1.4 1.63 1.88 2.86 2.5.3.15.46.12.62-.07.16-.19.7-.8.88-1.08.18-.28.36-.23.61-.14.25.09 1.6.75 1.87.89.21.1.35.15.4.24.05.09.05.53-.2 1.24z" /> ) },
    { label: "Messenger", sub: "চ্যাট করুন", href: store.facebook || "#", color: "#0084FF", icon: (<path fill="currentColor" d="M12 2C6.3 2 2 6.2 2 11.7c0 2.9 1.18 5.4 3.1 7.12V22l2.9-1.6c.9.25 1.85.4 2.99.4 5.7 0 10-4.2 10-9.7S17.7 2 12 2zm1 13l-2.5-2.7L5.7 15l5.3-5.6 2.6 2.7 4.7-2.7L13 15z" /> ) },
    { label: "কল করুন", sub: store.phone, href: `tel:${(store.phone || "").replace(/[^\d+]/g, "")}`, color: "#0891b2", icon: (<path fill="currentColor" d="M6.62 10.79a15.5 15.5 0 0 0 6.59 6.59l2.2-2.2a1 1 0 0 1 1.02-.24c1.12.37 2.33.57 3.57.57a1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.24.2 2.45.57 3.57a1 1 0 0 1-.24 1.02l-2.2 2.2z" /> ) },
    { label: "অর্ডার ট্র্যাক", sub: "অবস্থা দেখুন", href: "/track-order", color: "#6d5ae6", icon: (<><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="1.8" /><path d="M12 7v5l3 2" fill="none" stroke="currentColor" strokeWidth="1.8" /></>) },
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <div className="text-center mb-8">
        <h1 className="font-display text-3xl font-bold text-gray-900">কিভাবে সাহায্য করতে পারি?</h1>
        <p className="mt-2 text-gray-500">উত্তর খুঁজুন, অথবা সরাসরি আমাদের সাথে যোগাযোগ করুন।</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-10">
        {tiles.map((t) => (
          <a key={t.label} href={t.href} target={t.href.startsWith("http") ? "_blank" : undefined} rel="noopener"
            className="rounded-2xl bg-white ring-1 ring-black/5 shadow-sm p-4 text-center hover:shadow-md hover:-translate-y-0.5 transition">
            <span className="mx-auto mb-2 grid place-items-center h-11 w-11 rounded-full" style={{ background: t.color + "1a", color: t.color }}>
              <svg viewBox="0 0 24 24" className="h-6 w-6">{t.icon}</svg>
            </span>
            <p className="font-semibold text-sm text-gray-900">{t.label}</p>
            <p className="text-[11px] text-gray-400 mt-0.5 truncate">{t.sub}</p>
          </a>
        ))}
      </div>

      <HelpCenter prefill={prefill} />
    </div>
  );
}
