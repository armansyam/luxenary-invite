import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const { qrToken, invitationId } = await req.json();

    if (!qrToken) {
      return NextResponse.json({ error: "QR Token wajib diisi" }, { status: 400 });
    }

    const guest = await prisma.guest.findUnique({
      where: { qrToken },
      include: {
        invitation: {
          select: {
            id: true,
            groomName: true,
            brideName: true,
          },
        },
      },
    });

    if (!guest) {
      return NextResponse.json({ error: "QR Code tidak valid atau tamu tidak terdaftar." }, { status: 404 });
    }

    if (invitationId && guest.invitationId !== invitationId) {
      return NextResponse.json({ error: "QR Code ini bukan untuk acara pernikahan ini." }, { status: 400 });
    }

    if (guest.isTokenRedeemed) {
      return NextResponse.json({
        error: "QR Code ini sudah pernah digunakan untuk merekam video ucapan. (Single-Use Token)",
        guest: {
          name: guest.name,
          category: guest.category,
          videoWishUrl: guest.videoWishUrl,
          videoRecordedAt: guest.videoRecordedAt,
        },
        alreadyRedeemed: true,
      }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: "QR Code valid. Siap merekam video ucapan!",
      guest: {
        id: guest.id,
        name: guest.name,
        category: guest.category,
        sessionInfo: guest.sessionInfo,
        invitation: guest.invitation,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Gagal memproses QR Code" }, { status: 500 });
  }
}
