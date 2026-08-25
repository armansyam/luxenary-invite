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
      const demoData = DEMO_REGISTRY[t.id.toLowerCase()];
      const tagline = t.description || demoData?.tagline || "";
      return {
        id: t.id,
        name: t.name,
        series: t.series || (t.category.toLowerCase() === "premium" ? "Premium" : t.category.toLowerCase() === "traditional" ? "Traditional" : "Modern"),
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
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
