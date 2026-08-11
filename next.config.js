/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // Order screenshots are sent to the AI reader via a Server Action; the
    // default body cap is 1MB which rejects many screenshots. Raise it.
    serverActions: { bodySizeLimit: "10mb" },
  },
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
