import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { routeError } from "@/lib/routeError";
import { verifyPin } from "@/lib/pinEncryption";
import { getClientIp, isRateLimitExhausted, rateLimitDb } from "@/lib/rateLimit";
import { generateReceptionistToken } from "@/lib/receptionistAuth";
import { hasPlanCapability } from "@/lib/settings";

const PIN_WINDOW_MS = 15 * 60 * 1000;
const PIN_FAILURES_PER_INVITATION = 30;

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    const { invitationId, pin } = await req.json();

    if (typeof invitationId !== "string" || typeof pin !== "string" || !invitationId || !pin) {
      return NextResponse.json({ error: "Data tidak lengkap" }, { status: 400 });
    }

    // Dua lapis anti brute-force yang bersifat lintas-proses (PostgreSQL): per IP+undangan dan
    // batas total per undangan yang tidak bergantung pada IP (header IP dapat dipalsukan). Batas total hanya menghitung
    // PIN yang salah: login sah petugas tidak menghabiskan jatahnya.
    const invitationFailureKey = `verify-pin:inv:${invitationId}`;
    const withinIpLimit = await rateLimitDb(`verify-pin:ip:${ip}:${invitationId}`, 5, PIN_WINDOW_MS);
    const invitationLocked = await isRateLimitExhausted(invitationFailureKey, PIN_FAILURES_PER_INVITATION);
    if (!withinIpLimit || invitationLocked) {
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

    if (!(await hasPlanCapability(invitation.order?.planType, "qr_checkin"))) {
      return NextResponse.json(
        { error: "Fitur Sistem Resepsionis & QR Check-in tidak tersedia pada paket dasar Anda. Silakan upgrade paket untuk mengaktifkan fitur ini." },
        { status: 403 }
      );
    }

    if (!invitation.staffPin || !verifyPin(pin, invitation.staffPin)) {
      await rateLimitDb(invitationFailureKey, PIN_FAILURES_PER_INVITATION, PIN_WINDOW_MS);
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
