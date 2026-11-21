import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { routeError } from "@/lib/routeError";
import { DEMO_REGISTRY } from "@/lib/demoRegistry";
import { EventType, type ThemeCategory } from "@prisma/client";
import { logger } from "@/lib/logger";
import { themeThumbnails } from "@/lib/publicAsset";
import { editableTextsOf, freeSectionTextsOf } from "@/lib/themeBuilder/texts";

export const dynamic = "force-dynamic";
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const eventParam = searchParams.get("eventType") || searchParams.get("event");
    const requestedEvent = eventParam && eventParam.toLowerCase() !== "all" ? eventParam.toUpperCase() : undefined;
    if (requestedEvent && !(Object.values(EventType) as string[]).includes(requestedEvent)) {
      return NextResponse.json([]);
    }

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
        subEvent: (demo as any).subEvent || null,
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

      const { mobile: thumbMobile, desktop: thumbDesktop } = themeThumbnails(themeKey, customData);

      const eventType = t.eventType || (source as any)?.eventType || "WEDDING";
      const evTypeUpper = eventType.toUpperCase();
      const subEvent = t.subEvent ?? (source as any)?.subEvent ?? null;

      let primaryName = source?.groomDisplayName || source?.groomName || "Pengantin Pria";
      let secondaryName = source?.brideDisplayName || source?.brideName || "Pengantin Wanita";
      let eyebrow = source?.tagline || tagline || "Digital Invitation";

      if (evTypeUpper === "PERSONAL") {
        primaryName =
          (source as any)?.personName ||
          (source as any)?.personNickname ||
          t.name;
        secondaryName = "";
        eyebrow = (source as any)?.tagline || subEvent || "Personal & Keluarga";
      } else if (evTypeUpper === "EVENT") {
        primaryName = (source as any)?.eventTitle || t.name;
        secondaryName = "";
        eyebrow = (source as any)?.eventSubtitle || (source as any)?.tagline || subEvent || "Undangan Resmi";
      }

      return {
        id: t.id,
        name: t.name,
        series,
        category: t.category.toUpperCase(),
        eventType,
        subEvent,
        tagline,
        desc: tagline,
        defaultMusicUrl: t.defaultMusicUrl || null,
        thumbnailMobile: thumbMobile,
        thumbnailDesktop: thumbDesktop,
        // Cover card data — DB-first, then registry, then fallback
        groomName: primaryName,
        brideName: secondaryName,
        primaryName,
        secondaryName,
        personName: (source as any)?.personName || "",
        personAge: (source as any)?.personAge || "",
        eventTitle: (source as any)?.eventTitle || "",
        eyebrow,
        weddingDay: source?.weddingDateDay || "--",
        weddingMonth: source?.weddingDateMonth || "--",
        weddingYear: source?.weddingDateYear || "----",
        decorativeTexts: editableTextsOf(t.builderSpec),
        freeTexts: freeSectionTextsOf(t.builderSpec),
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

