import { listPortfolioSlugs, STORAGE_PROVIDER, getPortfolioMetadata, storagePublicBaseUrl } from "@/lib/storage";
import { portfolioListCache } from "@/lib/cache";
import { prisma } from "@/lib/prisma";

export interface LandingPortfolioItem {
  id: string;
  coupleName: string;
  themeName: string;
  category: string;
  coverImage: string;
  publicUrl: string;
}

type CachedPortfolioRow = {
  id: string;
  coupleName: string;
  themeId?: string;
  category: string;
  coverImage: string;
  publicUrl: string;
};

/**
 * Mengambil hingga `limit` karya portofolio terkurasi untuk strip editorial di Landing Page.
 * Memakai ulang cache L1 `portfolioListCache` agar tidak menambah beban R2/DB pada trafik tinggi.
 */
export async function getLandingPortfolioPreview(limit = 3): Promise<LandingPortfolioItem[]> {
  try {
    const isRemoteStorage = STORAGE_PROVIDER === "r2" || STORAGE_PROVIDER === "s3";
    let rawItems = isRemoteStorage ? (portfolioListCache.get("all") as CachedPortfolioRow[] | null) : null;

    if (!rawItems) {
      const slugs = await listPortfolioSlugs().catch(() => null);
      if (!slugs || slugs.length === 0) return [];
      const slice = slugs.slice(0, limit);
      const metas = await Promise.all(slice.map((slug) => getPortfolioMetadata(slug)));
      const publicBase = isRemoteStorage ? storagePublicBaseUrl() : "";

      const built: CachedPortfolioRow[] = [];
      for (let i = 0; i < slice.length; i++) {
        const slug = slice[i];
        const meta = metas[i];
        if (!meta) continue;
        built.push({
          id: slug,
          coupleName: meta.coupleName,
          themeId: meta.themeId,
          category: meta.category,
          coverImage: publicBase
            ? `${publicBase}/portfolio/assets/${slug}/cover.webp`
            : `/portfolio/assets/${slug}/cover.webp`,
          publicUrl: `/portfolio/${slug}`,
        });
      }
      rawItems = built;
    }

    const picked = rawItems.slice(0, limit);
    if (picked.length === 0) return [];

    const themeIds = picked.map((p) => (p.themeId || "").toLowerCase()).filter(Boolean);
    const themes = themeIds.length
      ? await prisma.theme
          .findMany({ where: { id: { in: themeIds } }, select: { id: true, name: true } })
          .catch(() => [] as Array<{ id: string; name: string }>)
      : [];
    const nameMap = new Map(themes.map((t) => [t.id.toLowerCase(), t.name]));

    return picked.map((item) => ({
      id: item.id,
      coupleName: item.coupleName,
      themeName: nameMap.get((item.themeId || "").toLowerCase()) || item.themeId || item.category,
      category: item.category,
      coverImage: item.coverImage,
      publicUrl: item.publicUrl,
    }));
  } catch {
    return [];
  }
}
