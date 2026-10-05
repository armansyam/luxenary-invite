import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import fs from "fs";
import path from "path";
import { prisma } from "@/lib/prisma";
import { requireAdminModule } from "@/lib/adminAuth";
import { purgeCloudflareCache } from "@/lib/cloudflare";

export const dynamic = "force-dynamic";

interface DiscoveredTheme {
  id: string;
  name: string;
  category: "minimalist" | "modern" | "traditional";
  series: string;
  eventType?: string;
  filePath: string;
  hasStory: boolean;
  hasGallery: boolean;
  hasGift: boolean;
  hasQr: boolean;
  isHealthValid: boolean;
}

export async function POST() {
  try {
    const guard = await requireAdminModule("themes");
    if (!guard.ok) return guard.response;

    const themesDir = path.join(process.cwd(), "themes");
    const discovered: DiscoveredTheme[] = [];

    const EVENT_FOLDERS = [
      { eventFolder: "wedding",  eventType: "WEDDING" as const },
      { eventFolder: "birthday", eventType: "BIRTHDAY" as const },
      { eventFolder: "khitan",   eventType: "KHITAN" as const },
      { eventFolder: "aqiqah",   eventType: "AQIQAH" as const },
      { eventFolder: "wisuda",   eventType: "WISUDA" as const },
      { eventFolder: "general",  eventType: "GATHERING" as const },
    ];

    const STYLE_FOLDERS = [
      { styleFolder: "minimalist", category: "minimalist" as const, series: "Minimalist" },
      { styleFolder: "modern", category: "modern" as const, series: "Modern" },
      { styleFolder: "traditional", category: "traditional" as const, series: "Traditional" },
    ];

    // 1. Scan multi-event folders (themes/<eventType>/<style>/)
    for (const ef of EVENT_FOLDERS) {
      for (const sf of STYLE_FOLDERS) {
        const targetDir = path.join(themesDir, ef.eventFolder, sf.styleFolder);
        try {
          await fs.promises.access(targetDir);
        } catch {
          continue;
        }

        const files = await fs.promises.readdir(targetDir);
        for (const file of files) {
          if (!file.endsWith(".html") || file.startsWith("starter-blueprint") || file.startsWith("_")) continue;

          const id = file.replace(".html", "").toLowerCase();
          if (discovered.some((d) => d.id === id)) continue;

          const fullPath = path.join(targetDir, file);
          const htmlContent = await fs.promises.readFile(fullPath, "utf-8");

          const formattedName = id
            .split(/[-_]/)
            .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
            .join(" ");

          const hasStory = htmlContent.includes("{{storySectionHtml}}") || htmlContent.includes("{{storyHtml}}") || htmlContent.includes("{{storyItemsHtml}}");
          const hasGallery = htmlContent.includes("{{gallerySectionHtml}}") || htmlContent.includes("{{galleryHtml}}") || htmlContent.includes("{{galleryPhotosHtml}}") || htmlContent.includes("{{galleryItemsHtml}}");
          const hasGift = htmlContent.includes("{{giftSectionHtml}}") || htmlContent.includes("{{giftHtml}}") || htmlContent.includes("{{giftCardsHtml}}") || htmlContent.includes("{{bankListHtml}}");
          const hasQr = htmlContent.includes("{{qrAccessSectionHtml}}") || htmlContent.includes("{{qrDockButtonHtml}}") || htmlContent.includes("{{qrAccessCardHtml}}") || htmlContent.includes("{{qrCoverButtonHtml}}");

          discovered.push({
            id,
            name: formattedName,
            category: sf.category,
            series: sf.series,
            eventType: ef.eventType,
            filePath: path.relative(process.cwd(), fullPath),
            hasStory,
            hasGallery,
            hasGift,
            hasQr,
            isHealthValid: hasStory && hasGallery && hasGift,
          });
        }
      }
    }

    // 2. Legacy fallback scan (themes/<style>/) jika belum dipindahkan
    for (const sf of STYLE_FOLDERS) {
      const targetDir = path.join(themesDir, sf.styleFolder);
      try {
        await fs.promises.access(targetDir);
      } catch {
        continue;
      }

      const files = await fs.promises.readdir(targetDir);
      for (const file of files) {
        if (!file.endsWith(".html") || file.startsWith("starter-blueprint") || file.startsWith("_")) continue;

        const id = file.replace(".html", "").toLowerCase();
        if (discovered.some((d) => d.id === id)) continue;

        const fullPath = path.join(targetDir, file);
        const htmlContent = await fs.promises.readFile(fullPath, "utf-8");

        const formattedName = id
          .split(/[-_]/)
          .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
          .join(" ");

        const hasStory = htmlContent.includes("{{storySectionHtml}}") || htmlContent.includes("{{storyHtml}}") || htmlContent.includes("{{storyItemsHtml}}");
        const hasGallery = htmlContent.includes("{{gallerySectionHtml}}") || htmlContent.includes("{{galleryHtml}}") || htmlContent.includes("{{galleryPhotosHtml}}") || htmlContent.includes("{{galleryItemsHtml}}");
        const hasGift = htmlContent.includes("{{giftSectionHtml}}") || htmlContent.includes("{{giftHtml}}") || htmlContent.includes("{{giftCardsHtml}}") || htmlContent.includes("{{bankListHtml}}");
        const hasQr = htmlContent.includes("{{qrAccessSectionHtml}}") || htmlContent.includes("{{qrDockButtonHtml}}") || htmlContent.includes("{{qrAccessCardHtml}}") || htmlContent.includes("{{qrCoverButtonHtml}}");

        discovered.push({
          id,
          name: formattedName,
          category: sf.category,
          series: sf.series,
          eventType: "WEDDING",
          filePath: path.relative(process.cwd(), fullPath),
          hasStory,
          hasGallery,
          hasGift,
          hasQr,
          isHealthValid: hasStory && hasGallery && hasGift,
        });
      }
    }

    if (discovered.length === 0) {
      return NextResponse.json(
        { success: false, error: "Peringatan Keamanan: Tidak ada berkas tema yang terdeteksi di direktori themes/. Sinkronisasi dibatalkan untuk mencegah penghapusan data secara tidak sengaja." },
        { status: 400 }
      );
    }

    // Upsert into Database (Theme Table)
    let syncedCount = 0;
    const { DEMO_REGISTRY } = await import("@/lib/demoRegistry");

    for (let i = 0; i < discovered.length; i++) {
      const d = discovered[i];
      const existing = await prisma.theme.findUnique({ where: { id: d.id } });
      const demoData = (DEMO_REGISTRY as any)[d.id];
      const defaultDesc = demoData?.tagline || `${d.series} — ${d.name} Exclusive Design`;

      await prisma.theme.upsert({
        where: { id: d.id },
        update: {
          name: d.name,
          category: d.category,
          eventType: (d.eventType as any) || "WEDDING",
          series: d.series,
          sortOrder: existing?.sortOrder ?? (i + 1),
          description: existing?.description || defaultDesc,
          thumbnail: existing?.thumbnail || demoData?.sidebarPhotoUrl || demoData?.landingCoverUrl || null,
          ...(existing ? {} : { isActive: true }),
        },
        create: {
          id: d.id,
          name: d.name,
          category: d.category,
          eventType: (d.eventType as any) || "WEDDING",
          series: d.series,
          description: defaultDesc,
          thumbnail: demoData?.sidebarPhotoUrl || demoData?.landingCoverUrl || null,
          sortOrder: i + 1,
          isActive: true,
        },
      });
      syncedCount++;
    }

    // Purge any themes in Database that no longer exist in themes/ directory
    const discoveredIds = discovered.map((d) => d.id);
    const existingCount = await prisma.theme.count();
    const toDeleteCount = existingCount - discoveredIds.length;
    if (existingCount > 0 && toDeleteCount > Math.floor(existingCount * 0.5)) {
      return NextResponse.json({
        success: false,
        error: `Safety abort: ${toDeleteCount} dari ${existingCount} tema akan dihapus. Periksa konfigurasi folder sebelum sinkronisasi.`
      }, { status: 400 });
    }

    const { count: purgedCount } = await prisma.theme.deleteMany({
      where: {
        id: { notIn: discoveredIds },
        invitations: { none: {} },
      },
    });
    const retainedIds = (await prisma.theme.findMany({
      where: { id: { notIn: discoveredIds } },
      select: { id: true },
    })).map((t) => t.id);

    // Invalidate in-memory template cache so fresh disk content is always read
    const { masterTemplateCache } = await import("@/lib/cache");
    masterTemplateCache.clear();

    // Pre-compile all demo themes into static index.html files
    const { compileAllStaticDemos } = await import("@/lib/demoPublisher");
    const precompiledCount = await compileAllStaticDemos();

    // Purge / Invalidate Next.js cache for showroom, public API, and all demo pages
    revalidatePath("/demo");
    revalidatePath("/demo/[theme]", "page");
    revalidatePath("/demo/preview");
    revalidatePath("/api/public/themes");
    revalidatePath("/");

    // Otomatis bersihkan Cloudflare Edge Cache jika kredensial terkonfigurasi
    await purgeCloudflareCache({ purgeEverything: true });

    return NextResponse.json({
      success: true,
      message: `Sinkronisasi tema berhasil! ${syncedCount} tema tersinkron dan ${precompiledCount} file HTML demo statis telah diperbarui.`,
      syncedCount,
      precompiledCount,
      purgedCount,
      retainedWithoutFile: retainedIds,
      discoveredThemes: discovered,
      timestamp: new Date().toISOString(),
    });
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : "Gagal melakukan sinkronisasi tema";
    console.error("Theme Sync Error:", errorMsg);
    return NextResponse.json(
      { success: false, error: errorMsg },
      { status: 500 }
    );
  }
}
