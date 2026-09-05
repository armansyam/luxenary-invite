import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const DEFAULT_MUSIC_PRESETS = [
  {
    id: "canon-in-d",
    title: "Canon in D",
    composer: "Johann Pachelbel",
    genre: "Piano & Strings Klasik Sakral",
    url: "/music/canon-in-d.ogg",
    durationSec: 180,
    sortOrder: 1,
    isActive: true,
  },
  {
    id: "pachelbel-piano",
    title: "Canon in D (Solo Piano)",
    composer: "Johann Pachelbel",
    genre: "Piano Tunggal Lembut",
    url: "/music/pachelbel-piano.ogg",
    durationSec: 195,
    sortOrder: 2,
    isActive: true,
  },
  {
    id: "canon-gigue",
    title: "Canon & Gigue in D Major",
    composer: "Johann Pachelbel",
    genre: "Orkestra Klasik Ceria & Elegan",
    url: "/music/canon-gigue.ogg",
    durationSec: 210,
    sortOrder: 3,
    isActive: true,
  },
  {
    id: "moonlight-sonata",
    title: "Moonlight Sonata (Adagio)",
    composer: "Ludwig van Beethoven",
    genre: "Piano Romantis Melankolis",
    url: "/music/moonlight-sonata.ogg",
    durationSec: 160,
    sortOrder: 4,
    isActive: true,
  },
];

export async function GET() {
  try {
    const presets = await prisma.musicPreset.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
    });

    return NextResponse.json({
      success: true,
      music: presets,
    });
  } catch (error: any) {
    console.error("[Public Music API Error]:", error);
    return NextResponse.json({
      success: false,
      error: "Gagal memuat pustaka musik sistem",
    }, { status: 500 });
  }
}
