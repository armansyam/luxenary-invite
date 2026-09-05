import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getPublicPlatformSettings } from "@/lib/settings";
import crypto from "crypto";
import { uploadFile } from "@/lib/storage";
import { rateLimit } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

/**
 * Validasi MIME type berdasarkan magic bytes (4 byte pertama file buffer)
 * Tidak mempercayai mimeType yang dikirim client — ini sumber kebenaran.
 */
function detectMimeFromMagicBytes(buffer: Buffer): { mimeType: string; ext: string } | null {
  if (buffer.length < 4) return null;

  const hex = buffer.toString("hex", 0, 12).toUpperCase();

  // JPEG: FF D8 FF
  if (hex.startsWith("FFD8FF")) return { mimeType: "image/jpeg", ext: ".jpg" };

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (hex.startsWith("89504E47")) return { mimeType: "image/png", ext: ".png" };

  // WebP: RIFF????WEBP (bytes 0-3 = 52494646, bytes 8-11 = 57454250)
  if (hex.startsWith("52494646") && hex.substring(16, 24) === "57454250") {
    return { mimeType: "image/webp", ext: ".webp" };
  }

  // GIF: GIF87a atau GIF89a
  if (hex.startsWith("474946383")) return { mimeType: "image/gif", ext: ".gif" };

  // Tipe lain tidak diizinkan
  return null;
}


export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for") || "unknown-ip";
    // Limit: 15 request per menit (60000ms) untuk mengakomodasi jaringan WiFi yang sama
    if (!rateLimit(ip, 15, 60000)) {
      return NextResponse.json({ error: "Terlalu banyak permintaan unggahan. Silakan coba lagi sebentar." }, { status: 429 });
    }

    let invitationId = "";
    let senderName = "Guest";
    let senderEmail = "guest@system";
    let caption = "";
    let buffer: Buffer | null = null;

    const contentType = req.headers.get("content-type") || "";

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      invitationId = (formData.get("invitationId") as string) || "";
      senderName = (formData.get("senderName") as string) || "Guest";
      senderEmail = (formData.get("senderEmail") as string) || "guest@system";
      caption = ((formData.get("message") || formData.get("caption") || "") as string);

      const file = formData.get("file") as File | null;
      if (file) {
        const arrayBuffer = await file.arrayBuffer();
        buffer = Buffer.from(arrayBuffer);
      }
    } else {
      const data = await req.json();
      invitationId = data.invitationId || "";
      senderName = data.senderName || "Guest";
      senderEmail = data.senderEmail || "guest@system";
      caption = data.caption || data.message || "";
      if (data.base64File) {
        const base64Data = data.base64File.replace(/^data:[^;]+;base64,/, "");
        buffer = Buffer.from(base64Data, "base64");
      }
    }

    if (!invitationId || !buffer || buffer.length === 0) {
      return NextResponse.json({ error: "Data tidak lengkap atau foto belum dipilih." }, { status: 400 });
    }

    const invitation = await prisma.invitation.findUnique({
      where: { id: invitationId },
      select: {
        memoriesUploadLocked: true,
        invitationSlug: true,
        order: { select: { planType: true } },
      },
    });

    if (!invitation) {
      return NextResponse.json({ error: "Undangan tidak ditemukan." }, { status: 404 });
    }

    if (invitation.order?.planType !== "PREMIUM") {
      return NextResponse.json(
        { error: "Fitur unggah momen kenangan tamu eksklusif untuk Paket Premium." },
        { status: 403 }
      );
    }

    // Cek apakah upload sudah dikunci oleh klien (setelah download ZIP)
    if (invitation.memoriesUploadLocked) {
      const galleryUrl = `/${invitation.invitationSlug}/memories`;
      return NextResponse.json(
        { locked: true, galleryUrl, message: "Upload momen telah ditutup oleh penyelenggara." },
        { status: 423 } // 423 Locked — HTTP status yang tepat untuk resource terkunci
      );
    }


    // ── VALIDASI MAGIC BYTES (server-side MIME detection) ──
    // Tidak mempercayai mimeType dari client — periksa konten aktual file
    const detected = detectMimeFromMagicBytes(buffer);
    if (!detected) {
      return NextResponse.json(
        { error: "Format file tidak didukung. Hanya gambar (JPEG, PNG, WebP, GIF) yang diperbolehkan." },
        { status: 400 }
      );
    }

    // Ambil limit dari AdminSetting (max_upload_mb). Fallback 5MB sesuai default seed admin.
    // Perubahan limit cukup dari Admin Dashboard — tanpa edit kode.
    const settings = await getPublicPlatformSettings();
    const effectiveMaxMb = settings.maxUploadMb > 0 ? settings.maxUploadMb : 5;
    const maxUploadBytes = effectiveMaxMb * 1024 * 1024;

    if (buffer.byteLength > maxUploadBytes) {
      return NextResponse.json({ error: `Ukuran file melebihi batas maksimal ${effectiveMaxMb}MB.` }, { status: 400 });
    }

    // Gunakan extension dari magic bytes (bukan dari client)
    const safeBaseName = `momen_${Date.now()}`;
    const finalFileName = `${crypto.randomBytes(4).toString("hex")}_${safeBaseName}${detected.ext}`;
    // Pemisahan folder agar Cloudflare R2 bisa melakukan Auto-Delete 60 hari khusus untuk folder tamu ini
    const relativePath = `guest-memories/${invitationId}/${finalFileName}`;

    const mediaUrl = await uploadFile(buffer, relativePath, detected.mimeType);


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
    const msg = process.env.NODE_ENV === "production" ? "Terjadi kesalahan server saat upload" : (error.message || "Terjadi kesalahan server saat upload");
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
