// app/t/[code]/page.tsx — the tracking link sent in the order SMS (dreamcomfortbd.com/t/…).
// Opens the order's status straight away, no order number or phone to type.
import type { Metadata } from "next";
import Link from "next/link";
import { getServerSupabase } from "@/lib/supabase/server";
import { orderFromTrackCode } from "@/lib/track-link";
import { TrackedOrder } from "@/components/account/TrackedOrder";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "অর্ডার ট্র্যাক",
  robots: { index: false, follow: false }, // personal links — keep them out of search
};

export default async function TrackLinkPage({ params }: { params: { code: string } }) {
  const orderNumber = orderFromTrackCode(params.code);
  let order: any = null;
  if (orderNumber) {
    const { data } = await getServerSupabase()
      .from("orders")
      .select("*, order_items(product_name, quantity, line_total)")
      .eq("order_number", orderNumber)
      .maybeSingle();
    order = data;
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="text-center mb-2">
        <h1 className="font-display text-[26px] font-bold text-gray-900">আপনার অর্ডার</h1>
        <p className="mt-1.5 text-sm text-gray-500">Dream Comfort-এ অর্ডার করার জন্য ধন্যবাদ 🌸</p>
      </div>
      {order ? (
        <TrackedOrder order={order} />
      ) : (
        <div className="mt-6 rounded-2xl bg-amber-50 border border-amber-200 text-amber-700 px-4 py-3 text-sm text-center">
          লিংকটি সঠিক নয় বা অর্ডারটি পাওয়া যায়নি।{" "}
          <Link href="/track-order" className="font-semibold underline">অর্ডার নম্বর ও মোবাইল দিয়ে খুঁজুন</Link>
        </div>
      )}
    </div>
  );
}
