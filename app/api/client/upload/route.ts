import { NextRequest, NextResponse } from "next/server";
import path from "path";
import sharp from "sharp";
import { uploadFile } from "@/lib/storage";
import { optimizeWebVideo, optimizeWebAudio } from "@/lib/videoOptimizer";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const SLOT_FILE_NAMES: Record<string, string> = {
  LANDING_COVER: "landing-cover",
  DESKTOP_SIDEBAR: "sidebar-desktop",
  GLOBAL_FIXED_BG: "fixed-bg",
  BRIDE_PHOTO: "bride-photo",
  GROOM_PHOTO: "groom-photo",
  QRIS: "qris",
  CLOSING_COVER: "closing-cover",
};

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized. Silakan login terlebih dahulu." }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const rawInvitationId = (formData.get("invitationId") as string) || "general";
    const rawSlot = (formData.get("slot") as string) || "photo";

    if (!file) {
      return NextResponse.json({ error: "File media tidak ditemukan" }, { status: 400 });
    }

    // Sanitize folder and slot identifiers to prevent path traversal
    const safeInvitationId = rawInvitationId.replace(/[^a-zA-Z0-9_-]/g, "") || "general";

    let invStatus = "DRAFT";

    if (safeInvitationId !== "general") {
      const inv = await prisma.invitation.findUnique({
        where: { id: safeInvitationId },
        select: { userId: true, status: true },
      });
      if (inv) {
        invStatus = inv.status;
        const isOwner = inv.userId === session.user.id;
        const isAdmin = (session.user as any).isAdmin === true || (session.user as any).role === "SUPER_ADMIN" || (session.user as any).role === "ADMIN";
        if (!isOwner && !isAdmin) {
          return NextResponse.json({ error: "Forbidden. Anda tidak memiliki akses ke undangan ini." }, { status: 403 });
        }
      }
    }

    const slotKey = rawSlot.toUpperCase();
    const baseSlug = SLOT_FILE_NAMES[slotKey] || rawSlot.toLowerCase().replace(/[^a-z0-9_-]/g, "") || "photo";

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Pathing logic
    const relativePathBase = `invitations/${safeInvitationId}`;
    const isAudio = file.type.startsWith("audio/") || file.name.endsWith(".mp3") || file.name.endsWith(".wav") || file.name.endsWith(".m4a") || slotKey === "MUSIC";
    const isVideo = !isAudio && (file.type.startsWith("video/") || file.name.endsWith(".mp4") || file.name.endsWith(".webm") || file.name.endsWith(".mov"));

    let finalFileName = "";
    let finalBuffer: Buffer;

    if (isAudio) {
      // Audio: auto-compress to MP3 128kbps via FFmpeg
      // Mendukung input: MP3, WAV, M4A, OGG, FLAC, AAC
      finalFileName = `wedding-song-${Date.now()}.mp3`;
      finalBuffer = await optimizeWebAudio(buffer, `wedding-song-${Date.now()}`);
    } else if (isVideo) {
      // Automatic Video Web Optimization:
      // - Standardize to .mp4 (H.264 / AAC)
      // - Apply +faststart moov atom header for instant streaming playback
      // - Max 1080p scale with bitrate compression
      finalFileName = `${baseSlug}.mp4`;
      finalBuffer = await optimizeWebVideo(buffer, baseSlug);
    } else {
      // Intelligent Slot-Specific Dimensions & Lightweight Compression:
      let maxWidth = 1600;
      let maxHeight = 1600;
      let quality = 82;

      if (slotKey === "BRIDE_PHOTO" || slotKey === "GROOM_PHOTO") {
        maxWidth = 1200;
        maxHeight = 1200;
        quality = 82;
      } else if (slotKey === "QRIS") {
        maxWidth = 800;
        maxHeight = 800;
        quality = 85;
      }

      finalFileName = `${baseSlug}.webp`;
      finalBuffer = await sharp(buffer)
        .rotate()
        .resize({
          width: maxWidth,
          height: maxHeight,
          fit: "inside",
          withoutEnlargement: true,
        })
        .sharpen({
          sigma: 0.8,
          m1: 0.5,
          m2: 1.5,
        })
        .webp({
          quality,
          effort: 4,
        })
        .toBuffer();
    }

    const relativePath = `${relativePathBase}/${finalFileName}`;
    let contentType = isAudio ? "audio/mpeg" : isVideo ? "video/mp4" : "image/webp";

    // Force local storage if invitation is still a DRAFT (even if R2 is active)
    const forceLocal = invStatus === "DRAFT";

    // Clean up any old files with different extensions for this slot (Local ONLY)
    if (forceLocal || (process.env.STORAGE_PROVIDER !== "r2" && process.env.STORAGE_PROVIDER !== "s3")) {
      const uploadsDir = path.join(process.cwd(), "public", "uploads", "invitations", safeInvitationId);
      try {
        const fs = await import("fs");
        const existingFiles = await fs.promises.readdir(uploadsDir);
        for (const f of existingFiles) {
          const fileBase = path.parse(f).name;
          if (fileBase === baseSlug && f !== finalFileName) {
            try {
              await fs.promises.unlink(path.join(uploadsDir, f));
            } catch {}
          }
        }
      } catch {}
    }

    const uploadedUrl = await uploadFile(finalBuffer, relativePath, contentType, forceLocal);
    
    // Add cache buster timestamp
    const publicUrl = `${uploadedUrl}?t=${Date.now()}`;

    return NextResponse.json({
      success: true,
      url: publicUrl,
      fileName: finalFileName,
      folder: safeInvitationId,
      sizeBytes: finalBuffer.length,
      mediaType: isAudio ? "audio" : isVideo ? "video" : "image",
    });
  } catch (error: any) {
    console.error("Upload processing failed:", error);
    return NextResponse.json({ error: error.message || "Gagal mengunggah media" }, { status: 500 });
  }
}
