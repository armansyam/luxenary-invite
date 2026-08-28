import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getPublicPlatformSettings } from "@/lib/settings";
import path from "path";
import crypto from "crypto";
import { uploadFile } from "@/lib/storage";
import { rateLimit } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for") || "unknown-ip";
    // Limit: 15 request per menit (60000ms) untuk mengakomodasi jaringan WiFi yang sama
    if (!rateLimit(ip, 15, 60000)) {
      return NextResponse.json({ error: "Terlalu banyak permintaan unggahan. Silakan coba lagi sebentar." }, { status: 429 });
    }

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

    const safeFileName = fileName ? fileName.replace(/[^a-zA-Z0-9.-]/g, '_') : `momen_${Date.now()}.jpg`;
    const finalFileName = `${crypto.randomBytes(4).toString("hex")}_${safeFileName}`;
    // Pemisahan folder agar Cloudflare R2 bisa melakukan Auto-Delete 60 hari khusus untuk folder tamu ini
    const relativePath = `guest-memories/${invitationId}/${finalFileName}`;

    const base64Data = base64File.replace(/^data:image\/\w+;base64,/, "");
    const buffer = Buffer.from(base64Data, "base64");
    
    // Ambil limit dari settings, default 2MB (Stricter security for direct API hits)
    const settings = await getPublicPlatformSettings();
    const maxUploadBytes = (settings.maxUploadMb || 2) * 1024 * 1024;

    if (buffer.byteLength > maxUploadBytes) {
      return NextResponse.json({ error: `Ukuran file melebihi batas maksimal ${settings.maxUploadMb || 2}MB.` }, { status: 400 });
    }

    const mediaUrl = await uploadFile(buffer, relativePath, mimeType || "image/jpeg");

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
