// app/product/[slug]/page.tsx — Product detail (server component).
import type { Metadata } from "next";
import Image from "next/image";
import { getServerSupabase } from "@/lib/supabase/server";
import { Product } from "@/lib/types";
import { notFound } from "next/navigation";
import { BuyButtons } from "@/components/BuyButtons";
import { ViewContentPixel } from "@/components/ViewContentPixel";
import { ProductGallery } from "./ProductGallery";
import { taka } from "@/lib/format";
import { STORE_NAME } from "@/lib/config";

export const dynamic = "force-dynamic";

async function getProduct(slug: string): Promise<Product | null> {
  const supabase = getServerSupabase();
  const { data } = await supabase
    .from("products")
    .select("*")
    .eq("slug", slug)
    .eq("is_active", true)
    .single();
  return (data as Product) ?? null;
}

async function getRelated(categoryId: string | null, excludeId: string): Promise<Product[]> {
  if (!categoryId) return [];
  const supabase = getServerSupabase();
  const { data } = await supabase
    .from("products")
    .select("*")
    .eq("is_active", true)
    .eq("category_id", categoryId)
    .neq("id", excludeId)
    .limit(4);
  return (data as Product[]) ?? [];
}

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const p = await getProduct(params.slug);
  if (!p) return { title: "পণ্য পাওয়া যায়নি" };
  const name = p.name_bn || p.name_en;
  const desc =
    p.meta_description || p.description_bn || p.description_en || `${name} — ${STORE_NAME}`;
  const image = p.images?.[0];
  return {
    title: p.meta_title || `${name} — ${STORE_NAME}`,
    description: desc.slice(0, 160),
    openGraph: {
      title: p.meta_title || name,
      description: desc.slice(0, 160),
      images: image ? [{ url: image }] : undefined,
      type: "website",
    },
  };
}

export default async function ProductPage({
  params,
}: {
  params: { slug: string };
}) {
  const p = await getProduct(params.slug);
  if (!p) notFound();

  const name = p.name_bn || p.name_en;
  const hasDiscount = p.compare_at_price && p.compare_at_price > p.price;
  const images = p.images?.length ? p.images : [];
  const related = await getRelated(p.category_id, p.id);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name,
    description: p.description_bn || p.description_en || name,
    image: images,
    sku: p.sku || undefined,
    brand: { "@type": "Brand", name: STORE_NAME },
    offers: {
      "@type": "Offer",
      priceCurrency: "BDT",
      price: p.price,
      availability:
        p.stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
    },
  };

  return (
    <div>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {/* ViewContent — browser + server, shared event_id */}
      <ViewContentPixel id={p.id} value={p.price} name={name} />

      <div className="grid md:grid-cols-2 gap-8">
        <ProductGallery images={images} name={name} />

        <div>
          <h1 className="text-2xl font-bold">{name}</h1>

          <div className="mt-4 flex items-center gap-3">
            <span className="text-2xl font-bold text-brand">{taka(p.price)}</span>
            {hasDiscount && (
              <>
                <span className="text-gray-400 line-through">
                  {taka(p.compare_at_price as number)}
                </span>
                <span className="rounded bg-red-100 text-red-600 text-xs px-2 py-0.5">
                  {Math.round((1 - p.price / (p.compare_at_price as number)) * 100)}% ছাড়
                </span>
              </>
            )}
          </div>

          <p className="mt-4 text-gray-700 leading-relaxed whitespace-pre-line">
            {p.description_bn || p.description_en || "বিস্তারিত শীঘ্রই যোগ করা হবে।"}
          </p>

          <div className="mt-6">
            <BuyButtons
              product={{ id: p.id, slug: p.slug, name, price: p.price, image: images[0] }}
            />
            <p className="mt-3 text-xs text-gray-400">
              স্টক: {p.stock > 0 ? `${p.stock} টি` : "স্টকে নেই"}
            </p>
          </div>

          <div className="mt-6 grid grid-cols-3 gap-2 text-center text-xs text-gray-600">
            <div className="rounded-lg border bg-white py-3">🚚 সারা দেশে ডেলিভারি</div>
            <div className="rounded-lg border bg-white py-3">💵 ক্যাশ অন ডেলিভারি</div>
            <div className="rounded-lg border bg-white py-3">↩️ সহজ রিটার্ন</div>
          </div>
        </div>
      </div>

      {related.length > 0 && (
        <section className="mt-14">
          <h2 className="text-lg font-bold mb-4">সম্পর্কিত পণ্য</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {related.map((r) => {
              const rn = r.name_bn || r.name_en;
              const img = r.images?.[0];
              return (
                <a
                  key={r.id}
                  href={`/product/${r.slug}`}
                  className="group rounded-xl border bg-white overflow-hidden hover:shadow-md transition-shadow"
                >
                  <div className="relative aspect-square bg-gray-100 flex items-center justify-center overflow-hidden">
                    {img ? (
                      <Image
                        src={img}
                        alt={rn}
                        fill
                        sizes="(max-width: 768px) 50vw, 200px"
                        className="object-cover group-hover:scale-105 transition-transform"
                      />
                    ) : (
                      <span className="text-gray-400 text-xs px-2 text-center">{rn}</span>
                    )}
                  </div>
                  <div className="p-3">
                    <p className="font-medium truncate text-sm">{rn}</p>
                    <span className="font-bold text-brand text-sm">{taka(r.price)}</span>
                  </div>
                </a>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
