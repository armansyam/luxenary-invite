import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = "https://luxvite.id";

  return {
    rules: [
      {
        userAgent: "*",
        allow: [
          "/",
          "/demo",
          "/demo/*",
          "/packages",
          "/terms",
          "/privacy",
          "/refund",
          "/contact",
          "/portfolio",
          "/portfolio/*",
          "/assets/*",
        ],
        disallow: [
          "/admin",
          "/admin/*",
          "/dashboard",
          "/dashboard/*",
          "/api/*",
          "/login",
          "/checkout",
          "/checkout/*",
          "/onboarding",
          "/setup",
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
