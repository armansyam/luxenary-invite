import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import fs from "fs";
import path from "path";
import { optimizeWebAudio } from "@/lib/videoOptimizer";
import { syncPhysicalMusicPresets } from "@/lib/musicPresetSync";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await auth();
    const isAdmin = (session?.user as any)?.isAdmin === true || (session?.user as any)?.role === "SUPER_ADMIN" || (session?.user as any)?.role === "ADMIN";

    if (!session?.user || !isAdmin) {
      return NextResponse.json({ error: "Unauthorized. Khusus Administrator." }, { status: 401 });
    }

    // Auto-sync file fisik audio dari folder public/music/ jika belum terdaftar di database
    await syncPhysicalMusicPresets();

    const musicList = await prisma.musicPreset.findMany({
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
    });

    return NextResponse.json({
      success: true,
      music: musicList,
    });
  } catch (error: any) {
    console.error("[Admin Get Music Error]:", error);
    return NextResponse.json({ error: "Gagal mengambil daftar musik sistem" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    const isAdmin = (session?.user as any)?.isAdmin === true || (session?.user as any)?.role === "SUPER_ADMIN" || (session?.user as any)?.role === "ADMIN";

    if (!session?.user || !isAdmin) {
      return NextResponse.json({ error: "Unauthorized. Khusus Administrator." }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const title = (formData.get("title") as string)?.trim();
    const composer = (formData.get("composer") as string)?.trim() || null;
    const genre = (formData.get("genre") as string)?.trim() || null;
    const rawDuration = formData.get("durationSec") as string;
    const durationSec = rawDuration ? parseInt(rawDuration, 10) : 0;

    if (!file || !title) {
      return NextResponse.json({ error: "File audio dan judul lagu wajib diisi." }, { status: 400 });
    }

    // File validation
    const validExts = [".mp3", ".ogg", ".wav", ".m4a", ".flac", ".aac"];
    const fileExt = path.extname(file.name).toLowerCase();
    const isAudio = file.type.startsWith("audio/") || validExts.includes(fileExt);

    if (!isAudio) {
      return NextResponse.json({ error: "Format file tidak valid. Harap unggah file audio (MP3, WAV, M4A, OGG)." }, { status: 400 });
    }

    if (file.size > 25 * 1024 * 1024) {
      return NextResponse.json({ error: "Ukuran audio melebihi batas maksimal 25 MB." }, { status: 400 });
    }

    const slug = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || `song-${Date.now()}`;

    const musicDir = path.join(process.cwd(), "public", "music");
    await fs.promises.mkdir(musicDir, { recursive: true });

    let finalFileName = `${slug}.mp3`;
    let targetFilePath = path.join(musicDir, finalFileName);

    // If file with same name exists, append random suffix
    if (fs.existsSync(targetFilePath)) {
      finalFileName = `${slug}-${Date.now().toString(36).slice(-4)}.mp3`;
      targetFilePath = path.join(musicDir, finalFileName);
    }

    const bytes = await file.arrayBuffer();
    const rawBuffer = Buffer.from(bytes);

    // Auto-compress to web-optimized 128kbps stereo MP3
    const optimizedBuffer = await optimizeWebAudio(rawBuffer, slug);
    await fs.promises.writeFile(targetFilePath, optimizedBuffer);

    const publicUrl = `/music/${finalFileName}`;

    // Calculate next sort order
    const maxSort = await prisma.musicPreset.aggregate({
      _max: { sortOrder: true },
    });
    const nextSortOrder = (maxSort._max.sortOrder ?? 0) + 1;

    const newMusic = await prisma.musicPreset.create({
      data: {
        title,
        composer,
        genre,
        url: publicUrl,
        durationSec: isNaN(durationSec) ? 0 : durationSec,
        isActive: true,
        sortOrder: nextSortOrder,
      },
    });

    return NextResponse.json({
      success: true,
      music: newMusic,
    });
  } catch (error: any) {
    console.error("[Admin Upload Music Error]:", error);
    return NextResponse.json({ error: error.message || "Gagal mengunggah lagu sistem" }, { status: 500 });
  }
}
