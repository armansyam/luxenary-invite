import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    const isAdmin = (session?.user as any)?.isAdmin === true || (session?.user as any)?.role === "SUPER_ADMIN" || (session?.user as any)?.role === "ADMIN";
    if (!session || !isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const themeId = id.toLowerCase().trim();

    const formData = await req.formData();
    const slot = formData.get("slot") as string; // cover, hero, background, groom, bride, gallery_01..08, music
    const file = formData.get("file") as File | null;

    if (!slot || !file) {
      return NextResponse.json({ error: "Slot dan file harus disertakan" }, { status: 400 });
    }

    const targetDir = path.join(process.cwd(), "public", "demo", themeId);
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    // Determine extension
    const isAudio = slot === "music" || file.type.startsWith("audio/") || /\.(mp3|ogg|wav|m4a)$/i.test(file.name);
    const isVideo = file.type.startsWith("video/") || /\.(mp4|webm|mov)$/i.test(file.name);

    let extension = "webp";
    if (isAudio) {
      extension = file.name.toLowerCase().endsWith(".ogg") ? "ogg" : "mp3";
    } else if (isVideo) {
      extension = "mp4";
    }

    const fileName = `${slot}.${extension}`;
    const targetFilePath = path.join(targetDir, fileName);

    // Clean up conflicting formats for this slot to avoid obsolete files
    if (isVideo) {
      ["webp", "png", "jpg", "webm"].forEach((ext) => {
        const conflictPath = path.join(targetDir, `${slot}.${ext}`);
        if (fs.existsSync(conflictPath)) {
          try { fs.unlinkSync(conflictPath); } catch {}
        }
      });
    } else if (!isAudio) {
      ["mp4", "webm"].forEach((ext) => {
        const conflictPath = path.join(targetDir, `${slot}.${ext}`);
        if (fs.existsSync(conflictPath)) {
          try { fs.unlinkSync(conflictPath); } catch {}
        }
      });
    }

    let buffer: Buffer = Buffer.from(await file.arrayBuffer());

    if (isVideo) {
      const { optimizeWebVideo } = await import("@/lib/videoOptimizer");
      buffer = await optimizeWebVideo(buffer, `${themeId}_${slot}`);
    } else if (isAudio) {
      const { optimizeWebAudio } = await import("@/lib/videoOptimizer");
      buffer = await optimizeWebAudio(buffer, `${themeId}_${slot}`);
    }

    fs.writeFileSync(targetFilePath, buffer);

    const rawUrl = `/demo/${themeId}/${fileName}`;
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
      }

      const upserted = await prisma.adminSetting.upsert({
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

      const version = upserted.updatedAt ? new Date(upserted.updatedAt).getTime() : Date.now();
      const { compileAndSaveStaticDemo } = await import("@/lib/demoPublisher");
      await compileAndSaveStaticDemo(themeId, customData, version);

      try {
        revalidatePath("/demo");
        revalidatePath(`/demo/${themeId}`);
        revalidatePath("/api/public/themes");
      } catch {}
    } catch (publishErr) {
      console.error("[DemoAsset-Publish-Error]:", publishErr);
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
  } catch (err: any) {
    console.error("[DemoAsset-Upload-Error]:", err);
    return NextResponse.json(
      { error: err.message || "Gagal mengunggah aset demo" },
      { status: 500 }
    );
  }
}
