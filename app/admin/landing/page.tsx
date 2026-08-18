import { getServerSupabase } from "@/lib/supabase/server";
import { getLandingConfig, getLandingVariants } from "@/lib/landing";
import { LandingEditor } from "./LandingEditor";
import { LandingVariants } from "./LandingVariants";

export const dynamic = "force-dynamic";

export default async function AdminLanding() {
  const supabase = getServerSupabase();
  const [config, variants, { data: products }] = await Promise.all([
    getLandingConfig(),
    getLandingVariants(),
    supabase.from("products").select("slug, name_bn, name_en, price, images").eq("is_active", true).order("created_at", { ascending: false }),
  ]);

  const opts = (products ?? []).map((p: any) => ({
    slug: p.slug,
    name: p.name_bn || p.name_en,
    price: Number(p.price ?? 0),
    image: p.images?.[0] ?? null,
  }));

  return (
    <div>
      <h1 className="text-2xl font-bold mb-1">ল্যান্ডিং পেজ</h1>
      <p className="text-sm text-gray-500 mb-6">হোমপেজের সিঙ্গেল-প্রোডাক্ট ল্যান্ডিং ফানেল সম্পাদনা করুন।</p>
      <LandingEditor initial={config} products={opts} />

      <div className="mt-8 pt-8 border-t border-black/5">
        <LandingVariants initial={variants} products={opts} />
      </div>
    </div>
  );
}
