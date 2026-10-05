import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { routeError } from "@/lib/routeError";
import { verifyPin } from "@/lib/pinEncryption";
import { getClientIp, rateLimitDb } from "@/lib/rateLimit";
import { generateReceptionistToken } from "@/lib/receptionistAuth";

const PIN_WINDOW_MS = 15 * 60 * 1000;

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    const { invitationId, pin } = await req.json();

    if (typeof invitationId !== "string" || typeof pin !== "string" || !invitationId || !pin) {
      return NextResponse.json({ error: "Data tidak lengkap" }, { status: 400 });
    }

    // Dua lapis anti brute-force yang bersifat lintas-proses (PostgreSQL): per IP+undangan dan
    // batas total per undangan yang tidak bergantung pada IP (header IP dapat dipalsukan).
    const withinIpLimit = await rateLimitDb(`verify-pin:ip:${ip}:${invitationId}`, 5, PIN_WINDOW_MS);
    const withinInvitationLimit = await rateLimitDb(`verify-pin:inv:${invitationId}`, 30, PIN_WINDOW_MS);
    if (!withinIpLimit || !withinInvitationLimit) {
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

    if (invitation.order?.planType === "TIER_1") {
      return NextResponse.json(
        { error: "Fitur Sistem Resepsionis & QR Check-in tidak tersedia pada paket dasar Anda. Silakan upgrade paket untuk mengaktifkan fitur ini." },
        { status: 403 }
      );
    }

    if (!invitation.staffPin || !verifyPin(pin, invitation.staffPin)) {
      return NextResponse.json({ error: "PIN tidak valid" }, { status: 401 });
    }

    const sessionToken = generateReceptionistToken(invitationId, invitation.staffPin);

    return NextResponse.json({
      success: true,
      message: "PIN valid",
      token: sessionToken
    });
  } catch (error) {
    return routeError("ReceptionistVerifyPin", error, "Gagal memverifikasi PIN");
  }
}
