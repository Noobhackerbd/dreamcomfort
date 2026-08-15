import Image from "next/image";
import { getServerSupabase } from "@/lib/supabase/server";
import { taka, bdDateTime } from "@/lib/format";
import { aiConfigured } from "@/lib/ai";
import { AbandonedActions } from "./AbandonedActions";
import { ManualOrderModal, type PickProduct } from "../orders/ManualOrderModal";
import { AutoRefresh } from "@/components/admin/AutoRefresh";

export const dynamic = "force-dynamic";

const TABS = [
  { value: "abandoned", label: "অসম্পূর্ণ" },
  { value: "converted", label: "কনভার্টেড" },
  { value: "", label: "সব" },
];

/** Build a wa.me link from a BD phone (01… → 8801…). */
function waLink(phone?: string | null): string | null {
  const d = (phone || "").replace(/\D/g, "");
  if (!d) return null;
  let n = d;
  if (n.startsWith("00")) n = n.slice(2);
  if (n.startsWith("0")) n = "88" + n;
  else if (n.startsWith("1")) n = "880" + n;
  else if (!n.startsWith("880")) n = "880" + n;
  return "https://wa.me/" + n;
}

export default async function AbandonedPage({ searchParams }: { searchParams: { status?: string } }) {
  const supabase = getServerSupabase();
  const status = searchParams.status ?? "abandoned";

  let query = supabase
    .from("abandoned_carts")
    .select("*, products(images)")
    .order("updated_at", { ascending: false })
    .limit(300);
  if (status) query = query.eq("status", status);

  const [{ data: leads }, aiReady, productsRes] = await Promise.all([
    query,
    aiConfigured(),
    supabase.from("products").select("id, name_bn, name_en, price, images").eq("is_active", true).order("created_at", { ascending: false }),
  ]);
  const rows = leads ?? [];
  const pickProducts: PickProduct[] = (productsRes.data ?? []).map((p: any) => ({
    id: p.id,
    name: p.name_bn || p.name_en,
    price: Number(p.price),
    image: p.images?.[0] ?? null,
  }));

  return (
    <div>
      <AutoRefresh seconds={12} />
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-2xl font-bold">অসম্পূর্ণ অর্ডার (লিড)</h1>
      </div>
      <p className="text-sm text-gray-500 mb-5">
        যারা অর্ডার ফর্ম আংশিক পূরণ করেছেন কিন্তু সাবমিট করেননি — তাদের ফোন করে ফলো-আপ করুন।
      </p>

      <div className="flex flex-wrap gap-2 mb-6">
        {TABS.map((t) => (
          <a
            key={t.value}
            href={`/admin/abandoned${t.value ? `?status=${t.value}` : ""}`}
            className={
              "rounded-full border px-4 py-1.5 text-sm " +
              (status === t.value ? "border-brand text-brand bg-brand/5" : "")
            }
          >
            {t.label}
          </a>
        ))}
      </div>

      <div className="space-y-3">
        {rows.map((l: any) => {
          const img = l.products?.images?.[0] || null;
          const wa = waLink(l.customer_phone);
          return (
            <div key={l.id} className="rounded-xl border bg-white p-4">
              <div className="flex items-start gap-3">
                <div className="relative h-16 w-16 shrink-0 rounded-lg overflow-hidden bg-gray-100 ring-1 ring-black/5">
                  {img ? (
                    <Image src={img} alt={l.product_name || ""} fill sizes="64px" className="object-cover" />
                  ) : (
                    <span className="flex h-full w-full items-center justify-center text-[10px] text-gray-400 text-center px-1">
                      {l.product_name?.slice(0, 12) || "—"}
                    </span>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-semibold">
                        {l.customer_name || <span className="text-gray-400">নাম নেই</span>}
                        {l.status === "converted" && (
                          <span className="ml-2 rounded-full bg-green-100 text-green-700 text-[11px] px-2 py-0.5">কনভার্টেড</span>
                        )}
                      </p>
                      <p className="text-sm text-gray-600">
                        {l.customer_phone || "ফোন নেই"}
                        {l.product_name ? ` · ${l.product_name} × ${l.quantity}` : ""}
                      </p>
                      {l.address_line && <p className="text-sm text-gray-500 truncate">{l.address_line}</p>}
                      <p className="text-xs text-gray-400 mt-1">🕒 {bdDateTime(l.updated_at)}</p>
                    </div>
                    <div className="text-right shrink-0">
                      {l.value > 0 && <p className="font-bold">{taka(Number(l.value))}</p>}
                      {l.order_number && (
                        <a href={`/admin/orders`} className="text-xs text-brand hover:underline">{l.order_number}</a>
                      )}
                    </div>
                  </div>

                  <div className="mt-3 pt-3 border-t flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      {l.customer_phone && (
                        <a href={`tel:${l.customer_phone}`} className="rounded-lg bg-brand text-white px-3 py-1.5 text-xs">📞 কল</a>
                      )}
                      {wa && (
                        <a href={wa} target="_blank" rel="noopener" className="rounded-lg bg-green-600 text-white px-3 py-1.5 text-xs">💬 WhatsApp</a>
                      )}
                      {l.status !== "converted" && (
                        <ManualOrderModal
                          products={pickProducts}
                          aiReady={aiReady}
                          leadId={l.lead_id}
                          triggerLabel="🛒 অর্ডার তৈরি করুন"
                          triggerClassName="rounded-lg bg-accent-dark text-white px-3 py-1.5 text-xs font-medium hover:bg-accent"
                          initial={{
                            name: l.customer_name || "",
                            phone: l.customer_phone || "",
                            address: l.address_line || "",
                            area: l.area || "",
                            productId: l.product_id || undefined,
                            amount: l.value ? Number(l.value) : undefined,
                          }}
                        />
                      )}
                    </div>
                    <AbandonedActions id={l.id} status={l.status} />
                  </div>
                </div>
              </div>
            </div>
          );
        })}
        {rows.length === 0 && <p className="text-center text-gray-400 py-10">কোনো লিড নেই।</p>}
      </div>
    </div>
  );
}
