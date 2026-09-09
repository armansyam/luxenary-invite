import { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";
import { getDynamicServerAppUrl } from "@/lib/serverDomainUtils";

export const dynamic = "force-dynamic";
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = await getDynamicServerAppUrl();
  const now = new Date();

  // Static Public Routes
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: now,
      changeFrequency: "daily",
      priority: 1.0,
    },
    {
      url: `${baseUrl}/demo`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/packages`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/demo/memories`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.7,
    },
    {
      url: `${baseUrl}/demo/receptionist`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.7,
    },
    {
      url: `${baseUrl}/demo/sharemoment`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.7,
    },
    {
      url: `${baseUrl}/portfolio`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.7,
    },
    {
      url: `${baseUrl}/contact`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: `${baseUrl}/terms`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: `${baseUrl}/privacy`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: `${baseUrl}/refund`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.5,
    },
  ];

  // Dynamic Theme Demo Routes
  let dynamicThemeRoutes: MetadataRoute.Sitemap = [];
  try {
    const activeThemes = await prisma.theme.findMany({
      where: { isActive: true },
      select: { id: true, createdAt: true },
    });

    dynamicThemeRoutes = activeThemes.map((theme) => ({
      url: `${baseUrl}/demo/${theme.id}`,
      lastModified: theme.createdAt || now,
      changeFrequency: "monthly" as const,
      priority: 0.8,
    }));
  } catch (e) {
    console.error("[sitemap] Failed to fetch dynamic themes", e);
  }

  return [...staticRoutes, ...dynamicThemeRoutes];
}
