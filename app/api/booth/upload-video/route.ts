import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import fs from "fs";
import path from "path";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const qrToken = formData.get("qrToken") as string;
    const videoFile = formData.get("video") as File | null;

    if (!qrToken || !videoFile) {
      return NextResponse.json({ error: "QR Token dan file video wajib diunggah." }, { status: 400 });
    }

    const guest = await prisma.guest.findUnique({
      where: { qrToken },
    });

    if (!guest) {
      return NextResponse.json({ error: "Tamu tidak ditemukan." }, { status: 404 });
    }

    if (guest.isTokenRedeemed) {
      return NextResponse.json(
        { error: "Token ini sudah pernah digunakan untuk mengirim video ucapan." },
        { status: 400 }
      );
    }

    // Save video file to public/uploads/videos
    const uploadsDir = path.join(process.cwd(), "public", "uploads", "videos");
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const buffer = Buffer.from(await videoFile.arrayBuffer());
    const fileName = `wish_${guest.id}_${Date.now()}.webm`;
    const filePath = path.join(uploadsDir, fileName);
    fs.writeFileSync(filePath, buffer);

    const publicUrl = `/uploads/videos/${fileName}`;

    // Update guest record: single-use token redemption
    const updatedGuest = await prisma.guest.update({
      where: { id: guest.id },
      data: {
        isTokenRedeemed: true,
        videoWishUrl: publicUrl,
        videoRecordedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      message: "Video ucapan berhasil disimpan!",
      videoUrl: publicUrl,
      guest: {
        id: updatedGuest.id,
        name: updatedGuest.name,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Gagal mengunggah video." }, { status: 500 });
  }
}
