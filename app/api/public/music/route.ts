import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { syncPhysicalMusicPresets } from "@/lib/musicPresetSync";
import { routeError } from "@/lib/routeError";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await syncPhysicalMusicPresets();

    const presets = await prisma.musicPreset.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
    });

    return NextResponse.json({
      success: true,
      music: presets,
    });
  } catch (error) {
    return routeError("PublicMusic", error, "Gagal memuat pustaka musik sistem");
  }
}
