import type { NextConfig } from "next";

const appShellRoutes = [
  "/",
  "/auth/:path*",
  "/home",
  "/shops",
  "/reels",
  "/reel/:id",
  "/shop/:id",
  "/product/:id",
  "/travel",
  "/services",
  "/settings",
  "/payment",
  "/merchant/:path*",
  "/admin/:path*",
  "/legal",
  "/delete-account",
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
    ],
  },
  async headers() {
    const securityHeaders = [
      { key: "X-DNS-Prefetch-Control", value: "on" },
      { key: "X-Frame-Options", value: "SAMEORIGIN" },
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "Permissions-Policy", value: "camera=(), microphone=(), payment=(self), geolocation=(self)" },
    ];

    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
      ...appShellRoutes.map((source) => ({
        source,
        headers: [{ key: "Cache-Control", value: "public, max-age=0, s-maxage=60, stale-while-revalidate=300" }],
      })),
    ];
  },
};

export default nextConfig;
