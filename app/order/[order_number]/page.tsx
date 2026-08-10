// Thank-you / order confirmation page (server component).
import Image from "next/image";
import { getServerSupabase } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { taka } from "@/lib/format";
import { getStoreSettings } from "@/lib/settings";
import { getLandingConfig } from "@/lib/landing";
import { PurchasePixel } from "./PurchasePixel";

export const dynamic = "force-dynamic";

async function getOrder(orderNumber: string) {
  const supabase = getServerSupabase();
  const { data: order } = await supabase
    .from("orders")
    .select("*")
    .eq("order_number", orderNumber)
    .single();
  if (!order) return null;
  const { data: items } = await supabase
    .from("order_items")
    .select("*")
    .eq("order_id", order.id);
  return { order, items: items ?? [] };
}

const STEPS = [
  { icon: "📞", title: "কল করে কনফার্ম", text: "আমরা শীঘ্রই আপনাকে কল করে অর্ডারটি নিশ্চিত করব।" },
  { icon: "📦", title: "প্যাকেজিং ও কুরিয়ার", text: "যত্নসহকারে প্যাক করে কুরিয়ারে পাঠানো হবে।" },
  { icon: "🚚", title: "ডেলিভারি ও পেমেন্ট", text: "পণ্য হাতে পেয়ে ক্যাশ অন ডেলিভারিতে টাকা দিন।" },
];

export default async function OrderPage({
  params,
}: {
  params: { order_number: string };
}) {
  const [data, store, landing] = await Promise.all([
    getOrder(params.order_number),
    getStoreSettings(),
    getLandingConfig(),
  ]);
  if (!data) notFound();
  const { order, items } = data;

  return (
    <div className="max-w-2xl mx-auto relative">
      {/* celebratory hearts burst */}
      <div aria-hidden className="pointer-events-none absolute inset-x-0 -top-4 h-40 overflow-hidden">
        {Array.from({ length: 12 }).map((_, i) => (
          <span
            key={i}
            className="absolute text-2xl"
            style={{
              left: `${6 + i * 8}%`,
              color: i % 2 ? "#F0A0C0" : "#5FB4E4",
              animation: `dc-burst 1.5s ease-out ${i * 0.07}s both`,
            }}
          >
            ♥
          </span>
        ))}
      </div>

      {/* logo */}
      <div className="flex justify-center pt-2 pb-4">
        <Image src={landing.logoUrl || "/logo.png"} alt="Dream Comfort" width={220} height={80} priority sizes="220px" className="h-20 w-auto object-contain" />
      </div>

      <div className="rounded-[2rem] overflow-hidden bg-white shadow-soft ring-1 ring-brand/10">
        {/* success header */}
        <div className="relative bg-gradient-to-br from-brand to-accent text-white p-8 text-center">
          <div className="mx-auto h-20 w-20 rounded-full bg-white/20 backdrop-blur flex items-center justify-center dc-pop">
            <div className="h-14 w-14 rounded-full bg-white text-accent-dark flex items-center justify-center text-4xl font-bold">✓</div>
          </div>
          <h1 className="mt-4 font-display text-2xl md:text-3xl font-bold">ধন্যবাদ! আপনার অর্ডার পেয়েছি 💕</h1>
          <p className="mt-1 text-white/90">আমরা শীঘ্রই কল করে অর্ডারটি নিশ্চিত করব।</p>
          <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-4 py-1.5 text-sm">
            অর্ডার নম্বর <span className="font-bold">{order.order_number}</span>
          </div>
        </div>

        <div className="p-5 md:p-6">
          {/* items */}
          <div className="rounded-2xl bg-cream-deep/50 p-4 space-y-2 text-sm">
            {items.map((it: any) => (
              <div key={it.id} className="flex justify-between">
                <span className="truncate pr-2">{it.product_name} × {it.quantity}</span>
                <span>{taka(Number(it.line_total))}</span>
              </div>
            ))}
            <div className="flex justify-between border-t border-black/5 pt-2">
              <span className="text-gray-500">ডেলিভারি</span>
              <span>{Number(order.shipping_fee) === 0 ? "ফ্রি 🎉" : taka(Number(order.shipping_fee))}</span>
            </div>
            <div className="flex justify-between font-bold text-lg">
              <span>সর্বমোট</span>
              <span className="text-accent-dark">{taka(Number(order.total))}</span>
            </div>
          </div>

          {/* customer */}
          <div className="mt-4 grid sm:grid-cols-2 gap-3 text-sm">
            <div className="rounded-2xl border border-brand/10 p-4">
              <p className="text-gray-400 text-xs mb-1">গ্রাহক</p>
              <p className="font-semibold">{order.customer_name}</p>
              <p className="text-gray-600">{order.customer_phone}</p>
            </div>
            <div className="rounded-2xl border border-brand/10 p-4">
              <p className="text-gray-400 text-xs mb-1">ডেলিভারি ঠিকানা</p>
              <p className="text-gray-700">{order.address_line}</p>
              <p className="mt-1 text-xs text-brand-dark">💵 ক্যাশ অন ডেলিভারি</p>
            </div>
          </div>

          {/* next steps */}
          <div className="mt-5">
            <h2 className="font-display font-bold mb-3">পরবর্তী ধাপ</h2>
            <div className="grid sm:grid-cols-3 gap-3">
              {STEPS.map((s, i) => (
                <div key={i} className="rounded-2xl bg-gradient-to-br from-brand-soft to-accent-soft/60 p-4 text-center">
                  <div className="text-3xl">{s.icon}</div>
                  <p className="mt-1 font-semibold text-sm">{s.title}</p>
                  <p className="mt-0.5 text-xs text-gray-600">{s.text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* actions */}
      <div className="mt-6 flex flex-wrap gap-3 justify-center">
        <a href="/" className="rounded-2xl bg-brand text-white px-6 py-3 font-bold hover:bg-brand-dark transition">
          🏠 হোমে ফিরে যান
        </a>
        <a href={`tel:${store.phone}`} className="rounded-2xl border-2 border-accent/40 text-accent-dark px-6 py-3 font-bold hover:bg-accent-soft transition">
          📞 {store.phone}
        </a>
      </div>

      {/* location + trust */}
      <div className="mt-5 rounded-2xl bg-white/70 ring-1 ring-brand/10 p-4 text-center text-sm text-gray-600">
        <p>📍 {store.address}</p>
        <div className="mt-2 flex flex-wrap justify-center gap-2 text-xs">
          <span className="rounded-full bg-brand-soft text-brand-dark px-3 py-1">✓ ৩ দিনের মানিব্যাক গ্যারান্টি</span>
          <span className="rounded-full bg-accent-soft text-accent-dark px-3 py-1">✓ ফ্রি রিটার্ন</span>
          <span className="rounded-full bg-brand-soft text-brand-dark px-3 py-1">✓ সারা দেশে ডেলিভারি</span>
        </div>
      </div>

      <PurchasePixel
        eventId={order.event_id ?? null}
        value={Number(order.total)}
        contentIds={items.map((it: any) => it.product_id).filter(Boolean)}
      />
    </div>
  );
}
