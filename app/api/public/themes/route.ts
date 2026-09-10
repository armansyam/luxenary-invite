import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { DEMO_REGISTRY } from "@/lib/demoRegistry";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";
export async function GET() {
  try {
    let dbThemes = await prisma.theme.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
    });

    // Self-Healing Auto-Sync: Jika tabel theme di database kosong (misal sehabis reset DB / fresh migration),
    // otomatis sinkronisasi secara dinamis dari DEMO_REGISTRY tanpa perlu jalankan seed manual
    if (dbThemes.length === 0 && Object.keys(DEMO_REGISTRY).length > 0) {
      const themesToInsert = Object.values(DEMO_REGISTRY).map((demo, idx) => ({
        id: demo.themeId.toLowerCase(),
        name: demo.themeName,
        category: demo.category.toLowerCase(),
        series: demo.series,
        description: demo.tagline || `${demo.themeName} Series`,
        previewUrl: `/demo/${demo.themeId.toLowerCase()}`,
        isPremium: demo.category.toLowerCase() === "premium",
        isActive: true,
        sortOrder: idx + 1,
      }));

      for (const t of themesToInsert) {
        await prisma.theme.upsert({
          where: { id: t.id },
          create: t,
          update: {},
        });
      }

      dbThemes = await prisma.theme.findMany({
        where: { isActive: true },
        orderBy: { sortOrder: "asc" },
      });
    }

    // Batch-load all custom demo settings from DB in one query
    const themeIds = dbThemes.map((t) => `theme_demo_${t.id.toLowerCase()}`);
    const customSettings = await prisma.adminSetting.findMany({
      where: { key: { in: themeIds } },
      select: { key: true, value: true, updatedAt: true },
    });

    // Build a lookup map: themeId parsed custom data + timestamp
    const customDataMap: Record<string, { data: any; updatedAt: number }> = {};
    for (const s of customSettings) {
      const themeId = s.key.replace("theme_demo_", "");
      try {
        customDataMap[themeId] = {
          data: JSON.parse(s.value),
          updatedAt: s.updatedAt ? new Date(s.updatedAt).getTime() : 1,
        };
      } catch {}
    }

    const themes = dbThemes.map((t) => {
      const themeKey = t.id.toLowerCase();

      // Priority: 1) Admin DB custom data, 2) DEMO_REGISTRY, 3) safe defaults
      const customEntry = customDataMap[themeKey];
      const customData = customEntry?.data;
      const v = customEntry?.updatedAt || 1;
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

      // Verify if specific thumbnail files actually exist on disk to prevent 404 cascade
      const demoThemeDir = path.join(process.cwd(), "public", "demo", themeKey);
      const hasMobileThumb = fs.existsSync(path.join(demoThemeDir, "thumbnail_mobile.webp"));
      const hasDesktopThumb = fs.existsSync(path.join(demoThemeDir, "thumbnail_desktop.webp"));
      const defaultCoverFallback = source?.landingCoverUrl || `/demo/${themeKey}/cover.webp`;

      const rawThumbMobile = customData?.thumbnailMobileUrl || (hasMobileThumb ? `/demo/${themeKey}/thumbnail_mobile.webp` : defaultCoverFallback);
      const rawThumbDesktop = customData?.thumbnailDesktopUrl || (hasDesktopThumb ? `/demo/${themeKey}/thumbnail_desktop.webp` : defaultCoverFallback);

      const thumbMobile = rawThumbMobile.includes("?") ? `${rawThumbMobile}&v=${v}` : `${rawThumbMobile}?v=${v}`;
      const thumbDesktop = rawThumbDesktop.includes("?") ? `${rawThumbDesktop}&v=${v}` : `${rawThumbDesktop}?v=${v}`;
      const rawCoverUrl = source?.landingCoverUrl || `/demo/${themeKey}/cover.webp`;
      const coverUrl = rawCoverUrl.includes("?") ? `${rawCoverUrl}&v=${v}` : `${rawCoverUrl}?v=${v}`;

      return {
        id: t.id,
        name: t.name,
        series,
        category: t.category.toUpperCase(),
        tagline,
        desc: tagline,
        thumbnailMobile: thumbMobile,
        thumbnailDesktop: thumbDesktop,
        // Cover card data — DB-first, then registry, then fallback
        groomName: source?.groomDisplayName || source?.groomName || "Pengantin Pria",
        brideName: source?.brideDisplayName || source?.brideName || "Pengantin Wanita",
        eyebrow: source?.tagline || tagline || "Wedding Invitation",
        coverUrl,
        weddingDay: source?.weddingDateDay || "--",
        weddingMonth: source?.weddingDateMonth || "--",
        weddingYear: source?.weddingDateYear || "----",
      };
    });

    return NextResponse.json(themes, {
      headers: {
        "Cache-Control": "public, max-age=60, s-maxage=86400, stale-while-revalidate=3600",
      },
    });
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : "Gagal memuat daftar tema";
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}

