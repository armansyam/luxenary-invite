import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import fs from "fs";
import path from "path";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

export const dynamic = "force-dynamic";

interface DiscoveredTheme {
  id: string;
  name: string;
  category: "premium" | "modern" | "traditional";
  series: string;
  filePath: string;
  hasStory: boolean;
  hasGallery: boolean;
  hasGift: boolean;
  hasQr: boolean;
  isHealthValid: boolean;
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    const isAdmin = (session?.user as any)?.isAdmin === true || (session?.user as any)?.role === "SUPER_ADMIN" || (session?.user as any)?.role === "ADMIN";
    if (!session?.user || !isAdmin) {
      return NextResponse.json({ error: "Unauthorized. Khusus Administrator." }, { status: 401 });
    }

    const themesDir = path.join(process.cwd(), "themes");
    const discovered: DiscoveredTheme[] = [];

    const folders = [
      { name: "premium", category: "premium" as const, series: "Premium" },
      { name: "modern", category: "modern" as const, series: "Modern" },
      { name: "traditional", category: "traditional" as const, series: "Traditional" },
      { name: "", category: "modern" as const, series: "Modern" },
    ];

    for (const folder of folders) {
      const targetDir = folder.name ? path.join(themesDir, folder.name) : themesDir;
      if (!fs.existsSync(targetDir)) continue;

      const files = fs.readdirSync(targetDir);
      for (const file of files) {
        if (!file.endsWith(".html") || file === "starter-blueprint.html") continue;

        const id = file.replace(".html", "").toLowerCase();
        // Skip duplicate IDs if already found in a subfolder
        if (discovered.some((d) => d.id === id)) continue;

        const fullPath = path.join(targetDir, file);
        const htmlContent = fs.readFileSync(fullPath, "utf-8");

        // Format name e.g. "dillalucky" -> "Dilla Lucky", "kalandra" -> "Kalandra"
        const formattedName = id
          .split(/[-_]/)
          .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
          .join(" ");

        const hasStory = htmlContent.includes("{{storySectionHtml}}") || htmlContent.includes("{{storyHtml}}");
        const hasGallery = htmlContent.includes("{{gallerySectionHtml}}") || htmlContent.includes("{{galleryHtml}}");
        const hasGift = htmlContent.includes("{{giftSectionHtml}}") || htmlContent.includes("{{giftHtml}}");
        const hasQr = htmlContent.includes("{{qrAccessSectionHtml}}") || htmlContent.includes("{{qrDockButtonHtml}}");

        discovered.push({
          id,
          name: formattedName,
          category: folder.category,
          series: folder.series,
          filePath: path.relative(process.cwd(), fullPath),
          hasStory,
          hasGallery,
          hasGift,
          hasQr,
          isHealthValid: hasStory && hasGallery && hasGift,
        });
      }
    }

    // Upsert into Database (Theme Table)
    let syncedCount = 0;
    for (let i = 0; i < discovered.length; i++) {
      const d = discovered[i];
      const existing = await prisma.theme.findUnique({ where: { id: d.id } });

      await prisma.theme.upsert({
        where: { id: d.id },
        update: {
          name: d.name,
          category: d.category,
          series: d.series,
          sortOrder: i + 1,
          ...(existing ? {} : { isActive: true }),
        },
        create: {
          id: d.id,
          name: d.name,
          category: d.category,
          series: d.series,
          description: `${d.series} — ${d.name} Exclusive Design`,
          isPremium: d.category === "premium",
          sortOrder: i + 1,
          isActive: true,
        },
      });
      syncedCount++;
    }

    // Purge / Invalidate Next.js cache for showroom and all demo pages
    revalidatePath("/demo");
    revalidatePath("/demo/[theme]", "page");
    revalidatePath("/demo/preview");
    revalidatePath("/");

    return NextResponse.json({
      success: true,
      message: "Sinkronisasi tema dan pembersihan cache berhasil 100%",
      syncedCount,
      discoveredThemes: discovered,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("Theme Sync Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Gagal melakukan sinkronisasi tema" },
      { status: 500 }
    );
  }
}
