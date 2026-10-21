import { NextRequest, NextResponse } from "next/server";
import { requireAdminModule } from "@/lib/adminAuth";
import { routeError } from "@/lib/routeError";
import { readFormBody } from "@/lib/requestBody";
import { fileTypeFromBuffer } from "file-type";
import { prisma } from "@/lib/prisma";
import fs from "fs";
import path from "path";
import { optimizeWebAudio } from "@/lib/videoOptimizer";
import { syncPhysicalMusicPresets } from "@/lib/musicPresetSync";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const guard = await requireAdminModule("themes");
    if (!guard.ok) return guard.response;

    // Auto-sync file fisik audio dari folder public/music/ jika belum terdaftar di database
    await syncPhysicalMusicPresets();

    const musicList = await prisma.musicPreset.findMany({
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
    });

    return NextResponse.json({
      success: true,
      music: musicList,
    });
  } catch (error) {
    return routeError("AdminMusic", error, "Gagal mengambil daftar musik sistem");
  }
}

export async function POST(req: NextRequest) {
  try {
    const guard = await requireAdminModule("themes");
    if (!guard.ok) return guard.response;

    const formData = await readFormBody(req);
    const file = formData.get("file") as File | null;
    const title = (formData.get("title") as string)?.trim();
    const composer = (formData.get("composer") as string)?.trim() || null;
    const genre = (formData.get("genre") as string)?.trim() || null;
    const rawDuration = formData.get("durationSec") as string;
    const durationSec = rawDuration ? parseInt(rawDuration, 10) : 0;

    if (!file || !title) {
      return NextResponse.json({ error: "File audio dan judul lagu wajib diisi." }, { status: 400 });
    }

    if (file.size > 25 * 1024 * 1024) {
      return NextResponse.json({ error: "Ukuran audio melebihi batas maksimal 25 MB." }, { status: 400 });
    }

    // Jenis ditentukan dari isi berkas, bukan nama atau tipe kiriman browser: berkas teks yang diteruskan ke ffmpeg
    // (playlist HLS/concat) dapat membuat ffmpeg membuka berkas lokal atau URL lain.
    const rawBuffer = Buffer.from(await file.arrayBuffer());
    const detected = await fileTypeFromBuffer(rawBuffer);
    // M4A dengan brand isom terdeteksi video/mp4; ffmpeg tetap mengambil trek audionya.
    if (!detected || !(detected.mime.startsWith("audio/") || detected.mime === "video/mp4")) {
      return NextResponse.json({ error: "Format file tidak valid. Harap unggah file audio (MP3, WAV, M4A, OGG)." }, { status: 400 });
    }

    const slug = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || `song-${Date.now()}`;

    // Next hanya melayani berkas public/ yang ada saat server start; berkas baru di public/music baru tersedia setelah
    // restart. Unggahan admin disimpan di bawah public/uploads yang dilayani rute dinamis app/uploads.
    const musicDir = path.join(process.cwd(), "public", "uploads", "music");
    await fs.promises.mkdir(musicDir, { recursive: true });

    let finalFileName = `${slug}.mp3`;
    let targetFilePath = path.join(musicDir, finalFileName);

    // If file with same name exists, append random suffix
    if (fs.existsSync(targetFilePath)) {
      finalFileName = `${slug}-${Date.now().toString(36).slice(-4)}.mp3`;
      targetFilePath = path.join(musicDir, finalFileName);
    }

    // Auto-compress to web-optimized 128kbps stereo MP3
    const optimizedBuffer = await optimizeWebAudio(rawBuffer, slug);
    await fs.promises.writeFile(targetFilePath, optimizedBuffer);

    const publicUrl = `/uploads/music/${finalFileName}`;

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
  } catch (error) {
    return routeError("AdminMusic", error, "Gagal mengunggah lagu sistem");
  }
}
