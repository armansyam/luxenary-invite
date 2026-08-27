import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { DEMO_REGISTRY } from "@/lib/demoRegistry";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const dbThemes = await prisma.theme.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
    });

    // Batch-load all custom demo settings from DB in one query
    const themeIds = dbThemes.map((t) => `theme_demo_${t.id.toLowerCase()}`);
    const customSettings = await prisma.adminSetting.findMany({
      where: { key: { in: themeIds } },
      select: { key: true, value: true },
    });

    // Build a lookup map: themeId → parsed custom data
    const customDataMap: Record<string, any> = {};
    for (const s of customSettings) {
      const themeId = s.key.replace("theme_demo_", "");
      try { customDataMap[themeId] = JSON.parse(s.value); } catch {}
    }

    const themes = dbThemes.map((t) => {
      const themeKey = t.id.toLowerCase();

      // Priority: 1) Admin DB custom data, 2) DEMO_REGISTRY, 3) safe defaults
      const customData = customDataMap[themeKey];
      const registryData = DEMO_REGISTRY[themeKey];
      const source = customData || registryData;

      const tagline = t.description || source?.tagline || "";
      const series =
        t.series ||
        (t.category.toLowerCase() === "premium"
          ? "Premium"
          : t.category.toLowerCase() === "traditional"
          ? "Traditional"
          : "Modern");

      return {
        id: t.id,
        name: t.name,
        series,
        category: t.category.toUpperCase(),
        tagline,
        desc: tagline,
        // Cover card data — DB-first, then registry, then fallback
        groomName: source?.groomDisplayName || source?.groomName || "Pengantin Pria",
        brideName: source?.brideDisplayName || source?.brideName || "Pengantin Wanita",
        eyebrow: source?.tagline || tagline || "Wedding Invitation",
        coverUrl: source?.landingCoverUrl || `/demo/${themeKey}/cover.webp`,
        weddingDay: source?.weddingDateDay || "--",
        weddingMonth: source?.weddingDateMonth || "--",
        weddingYear: source?.weddingDateYear || "----",
      };
    });

    return NextResponse.json(themes, {
      headers: { "Cache-Control": "no-store, no-cache, must-revalidate" },
    });
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : "Gagal memuat daftar tema";
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}

