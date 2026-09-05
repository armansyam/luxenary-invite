import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyPin } from "@/lib/pinEncryption";
import { rateLimit } from "@/lib/rateLimit";
import { generateReceptionistToken } from "@/lib/receptionistAuth";

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for") || "unknown-ip";
    const { invitationId, pin } = await req.json();

    if (!invitationId || !pin) {
      return NextResponse.json({ error: "Data tidak lengkap" }, { status: 400 });
    }

    // Rate limit: max 5 percobaan per invitationId per 15 menit (anti brute-force PIN 4-digit)
    const rateLimitKey = `verify-pin:${ip}:${invitationId}`;
    if (!rateLimit(rateLimitKey, 5, 15 * 60 * 1000)) {
      return NextResponse.json(
        { error: "Terlalu banyak percobaan PIN. Silakan tunggu 15 menit sebelum mencoba kembali." },
        { status: 429 }
      );
    }

    const invitation = await prisma.invitation.findUnique({
      where: { id: invitationId },
      select: {
        staffPin: true,
        order: { select: { planType: true } },
      },
    });

    if (!invitation) {
      return NextResponse.json({ error: "Undangan tidak ditemukan" }, { status: 404 });
    }

    if (invitation.order?.planType === "TRADITIONAL") {
      return NextResponse.json(
        { error: "Fitur Meja Resepsionis & QR Check-in tidak tersedia pada Paket Traditional." },
        { status: 403 }
      );
    }

    if (!invitation.staffPin || !verifyPin(pin, invitation.staffPin)) {
      return NextResponse.json({ error: "PIN tidak valid" }, { status: 401 });
    }

    const sessionToken = generateReceptionistToken(invitationId);

    return NextResponse.json({
      success: true,
      message: "PIN valid",
      token: sessionToken
    });
  } catch (error: any) {
    const msg = process.env.NODE_ENV === "production" ? "Gagal memverifikasi PIN" : (error.message || "Gagal memverifikasi PIN");
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
