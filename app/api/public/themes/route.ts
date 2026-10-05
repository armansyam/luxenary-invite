import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { routeError } from "@/lib/routeError";
import { DEMO_REGISTRY } from "@/lib/demoRegistry";
import type { ThemeCategory } from "@prisma/client";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const eventParam = searchParams.get("eventType") || searchParams.get("event");
    const requestedEvent = eventParam && eventParam.toLowerCase() !== "all" ? eventParam.toUpperCase() : undefined;

    const whereClause: any = { isActive: true };
    if (requestedEvent) {
      whereClause.eventType = requestedEvent;
    }

    let dbThemes = await prisma.theme.findMany({
      where: whereClause,
      orderBy: { sortOrder: "asc" },
    });

    // Self-Healing Auto-Sync: Jika tabel theme di database kosong (misal sehabis reset DB / fresh migration),
    // otomatis sinkronisasi secara dinamis dari DEMO_REGISTRY tanpa perlu jalankan seed manual
    if (dbThemes.length === 0 && Object.keys(DEMO_REGISTRY).length > 0) {
      const themesToInsert = Object.values(DEMO_REGISTRY).map((demo, idx) => ({
        id: demo.themeId.toLowerCase(),
        name: demo.themeName,
        category: demo.category.toLowerCase() as ThemeCategory,
        series: demo.series,
        eventType: (demo as any).eventType || "WEDDING",
        description: demo.tagline || `${demo.themeName} Series`,
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
        where: whereClause,
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
      } catch (err) {
        logger.warn("PublicThemes", "Data demo kustom bukan JSON valid; tema memakai bawaan", { key: s.key, error: err instanceof Error ? err.message : String(err) });
      }
    }

    const themes = dbThemes.map((t) => {
      const themeKey = t.id.toLowerCase();

      // Priority: 1) Admin DB custom data, 2) DEMO_REGISTRY, 3) safe defaults
      const customEntry = customDataMap[themeKey];
      const customData = customEntry?.data;
      const registryData = DEMO_REGISTRY[themeKey];
      const source = customData || registryData;

      const tagline = t.description || source?.tagline || "";
      const catLower = t.category.toLowerCase();
      const series =
        t.series ||
        (catLower === "minimalist" || catLower === "premium"
          ? "Minimalist"
          : catLower === "traditional"
          ? "Traditional"
          : "Modern");

      const defaultCoverFallback = source?.landingCoverUrl || `/demo/${themeKey}/cover.webp`;
      const rawThumbMobile = customData?.thumbnailMobileUrl || `/demo/${themeKey}/thumbnail_mobile.webp`;
      const rawThumbDesktop = customData?.thumbnailDesktopUrl || `/demo/${themeKey}/thumbnail_desktop.webp`;

      const thumbMobile = rawThumbMobile;
      const thumbDesktop = rawThumbDesktop;
      const rawCoverUrl = defaultCoverFallback;
      const coverUrl = rawCoverUrl;

      const eventType = t.eventType || (source as any)?.eventType || "WEDDING";
      const evTypeUpper = eventType.toUpperCase();

      let primaryName = source?.groomDisplayName || source?.groomName || "Pengantin Pria";
      let secondaryName = source?.brideDisplayName || source?.brideName || "Pengantin Wanita";
      let eyebrow = source?.tagline || tagline || "Digital Invitation";

      if (evTypeUpper === "BIRTHDAY") {
        primaryName = (source as any)?.personName || (source as any)?.personNickname || "Birthday";
        secondaryName = "";
        eyebrow = (source as any)?.tagline || "Birthday Celebration";
      } else if (evTypeUpper === "KHITAN") {
        primaryName = (source as any)?.childName || (source as any)?.childNickname || "Walimatul Khitan";
        secondaryName = "";
        eyebrow = (source as any)?.tagline || "Walimatul Khitan";
      } else if (evTypeUpper === "AQIQAH") {
        primaryName = (source as any)?.babyName || (source as any)?.babyNickname || "Tasyakuran Aqiqah";
        secondaryName = "";
        eyebrow = (source as any)?.tagline || "Tasyakuran Aqiqah";
      } else if (evTypeUpper === "WISUDA") {
        primaryName = (source as any)?.graduateName || (source as any)?.graduateNickname || "Wisudawan";
        secondaryName = "";
        eyebrow = (source as any)?.tagline || "Graduation Celebration";
      } else if (evTypeUpper === "GATHERING") {
        primaryName = (source as any)?.eventTitle || t.name;
        secondaryName = "";
        eyebrow = (source as any)?.eventSubtitle || (source as any)?.tagline || "Undangan Resmi";
      }

      return {
        id: t.id,
        name: t.name,
        series,
        category: t.category.toUpperCase(),
        eventType,
        parentTheme: t.parentTheme || null,
        tagline,
        desc: tagline,
        thumbnailMobile: thumbMobile,
        thumbnailDesktop: thumbDesktop,
        // Cover card data — DB-first, then registry, then fallback
        groomName: primaryName,
        brideName: secondaryName,
        primaryName,
        secondaryName,
        personName: (source as any)?.personName || "",
        personAge: (source as any)?.personAge || "",
        childName: (source as any)?.childName || "",
        babyName: (source as any)?.babyName || "",
        graduateName: (source as any)?.graduateName || "",
        eventTitle: (source as any)?.eventTitle || "",
        eyebrow,
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
  } catch (error) {
    return routeError("PublicThemes", error, "Gagal memuat daftar tema");
  }
}

