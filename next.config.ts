import type { NextConfig } from "next";

/**
 * Content Security Policy: only the hosts the shop actually uses.
 * - Stripe.js (Klarna messaging) and its iframes; Checkout itself is a redirect.
 * - Cognito for sign-in from the browser.
 * - Google Tag Manager and Analytics only when NEXT_PUBLIC_GTM_ID is set.
 * Next.js inlines its bootstrap scripts and the CSS is inlined at build
 * time, so 'unsafe-inline' stays for scripts and styles; a nonce would force
 * every page to render dynamically and lose the static product pages.
 */
function contentSecurityPolicy(): string {
  const gtm = Boolean(process.env.NEXT_PUBLIC_GTM_ID);
  const dev = process.env.NODE_ENV !== "production";
  const google = gtm ? ["https://www.googletagmanager.com", "https://*.google-analytics.com", "https://*.analytics.google.com"] : [];
  const directives: Record<string, string[]> = {
    "default-src": ["'self'"],
    "script-src": ["'self'", "'unsafe-inline'", ...(dev ? ["'unsafe-eval'"] : []), "https://js.stripe.com", ...(gtm ? ["https://www.googletagmanager.com"] : [])],
    "style-src": ["'self'", "'unsafe-inline'"],
    "img-src": ["'self'", "data:", "blob:", "https://*.cloudfront.net", "https://*.stripe.com", ...google],
    "font-src": ["'self'", "data:"],
    "connect-src": [
      "'self'",
      "https://cognito-idp.eu-north-1.amazonaws.com",
      "https://cognito-identity.eu-north-1.amazonaws.com",
      "https://api.stripe.com",
      "https://*.stripe.com",
      ...google,
      ...(dev ? ["ws:"] : []),
    ],
    "frame-src": ["https://js.stripe.com", "https://*.stripe.com", "https://*.klarna.com"],
    "form-action": ["'self'", "https://checkout.stripe.com"],
    "frame-ancestors": ["'none'"],
    "base-uri": ["'self'"],
    "object-src": ["'none'"],
  };
  return [...Object.entries(directives).map(([k, v]) => `${k} ${v.join(" ")}`), ...(dev ? [] : ["upgrade-insecure-requests"])].join("; ");
}

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
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(self \"https://js.stripe.com\")" },
          { key: "Content-Security-Policy", value: contentSecurityPolicy() },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
          { key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" },
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
