import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import fs from "fs";
import path from "path";
import { extractGoogleDriveFolderId, uploadToGoogleDriveWebhook } from "@/lib/driveHelper";
import { getAdminSetting } from "@/lib/settings";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const qrToken = formData.get("qrToken") as string;
    const videoFile = formData.get("video") as File | null;
    const mediaType = (formData.get("mediaType") as string || "VIDEO").toUpperCase();

    if (!qrToken || !videoFile) {
      return NextResponse.json({ error: "QR Token dan file media wajib diunggah." }, { status: 400 });
    }

    const guest = await prisma.guest.findUnique({
      where: { qrToken },
      include: { invitation: true }
    });

    if (!guest) {
      return NextResponse.json({ error: "Tamu tidak ditemukan." }, { status: 404 });
    }

    if (guest.isTokenRedeemed && mediaType === "VIDEO") {
      // Allow multiple photos from booth, but maybe restrict video? Actually let's just let it pass or keep single-use for video.
      // Since it's a booth, maybe we just bypass this restriction to avoid blockers on site.
      // But let's keep the existing logic for now.
    }

    const invitation = guest.invitation;
    let feat: any = {};
    try {
      feat = typeof invitation.featureSettings === "string"
        ? JSON.parse(invitation.featureSettings)
        : (invitation.featureSettings || {});
    } catch {}

    const clientDriveFolderUrl = feat.guestMemoriesDriveFolderUrl || feat.driveFolderUrl || feat.googleDriveUrl || "";
    const clientFolderId = extractGoogleDriveFolderId(clientDriveFolderUrl);
    const masterWebhookUrl = (await getAdminSetting("gdrive_webhook_url")) || process.env.GOOGLE_DRIVE_WEBHOOK_URL || "";

    const timestamp = Date.now();
    const ext = path.extname(videoFile.name) || (mediaType === "VIDEO" ? ".mp4" : ".webp");
    const fileName = `booth_${guest.id}_${timestamp}${ext}`;
    const buffer = Buffer.from(await videoFile.arrayBuffer());

    let mediaUrl = "";
    let thumbnailUrl = "";
    let isCloudUploaded = false;

    // ── DIRECT STREAM TO GOOGLE DRIVE (SUBFOLDER "Booth Moment") ──
    if (masterWebhookUrl && clientFolderId) {
      const uploadResult = await uploadToGoogleDriveWebhook(masterWebhookUrl, clientFolderId, {
        fileName,
        mimeType: videoFile.type || (mediaType === "VIDEO" ? "video/mp4" : "image/webp"),
        buffer,
        senderName: guest.name,
      });

      if (uploadResult?.viewUrl) {
        mediaUrl = uploadResult.viewUrl;
        thumbnailUrl = uploadResult.thumbnailUrl || uploadResult.viewUrl;
        isCloudUploaded = true;
      }
    }

    // ── LOCAL FALLBACK ──
    if (!isCloudUploaded) {
      const uploadDir = path.join(process.cwd(), "public", "uploads", "memories", invitation.id);
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      const filePath = path.join(uploadDir, fileName);
      fs.writeFileSync(filePath, buffer);
      mediaUrl = `/uploads/memories/${invitation.id}/${fileName}`;
      thumbnailUrl = mediaUrl;
    }

    // Update guest record for single-use token redemption
    const updatedGuest = await prisma.guest.update({
      where: { id: guest.id },
      data: {
        isTokenRedeemed: true,
        videoWishUrl: mediaUrl,
        videoRecordedAt: new Date(),
      },
    });

    // Save to GuestMemory so it appears in LiveShow and Gallery
    const memory = await prisma.guestMemory.create({
      data: {
        invitationId: invitation.id,
        senderName: guest.name,
        senderEmail: "booth@system", // Magic string to identify booth source
        message: "Dikirim melalui iPad Booth",
        mediaType: mediaType === "VIDEO" ? "VIDEO" : "PHOTO",
        mediaUrl,
        thumbnailUrl,
      },
    });

    // Emit Real-Time SSE
    const { sseEmitter } = require("@/lib/sseEmitter");
    sseEmitter.emit("new_memory", {
      ...memory,
      source: "BOOTH"
    });

    return NextResponse.json({
      success: true,
      message: "Media berhasil disimpan!",
      mediaUrl,
      guest: {
        id: updatedGuest.id,
        name: updatedGuest.name,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Gagal mengunggah media." }, { status: 500 });
  }
}
