import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { themeThumbnails } from "@/lib/publicAsset";
import type { ShowcaseTheme } from "@/components/landing/LandingInteractive";

/**
 * Tema pernikahan aktif yang punya thumbnail ponsel dan tablet, untuk karusel koleksi di landing. Tema tanpa
 * thumbnail tidak ikut (landing tidak punya kartu nama); bila tidak ada satu pun, karusel tidak ditampilkan.
 */
export async function getShowcaseThemes(limit = 6): Promise<ShowcaseTheme[]> {
  const themes = await prisma.theme.findMany({
    where: { isActive: true, eventType: "WEDDING" },
    orderBy: { sortOrder: "asc" },
    select: { id: true, name: true, series: true, category: true },
  });
  const settings = await prisma.adminSetting.findMany({
    where: { key: { in: themes.map((t) => `theme_demo_${t.id.toLowerCase()}`) } },
    select: { key: true, value: true },
  });
  const customByTheme = new Map<string, Record<string, string>>();
  for (const s of settings) {
    try {
      customByTheme.set(s.key.replace("theme_demo_", ""), JSON.parse(s.value));
    } catch (error) {
      logger.warn("LandingShowcase", "Data demo kustom bukan JSON valid; tema memakai thumbnail bawaan", { key: s.key, error: error instanceof Error ? error.message : String(error) });
    }
  }

  const showcase: ShowcaseTheme[] = [];
  for (const t of themes) {
    const { mobile, desktop } = themeThumbnails(t.id.toLowerCase(), customByTheme.get(t.id.toLowerCase()));
    if (!mobile || !desktop) continue;
    showcase.push({ name: t.name.toUpperCase(), category: (t.series || t.category).toUpperCase(), thumbnail: mobile, desktop });
    if (showcase.length >= limit) break;
  }
  return showcase;
}
