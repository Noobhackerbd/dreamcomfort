/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    // Serve resized, modern-format (AVIF/WebP) images via Vercel's optimizer.
    formats: ["image/avif", "image/webp"],
    // Optimized images can be cached aggressively at the edge (30 days).
    minimumCacheTTL: 2592000,
    remotePatterns: [
      // Allow product images served from Supabase Storage
      { protocol: "https", hostname: "*.supabase.co" },
    ],
  },
};
module.exports = nextConfig;
