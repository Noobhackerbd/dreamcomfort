/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      // Allow product images served from Supabase Storage
      { protocol: "https", hostname: "*.supabase.co" },
    ],
  },
};
module.exports = nextConfig;
