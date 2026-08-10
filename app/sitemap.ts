import type { MetadataRoute } from "next";
import { getServerSupabase } from "@/lib/supabase/server";

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://dreamcomfortbd.com";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes = [
    "",
    "/products",
    "/track-order",
    "/about",
    "/contact",
    "/privacy",
    "/terms",
    "/return-policy",
  ].map((path) => ({
    url: `${SITE}${path}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: path === "" ? 1 : 0.7,
  }));

  let productRoutes: MetadataRoute.Sitemap = [];
  try {
    const supabase = getServerSupabase();
    const { data } = await supabase
      .from("products")
      .select("slug, updated_at")
      .eq("is_active", true);
    productRoutes = (data ?? []).map((p: any) => ({
      url: `${SITE}/product/${p.slug}`,
      lastModified: p.updated_at ? new Date(p.updated_at) : new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.8,
    }));
  } catch {
    // env/DB not available at build — static routes only
  }

  return [...staticRoutes, ...productRoutes];
}
