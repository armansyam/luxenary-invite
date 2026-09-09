import { MetadataRoute } from "next";
import { getDynamicServerAppUrl } from "@/lib/serverDomainUtils";

export default async function robots(): Promise<MetadataRoute.Robots> {
  const baseUrl = await getDynamicServerAppUrl();

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
