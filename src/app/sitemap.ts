import type { MetadataRoute } from "next";

const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://localbazaar-web.vercel.app";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  return [
    "",
    "/home",
    "/shops",
    "/travel",
    "/services",
    "/auth/onboarding",
    "/auth/login",
    "/auth/signup",
    "/legal",
    "/delete-account",
  ].map((path) => ({
    url: `${appUrl}${path}`,
    lastModified: now,
  }));
}
