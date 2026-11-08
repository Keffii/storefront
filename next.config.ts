import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Inline the (small) CSS into the HTML: removes render-blocking requests
    // and improves first paint on phones.
    inlineCss: true,
    // Product image uploads from the admin go through server actions.
    serverActions: { bodySizeLimit: "6mb" },
  },
  images: {
    // Product images uploaded in the admin are served from CloudFront.
    remotePatterns: [{ protocol: "https", hostname: "*.cloudfront.net", pathname: "/products/**" }],
  },
  poweredByHeader: false,
  async redirects() {
    // Old category links (?kategori=) moved to /kollektion/<kategori>.
    return [
      {
        source: "/kollektion",
        has: [{ type: "query", key: "kategori", value: "(?<kategori>belysning|vaser|mobler|bordsartiklar)" }],
        destination: "/kollektion/:kategori",
        permanent: true,
      },
      { source: "/kontakt", destination: "/kundservice#kontakt", permanent: true },
    ];
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
      {
        source: "/images/:path*",
        // File names aren't content-hashed, so cache for a day rather than forever.
        headers: [{ key: "Cache-Control", value: "public, max-age=86400, stale-while-revalidate=604800" }],
      },
    ];
  },
};

export default nextConfig;
