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

    const themes = dbThemes.map((t) => {
      const themeKey = t.id.toLowerCase();
      const demoData = DEMO_REGISTRY[themeKey];
      const tagline = t.description || demoData?.tagline || "";
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
        series: series,
        category: t.category.toUpperCase(),
        tagline: tagline,
        desc: tagline,
      };
    });

    return NextResponse.json(themes, {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    });
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : "Gagal memuat daftar tema";
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
