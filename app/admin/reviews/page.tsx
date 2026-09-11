import { getServerSupabase } from "@/lib/supabase/server";
import { DeleteReviewButton } from "./DeleteReviewButton";

export const dynamic = "force-dynamic";

export default async function AdminReviews() {
  const supabase = getServerSupabase();
  const { data, error } = await supabase
    .from("product_reviews")
    .select("id, name, rating, body, images, created_at, products(name_bn, name_en, slug)")
    .order("created_at", { ascending: false })
    .limit(200);
  const reviews = (data ?? []) as any[];
  const missing = error && ((error as any).code === "42P01" || /product_reviews/i.test(error.message || ""));

  return (
    <div>
      <h1 className="text-2xl font-bold mb-5">Reviews</h1>
      {missing ? (
        <p className="rounded-xl border px-4 py-3 text-sm" style={{ borderColor: "var(--a-warn-soft)", background: "var(--a-warn-soft)", color: "var(--a-warn)" }}>
          Run <code className="px-1 rounded bg-white/60">supabase-migration-product-reviews.sql</code> to enable reviews.
        </p>
      ) : reviews.length === 0 ? (
        <div className="dc-card p-8 text-center dc-muted">No reviews yet.</div>
      ) : (
        <div className="space-y-2">
          {reviews.map((r) => {
            const pname = r.products ? (r.products.name_bn || r.products.name_en) : "—";
            return (
              <div key={r.id} className="dc-card p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-amber-500 text-sm">{"★".repeat(r.rating)}<span className="text-gray-300">{"★".repeat(5 - r.rating)}</span></span>
                      <span className="text-sm font-semibold">{r.name || "Customer"}</span>
                      <span className="text-xs dc-muted">· {new Date(r.created_at).toISOString().slice(0, 10)}</span>
                    </div>
                    <p className="text-xs dc-muted mt-0.5">
                      {r.products?.slug ? <a href={`/product/${r.products.slug}`} target="_blank" rel="noopener" className="hover:underline">{pname}</a> : pname}
                    </p>
                    {r.body && <p className="text-sm mt-1.5">{r.body}</p>}
                    {Array.isArray(r.images) && r.images.length > 0 && (
                      <div className="mt-2 flex gap-2">
                        {r.images.map((u: string, i: number) => (
                          // eslint-disable-next-line @next/next/no-img-element
                          <a key={i} href={u} target="_blank" rel="noopener"><img src={u} alt="" className="h-14 w-14 rounded-lg object-cover ring-1 ring-black/10" /></a>
                        ))}
                      </div>
                    )}
                  </div>
                  <DeleteReviewButton id={r.id} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
