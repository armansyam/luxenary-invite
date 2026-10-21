import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { requireAdminModule } from "@/lib/adminAuth";
import { logger } from "@/lib/logger";
import { routeError } from "@/lib/routeError";
import { isSafePathSegment, removeIfExists } from "@/lib/fsSafe";
import { readFormBody } from "@/lib/requestBody";
import { fileTypeFromBuffer } from "file-type";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

// Foto bawaan demo di `public/demo/<tema>/` dilacak git; unggahan admin produksi ditulis di luar git agar
// `git pull --ff-only` saat deploy tidak berhenti karena berkas yang sama berubah di server.
function demoUploadDir(themeId: string): string {
  return path.join(process.cwd(), "public", "uploads", "demo", themeId);
}

// Termasuk svg: unggahan sebelum 21 Okt 2026 dapat berupa SVG dan harus ikut terhapus saat slot dikosongkan.
const SLOT_FILE_EXTENSIONS = ["webp", "png", "jpg", "jpeg", "svg", "mp4", "webm", "mov", "mp3", "ogg", "wav", "m4a"];

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const guard = await requireAdminModule("themes");
    if (!guard.ok) return guard.response;

    const { id } = await params;
    const themeId = id.toLowerCase().trim();

    const formData = await readFormBody(req);
    const slot = formData.get("slot") as string; // cover, hero, background, groom, bride, gallery_01..08, music
    const file = formData.get("file") as File | null;

    if (!slot || !file) {
      return NextResponse.json({ error: "Slot dan file harus disertakan" }, { status: 400 });
    }
    // ID tema dan slot menjadi path tujuan tulis dan hapus di `public/uploads/demo/`.
    if (!isSafePathSegment(themeId) || !isSafePathSegment(slot)) {
      return NextResponse.json({ error: "ID tema atau slot tidak valid" }, { status: 400 });
    }

    let buffer: Buffer = Buffer.from(await file.arrayBuffer());

    // Jenis ditentukan dari isi berkas, bukan nama atau tipe kiriman browser: SVG atau HTML berkedok gambar disajikan
    // dari origin platform dan dapat menjalankan skrip, dan berkas teks yang diteruskan ke ffmpeg dapat membuka berkas lain.
    const detected = await fileTypeFromBuffer(buffer);
    const mime = detected?.mime || "";
    const isAudio = mime.startsWith("audio/");
    const isVideo = mime.startsWith("video/");
    const imageExtension = ({ "image/webp": "webp", "image/png": "png", "image/jpeg": "jpg" } as Record<string, string>)[mime];
    if (slot === "music" ? !isAudio : !(isAudio || isVideo || imageExtension)) {
      return NextResponse.json(
        { error: slot === "music" ? "Berkas musik tidak dikenali. Unggah MP3, OGG, WAV, atau M4A." : "Format berkas tidak didukung. Unggah foto JPG, PNG, atau WebP, video MP4, WebM, atau MOV, atau musik MP3." },
        { status: 415 }
      );
    }

    if (isVideo) {
      const { optimizeWebVideo } = await import("@/lib/videoOptimizer");
      buffer = await optimizeWebVideo(buffer, `${themeId}_${slot}`);
    } else if (isAudio) {
      const { optimizeWebAudio } = await import("@/lib/videoOptimizer");
      buffer = await optimizeWebAudio(buffer, `${themeId}_${slot}`);
    }
    // Pengoptimal menghasilkan MP4/MP3, atau mengembalikan berkas asli bila gagal; ekstensi mengikuti hasil akhir.
    const processedExt = isAudio || isVideo ? (await fileTypeFromBuffer(buffer))?.ext : undefined;
    const extension = imageExtension || (isAudio ? (processedExt === "ogg" ? "ogg" : "mp3") : (processedExt === "webm" ? "webm" : "mp4"));

    const targetDir = demoUploadDir(themeId);
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }
    const fileName = `${slot}.${extension}`;
    const targetFilePath = path.join(targetDir, fileName);

    // Satu slot satu berkas: format lain milik slot ini (termasuk SVG unggahan lama) dihapus.
    for (const ext of SLOT_FILE_EXTENSIONS) {
      if (ext !== extension) await removeIfExists(path.join(targetDir, `${slot}.${ext}`));
    }

    fs.writeFileSync(targetFilePath, buffer);

    const rawUrl = `/uploads/demo/${themeId}/${fileName}`;
    const publicUrl = `${rawUrl}?t=${Date.now()}`;

    // Update database adminSetting theme_demo_${themeId} and recompile static demo
    try {
      const { prisma } = await import("@/lib/prisma");
      const settingKey = `theme_demo_${themeId}`;
      const setting = await prisma.adminSetting.findUnique({
        where: { key: settingKey },
      });
      const customData = setting?.value ? JSON.parse(setting.value) : {};

      if (slot === "cover") {
        customData.landingCoverUrl = rawUrl;
      } else if (slot === "cover_desktop") {
        customData.landingCoverDesktopUrl = rawUrl;
      } else if (slot === "hero") {
        customData.sidebarPhotoUrl = rawUrl;
      } else if (slot === "background") {
        customData.globalBgUrl = rawUrl;
      } else if (slot === "home") {
        customData.homePhotoUrl = rawUrl;
      } else if (slot === "footer") {
        customData.footerPhotoUrl = rawUrl;
      } else if (slot === "groom") {
        customData.groomPhotoUrl = rawUrl;
      } else if (slot === "bride") {
        customData.bridePhotoUrl = rawUrl;
      } else if (slot === "thumbnail_mobile") {
        customData.thumbnailMobileUrl = rawUrl;
      } else if (slot === "thumbnail_desktop") {
        customData.thumbnailDesktopUrl = rawUrl;
      } else if (slot === "music") {
        customData.audioUrl = rawUrl;
      } else if (slot.startsWith("gallery_")) {
        const idx = parseInt(slot.replace("gallery_", ""), 10) - 1;
        if (!Array.isArray(customData.galleryPhotos)) {
          customData.galleryPhotos = [];
        }
        customData.galleryPhotos[idx] = rawUrl;
      } else if (slot.startsWith("vendor_")) {
        const rawIdx = parseInt(slot.replace("vendor_", "").replace("logo_", ""), 10);
        const idx = isNaN(rawIdx) ? 0 : Math.max(0, rawIdx - 1);
        if (!Array.isArray(customData.vendors)) {
          customData.vendors = [];
        }
        if (!customData.vendors[idx]) {
          customData.vendors[idx] = { name: "", logoUrl: rawUrl, url: "" };
        } else {
          customData.vendors[idx].logoUrl = rawUrl;
        }
      }

      await prisma.adminSetting.upsert({
        where: { key: settingKey },
        create: {
          key: settingKey,
          value: JSON.stringify(customData),
          label: `Demo Data Konfigurasi - ${themeId.toUpperCase()}`,
          group: "themes",
        },
        update: {
          value: JSON.stringify(customData),
        },
      });

      const { compileAndSaveStaticDemo } = await import("@/lib/demoPublisher");
      await compileAndSaveStaticDemo(themeId, customData);

      try {
        revalidatePath("/");
        revalidatePath("/demo");
        revalidatePath(`/demo/${themeId}`);
        revalidatePath("/api/public/themes");
        const { purgeCloudflareCache } = await import("@/lib/cloudflare");
        await purgeCloudflareCache({ purgeEverything: true });
      } catch (err) {
        logger.warn("DemoAsset", "Revalidasi atau purge cache Cloudflare gagal setelah unggah aset", { themeId, error: err instanceof Error ? err.message : String(err) });
      }
    } catch (publishErr) {
      logger.error("DemoAsset", "Aset tersimpan tetapi demo statis gagal dikompilasi ulang", publishErr, { themeId, slot });
    }

    return NextResponse.json({
      success: true,
      message: `Aset ${slot} (${isVideo ? "Video MP4" : isAudio ? "Audio" : "Gambar WebP"}) berhasil diperbarui & file preview statis telah dikompilasi ulang`,
      url: publicUrl,
      rawUrl,
      fileName,
      isVideo,
      isAudio,
      themeId,
    });
  } catch (err) {
    return routeError("DemoAsset", err, "Gagal mengunggah aset demo");
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const guard = await requireAdminModule("themes");
    if (!guard.ok) return guard.response;

    const { id } = await params;
    const themeId = id.toLowerCase().trim();

    const { searchParams } = new URL(req.url);
    const slot = searchParams.get("slot");

    if (!slot) {
      return NextResponse.json({ error: "Slot harus disertakan" }, { status: 400 });
    }
    if (!isSafePathSegment(themeId) || !isSafePathSegment(slot)) {
      return NextResponse.json({ error: "ID tema atau slot tidak valid" }, { status: 400 });
    }

    const targetDir = demoUploadDir(themeId);

    for (const ext of SLOT_FILE_EXTENSIONS) await removeIfExists(path.join(targetDir, `${slot}.${ext}`));

    // Update database adminSetting theme_demo_${themeId}
    try {
      const { prisma } = await import("@/lib/prisma");
      const settingKey = `theme_demo_${themeId}`;
      const setting = await prisma.adminSetting.findUnique({
        where: { key: settingKey },
      });
      const customData = setting?.value ? JSON.parse(setting.value) : {};

      if (slot === "cover") {
        customData.landingCoverUrl = "";
      } else if (slot === "cover_desktop") {
        customData.landingCoverDesktopUrl = "";
      } else if (slot === "hero") {
        customData.sidebarPhotoUrl = "";
      } else if (slot === "background") {
        customData.globalBgUrl = "";
      } else if (slot === "home") {
        customData.homePhotoUrl = "";
      } else if (slot === "footer") {
        customData.footerPhotoUrl = "";
        customData.closingPhotoUrl = "";
      } else if (slot === "groom") {
        customData.groomPhotoUrl = "";
      } else if (slot === "bride") {
        customData.bridePhotoUrl = "";
      } else if (slot === "thumbnail_mobile") {
        customData.thumbnailMobileUrl = "";
      } else if (slot === "thumbnail_desktop") {
        customData.thumbnailDesktopUrl = "";
      } else if (slot === "music") {
        customData.audioUrl = "";
      } else if (slot.startsWith("gallery_")) {
        const idx = parseInt(slot.replace("gallery_", ""), 10) - 1;
        if (Array.isArray(customData.galleryPhotos)) {
          customData.galleryPhotos[idx] = "";
        }
      } else if (slot.startsWith("vendor_")) {
        const rawIdx = parseInt(slot.replace("vendor_", "").replace("logo_", ""), 10);
        const idx = isNaN(rawIdx) ? 0 : Math.max(0, rawIdx - 1);
        if (Array.isArray(customData.vendors) && customData.vendors[idx]) {
          customData.vendors[idx].logoUrl = "";
        }
      }

      await prisma.adminSetting.upsert({
        where: { key: settingKey },
        create: {
          key: settingKey,
          value: JSON.stringify(customData),
          label: `Demo Data Konfigurasi - ${themeId.toUpperCase()}`,
          group: "themes",
        },
        update: {
          value: JSON.stringify(customData),
        },
      });

      const { compileAndSaveStaticDemo } = await import("@/lib/demoPublisher");
      await compileAndSaveStaticDemo(themeId, customData);

      try {
        revalidatePath("/");
        revalidatePath("/demo");
        revalidatePath(`/demo/${themeId}`);
        revalidatePath("/api/public/themes");
        const { purgeCloudflareCache } = await import("@/lib/cloudflare");
        await purgeCloudflareCache({ purgeEverything: true });
      } catch (err) {
        logger.warn("DemoAsset", "Revalidasi atau purge cache Cloudflare gagal setelah hapus aset", { themeId, error: err instanceof Error ? err.message : String(err) });
      }
    } catch (publishErr) {
      logger.error("DemoAsset", "Aset terhapus tetapi demo statis gagal dikompilasi ulang", publishErr, { themeId, slot });
    }

    return NextResponse.json({
      success: true,
      message: `Aset ${slot} berhasil dihapus dari tema ${themeId} & file preview statis telah diperbarui`,
      slot,
      themeId,
    });
  } catch (err) {
    return routeError("DemoAsset", err, "Gagal menghapus aset demo");
  }
}
