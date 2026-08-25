import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import fs from "fs";
import path from "path";
import { buildAndSavePublishedHtml } from "@/lib/staticPublisher";
import { extractGoogleDriveFolderId, uploadToGoogleDriveWebhook } from "@/lib/driveHelper";
import { getAdminSetting } from "@/lib/settings";

export const dynamic = "force-dynamic";

function sanitizeFilename(name: string): string {
  return name.toLowerCase().trim().replace(/[^a-z0-9]/g, "_").slice(0, 30);
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();

    const invitationId = formData.get("invitationId") as string;
    const senderName = (formData.get("senderName") as string || "").trim();
    const senderEmail = (formData.get("senderEmail") as string || "").trim();
    const message = (formData.get("message") as string || "").trim();
    const mediaType = (formData.get("mediaType") as string || "PHOTO").toUpperCase();
    const file = formData.get("file") as File | null;

    if (!invitationId) {
      return NextResponse.json({ error: "ID Undangan wajib disertakan." }, { status: 400 });
    }

    if (!senderName) {
      return NextResponse.json({ error: "Nama pengirim wajib diisi." }, { status: 400 });
    }

    if (!senderEmail || !senderEmail.includes("@")) {
      return NextResponse.json({ error: "Email pengirim yang valid wajib diisi." }, { status: 400 });
    }

    if (!file) {
      return NextResponse.json({ error: "File foto atau video wajib diunggah." }, { status: 400 });
    }

    // Safety checks: file size limit (25MB max for video, 15MB for photo)
    const MAX_FILE_SIZE = 25 * 1024 * 1024;
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "Ukuran file melebihi batas maksimal 25 MB." }, { status: 400 });
    }

    const invitation = await prisma.invitation.findUnique({
      where: { id: invitationId },
    });

    if (!invitation) {
      return NextResponse.json({ error: "Undangan tidak ditemukan." }, { status: 404 });
    }

    // Extract client's Google Drive Folder Setting
    let feat: any = {};
    try {
      feat = typeof invitation.featureSettings === "string"
        ? JSON.parse(invitation.featureSettings)
        : (invitation.featureSettings || {});
    } catch {}

    const clientDriveFolderUrl = feat.guestMemoriesDriveFolderUrl || feat.driveFolderUrl || feat.googleDriveUrl || "";
    const clientFolderId = extractGoogleDriveFolderId(clientDriveFolderUrl);

    // Retrieve Admin Master Webhook URL
    const masterWebhookUrl = (await getAdminSetting("gdrive_webhook_url")) || process.env.GOOGLE_DRIVE_WEBHOOK_URL || "";

    const timestamp = Date.now();
    const ext = path.extname(file.name) || (mediaType === "VIDEO" ? ".mp4" : ".webp");
    const sanitizedSender = sanitizeFilename(senderName);
    const fileName = `${sanitizedSender}_${timestamp}${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    let mediaUrl = "";
    let thumbnailUrl = "";
    let isCloudUploaded = false;

    // ── OPSI 1: DIRECT STREAM TO GOOGLE DRIVE (ZERO SERVER DISK) ──
    if (masterWebhookUrl && clientFolderId) {
      console.log(`[Guest Memories] Direct streaming to Google Drive folder: ${clientFolderId}`);
      const uploadResult = await uploadToGoogleDriveWebhook(masterWebhookUrl, clientFolderId, {
        fileName,
        mimeType: file.type || (mediaType === "VIDEO" ? "video/mp4" : "image/webp"),
        buffer,
        senderName,
      });

      if (uploadResult?.viewUrl) {
        mediaUrl = uploadResult.viewUrl;
        thumbnailUrl = uploadResult.thumbnailUrl || uploadResult.viewUrl;
        isCloudUploaded = true;
        console.log(`[Guest Memories] Google Drive upload success: ${mediaUrl} (Server Disk Usage: 0 Bytes)`);
      }
    }

    // ── OPSI 2: LOCAL FALLBACK IF GOOGLE DRIVE WEBHOOK NOT CONFIGURED YET ──
    if (!isCloudUploaded) {
      const uploadDir = path.join(process.cwd(), "public", "uploads", "memories", invitationId);
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      const filePath = path.join(uploadDir, fileName);
      fs.writeFileSync(filePath, buffer);
      mediaUrl = `/uploads/memories/${invitationId}/${fileName}`;
      thumbnailUrl = mediaUrl;
      console.log(`[Guest Memories] Saved locally: ${mediaUrl}`);
    }

    // Save to Database (Only stores URL and sender metadata)
    const memory = await prisma.guestMemory.create({
      data: {
        invitationId,
        senderName,
        senderEmail,
        message: message || null,
        mediaType: mediaType === "VIDEO" ? "VIDEO" : "PHOTO",
        mediaUrl,
        thumbnailUrl,
      },
    });

    // Auto-rebake standalone HTML if invitation is published
    if (invitation.status === "PUBLISHED") {
      try {
        await buildAndSavePublishedHtml(invitation.id);
      } catch (err) {
        console.error("Re-bake after memory upload failed:", err);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Terima kasih ${senderName}! Foto/video kenangan Anda berhasil disimpan.`,
      isCloudUploaded,
      memory: {
        id: memory.id,
        senderName: memory.senderName,
        mediaUrl: memory.mediaUrl,
        thumbnailUrl: memory.thumbnailUrl,
        createdAt: memory.createdAt,
      },
    });
  } catch (err: any) {
    console.error("Error uploading guest memory:", err);
    return NextResponse.json({ error: err?.message || "Gagal mengunggah file kenangan." }, { status: 500 });
  }
}
