import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getPublicPlatformSettings } from "@/lib/settings";
import fs from "fs";
import path from "path";
import crypto from "crypto";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const data = await req.json();
    const { invitationId, base64File, mimeType, senderName, senderEmail, caption, fileName } = data;

    if (!invitationId || !base64File) {
      return NextResponse.json({ error: "Data tidak lengkap" }, { status: 400 });
    }

    const invitation = await prisma.invitation.findUnique({
      where: { id: invitationId },
    });

    if (!invitation) {
      return NextResponse.json({ error: "Undangan tidak ditemukan." }, { status: 404 });
    }

    // Prepare Directory
    const memoriesDir = path.join(process.cwd(), "public", "uploads", "invitations", invitationId, "memories");
    try {
      await fs.promises.access(memoriesDir);
    } catch {
      await fs.promises.mkdir(memoriesDir, { recursive: true });
    }

    // Decode Base64 and write file
    const safeFileName = fileName ? fileName.replace(/[^a-zA-Z0-9.-]/g, '_') : `momen_${Date.now()}.jpg`;
    const finalFileName = `${crypto.randomBytes(4).toString("hex")}_${safeFileName}`;
    const filePath = path.join(memoriesDir, finalFileName);

    const base64Data = base64File.replace(/^data:image\/\w+;base64,/, "");
    const buffer = Buffer.from(base64Data, "base64");
    
    // Ambil limit dari settings, default 5MB jika tidak diset
    const settings = await getPublicPlatformSettings();
    const maxUploadBytes = (settings.maxUploadMb || 5) * 1024 * 1024;

    if (buffer.byteLength > maxUploadBytes) {
      return NextResponse.json({ error: `Ukuran file melebihi batas maksimal ${settings.maxUploadMb || 5}MB.` }, { status: 400 });
    }

    await fs.promises.writeFile(filePath, buffer);

    const mediaUrl = `/uploads/invitations/${invitationId}/memories/${finalFileName}`;

    // Save to Database
    const memory = await prisma.guestMemory.create({
      data: {
        invitationId,
        senderName: senderName || "Guest",
        senderEmail: senderEmail || "guest@system",
        mediaUrl,
        mediaType: "IMAGE", // Compressed JPEG from Canvas
        thumbnailUrl: mediaUrl,
        message: caption || "",
      },
    });

    return NextResponse.json({ 
      success: true, 
      memory,
      viewUrl: mediaUrl
    });

  } catch (error: any) {
    console.error("[Memories Upload Error]", error);
    return NextResponse.json({ error: error.message || "Terjadi kesalahan server saat upload" }, { status: 500 });
  }
}
