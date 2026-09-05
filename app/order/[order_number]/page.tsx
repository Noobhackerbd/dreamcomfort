// Thank-you / order confirmation page (server component).
import { Suspense } from "react";
import { getServerSupabase } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { taka } from "@/lib/format";
import { getStoreSettings } from "@/lib/settings";
import { PurchasePixel } from "./PurchasePixel";

export const dynamic = "force-dynamic";

// Streamed shell → navigation to this page completes INSTANTLY with this skeleton,
// then the order details fill in as the DB query resolves (feels sub-second).
function OrderSkeleton() {
  return (
    <div className="max-w-2xl mx-auto">
      <div className="pt-2" />
      <div className="rounded-3xl overflow-hidden bg-white shadow-sm ring-1 ring-black/5">
        <div className="border-b border-black/5 px-6 py-8 text-center">
          <div className="mx-auto h-16 w-16 rounded-full bg-green-50 ring-1 ring-green-200 flex items-center justify-center">
            <span className="text-3xl text-green-600 font-bold">✓</span>
          </div>
          <h1 className="mt-4 font-display text-2xl md:text-[26px] font-bold text-gray-900">অর্ডার সফলভাবে গৃহীত হয়েছে</h1>
          <p className="mt-3 text-sm text-gray-400">বিস্তারিত লোড হচ্ছে…</p>
          <div className="mt-6 flex justify-center"><span className="dc-dots" /></div>
        </div>
        <div className="p-6 space-y-3">
          <div className="h-16 rounded-2xl bg-gray-100 animate-pulse" />
          <div className="h-16 rounded-2xl bg-gray-100 animate-pulse" />
        </div>
      </div>
    </div>
  );
}

async function getOrder(orderNumber: string) {
  const supabase = getServerSupabase();
  // One round-trip: order + its items embedded via the FK relationship.
  const { data: order } = await supabase
    .from("orders")
    .select("*, order_items(*)")
    .eq("order_number", orderNumber)
    .single();
  if (!order) return null;
  let list: any[] = (order as any).order_items ?? [];
  // Fallback if the embedded relation returned nothing (schema without FK hint).
  if (!list.length) {
    const { data: items } = await supabase.from("order_items").select("*").eq("order_id", order.id);
    list = items ?? [];
  }
  // Fetch a thumbnail for each ordered product.
  const ids = Array.from(new Set(list.map((it: any) => it.product_id).filter(Boolean)));
  const imageMap: Record<string, string | null> = {};
  if (ids.length) {
    const { data: prods } = await supabase.from("products").select("id, images").in("id", ids);
    (prods ?? []).forEach((p: any) => { imageMap[p.id] = p.images?.[0] ?? null; });
  }
  return { order, items: list, imageMap };
}

const STEPS = [
  { n: "১", title: "কল করে কনফার্ম", text: "আমরা শীঘ্রই আপনাকে কল করে অর্ডারটি নিশ্চিত করব।" },
  { n: "২", title: "প্যাকেজিং ও কুরিয়ার", text: "যত্নসহকারে প্যাক করে কুরিয়ারে পাঠানো হবে।" },
  { n: "৩", title: "ডেলিভারি ও পেমেন্ট", text: "পণ্য হাতে পেয়ে ক্যাশ অন ডেলিভারিতে টাকা দিন।" },
];

/** Build a wa.me link (BD number → 8801…) with an optional prefilled message. */
function waLink(phone: string, text?: string): string {
  let n = (phone || "").replace(/\D/g, "");
  if (n.startsWith("00")) n = n.slice(2);
  if (n.startsWith("0")) n = "88" + n;
  else if (n.startsWith("1")) n = "880" + n;
  else if (!n.startsWith("880")) n = "880" + n;
  return "https://wa.me/" + n + (text ? "?text=" + encodeURIComponent(text) : "");
}

export default function OrderPage({ params }: { params: { order_number: string } }) {
  return (
    <Suspense fallback={<OrderSkeleton />}>
      <OrderContent params={params} />
    </Suspense>
  );
}

async function OrderContent({
  params,
}: {
  params: { order_number: string };
}) {
  const [data, store] = await Promise.all([
    getOrder(params.order_number),
    getStoreSettings(),
  ]);
  if (!data) notFound();
  const { order, items, imageMap } = data;
  const fullAddress = [order.address_line, order.area, order.city || order.district]
    .filter((s: any) => s && String(s).trim())
    .join(", ");

  return (
    <div className="max-w-2xl mx-auto">
      <div className="pt-2" />

      <div className="rounded-3xl overflow-hidden bg-white shadow-sm ring-1 ring-black/5">
        {/* success header — clean, professional */}
        <div className="border-b border-black/5 px-6 py-8 text-center">
          <div className="mx-auto h-16 w-16 rounded-full bg-green-50 ring-1 ring-green-200 flex items-center justify-center dc-pop">
            <span className="text-3xl text-green-600 font-bold">✓</span>
          </div>
          <h1 className="mt-4 font-display text-2xl md:text-[26px] font-bold text-gray-900">অর্ডার সফলভাবে গৃহীত হয়েছে</h1>
          <p className="mt-1.5 text-gray-500 text-sm">আমরা শীঘ্রই কল করে অর্ডারটি নিশ্চিত করব। ধন্যবাদ।</p>
          <div className="mt-4 inline-flex items-center gap-2 rounded-lg bg-gray-50 ring-1 ring-black/5 px-4 py-1.5 text-sm text-gray-600">
            অর্ডার নম্বর <span className="font-bold text-gray-900">{order.order_number}</span>
          </div>
        </div>

        <div className="p-5 md:p-6">
          {/* order summary with product images */}
          <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-3">অর্ডার সামারি</h2>
          <div className="rounded-2xl ring-1 ring-black/5 divide-y divide-black/5 overflow-hidden">
            {items.map((it: any) => {
              const img = it.product_id ? imageMap[it.product_id] : null;
              return (
                <div key={it.id} className="flex items-center gap-3 p-3">
                  <div className="h-14 w-14 shrink-0 rounded-xl overflow-hidden bg-gray-100 ring-1 ring-black/5 flex items-center justify-center">
                    {img ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={img} alt={it.product_name} className="h-full w-full object-cover" />
                    ) : (
                      <span className="text-lg">🛍️</span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm text-gray-900 leading-snug line-clamp-2">{it.product_name}</p>
                    <p className="text-xs text-gray-500 mt-0.5">পরিমাণ: {it.quantity}</p>
                  </div>
                  <span className="font-semibold text-sm text-gray-900 whitespace-nowrap">{taka(Number(it.line_total))}</span>
                </div>
              );
            })}
            <div className="p-3 space-y-1.5 text-sm bg-gray-50/60">
              <div className="flex justify-between text-gray-500">
                <span>সাবটোটাল</span>
                <span>{taka(Number(order.subtotal ?? Number(order.total) - Number(order.shipping_fee || 0)))}</span>
              </div>
              <div className="flex justify-between text-gray-500">
                <span>ডেলিভারি চার্জ</span>
                <span>{Number(order.shipping_fee) === 0 ? "ফ্রি" : taka(Number(order.shipping_fee))}</span>
              </div>
              <div className="flex justify-between font-bold text-base text-gray-900 border-t border-black/5 pt-1.5">
                <span>সর্বমোট</span>
                <span>{taka(Number(order.total))}</span>
              </div>
            </div>
          </div>

          {/* customer + billing address */}
          <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-400 mt-6 mb-3">গ্রাহক ও বিলিং তথ্য</h2>
          <div className="grid sm:grid-cols-2 gap-3 text-sm">
            <div className="rounded-2xl ring-1 ring-black/5 p-4">
              <p className="text-gray-400 text-xs mb-1">গ্রাহক</p>
              <p className="font-semibold text-gray-900">{order.customer_name}</p>
              <p className="text-gray-600 mt-0.5">{order.customer_phone}</p>
            </div>
            <div className="rounded-2xl ring-1 ring-black/5 p-4">
              <p className="text-gray-400 text-xs mb-1">বিলিং / ডেলিভারি ঠিকানা</p>
              <p className="text-gray-700 leading-relaxed">{fullAddress || order.address_line}</p>
              <p className="mt-2 inline-flex items-center gap-1 rounded-md bg-green-50 text-green-700 text-xs font-medium px-2 py-0.5 ring-1 ring-green-200">💵 ক্যাশ অন ডেলিভারি</p>
            </div>
          </div>

          {/* next steps */}
          <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-400 mt-6 mb-3">পরবর্তী ধাপ</h2>
          <div className="grid sm:grid-cols-3 gap-3">
            {STEPS.map((s, i) => (
              <div key={i} className="rounded-2xl ring-1 ring-black/5 p-4">
                <div className="h-7 w-7 rounded-full bg-brand-soft text-brand-dark font-bold text-sm flex items-center justify-center">{s.n}</div>
                <p className="mt-2 font-semibold text-sm text-gray-900">{s.title}</p>
                <p className="mt-0.5 text-xs text-gray-500 leading-relaxed">{s.text}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* actions */}
      <div className="mt-6 flex flex-wrap gap-3 justify-center">
        <a href="/" className="rounded-xl bg-gray-900 text-white px-6 py-3 font-semibold hover:bg-gray-800 transition">
          হোমে ফিরে যান
        </a>
        <a
          href={waLink(store.phone, `আসসালামু আলাইকুম, আমার অর্ডার নম্বর ${order.order_number} নিয়ে কথা বলতে চাই।`)}
          target="_blank"
          rel="noopener"
          className="rounded-xl bg-green-600 text-white px-6 py-3 font-semibold hover:bg-green-700 transition inline-flex items-center gap-2"
        >
          💬 WhatsApp-এ যোগাযোগ
        </a>
      </div>

      {/* location + trust */}
      <div className="mt-5 rounded-2xl bg-white ring-1 ring-black/5 p-4 text-center text-sm text-gray-500">
        <p>📍 {store.address}</p>
        <div className="mt-2 flex flex-wrap justify-center gap-2 text-xs">
          <span className="rounded-full bg-gray-50 ring-1 ring-black/5 text-gray-600 px-3 py-1">✓ ৩ দিনের মানিব্যাক গ্যারান্টি</span>
          <span className="rounded-full bg-gray-50 ring-1 ring-black/5 text-gray-600 px-3 py-1">✓ ফ্রি রিটার্ন</span>
          <span className="rounded-full bg-gray-50 ring-1 ring-black/5 text-gray-600 px-3 py-1">✓ সারা দেশে ডেলিভারি</span>
        </div>
      </div>

      <PurchasePixel
        eventId={order.event_id ?? null}
        suppress={!!order.track_suppressed}
        value={Number(order.total)}
        contentIds={items.map((it: any) => it.product_id).filter(Boolean)}
        customer={{
          name: order.customer_name,
          phone: order.customer_phone,
          city: order.city || order.district || undefined,
          email: order.customer_email || undefined,
        }}
      />
    </div>
  );
}
