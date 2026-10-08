import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { routeError } from "@/lib/routeError";
import { rateLimitDb, getClientIp } from "@/lib/rateLimit";
import { isReceptionistAuthorized } from "@/lib/receptionistGuard";
import { parseCheckinPayload } from "@/lib/checkinQr";
import { findOrCreateWalkInGuest, guestWithInvitation } from "@/lib/walkInGuest";

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    // Rate limit: max 30 scan per menit per IP (anti brute-force via scan endpoint, cross-process PM2 safe)
    if (!(await rateLimitDb(`scan:${ip}`, 30, 60 * 1000))) {
      return NextResponse.json({ error: "Terlalu banyak permintaan. Silakan tunggu sebentar." }, { status: 429 });
    }

    const { qrToken, invitationId, isCheckIn, token } = await req.json();

    if (!qrToken || !invitationId || !token) {
      return NextResponse.json({ error: "Data tidak lengkap" }, { status: 400 });
    }

    // Server-side authorization check using session token
    if (!(await isReceptionistAuthorized(invitationId, token))) {
      return NextResponse.json({ error: "Akses Ditolak. Sesi tidak valid." }, { status: 401 });
    }


    let guest = null;

    const payload = parseCheckinPayload(String(qrToken));
    if (payload) {
      // Id undangan di dalam QR mencegah QR acara lain dianggap sah di acara ini.
      if (payload.invitationId !== invitationId) {
        return NextResponse.json({ error: "QR Code ini bukan milik acara ini." }, { status: 400 });
      }
      if (!payload.name) {
        return NextResponse.json({ error: "QR Code tidak memuat nama tamu." }, { status: 400 });
      }
      guest = await findOrCreateWalkInGuest(invitationId, payload.name);
    } else {
      // Legacy UUID fallback
      guest = await prisma.guest.findUnique({
        where: { qrToken },
        include: guestWithInvitation,
      });
    }

    if (!guest) {
      return NextResponse.json({ error: "QR Code tidak valid atau tamu tidak terdaftar." }, { status: 404 });
    }

    if (invitationId && guest.invitationId !== invitationId) {
      return NextResponse.json({ error: "QR Code ini bukan milik acara ini." }, { status: 400 });
    }

    if (guest.isTokenRedeemed && !isCheckIn) {
      return NextResponse.json({
        error: "QR Code ini sudah pernah digunakan.",
        guest: {
          id: guest.id,
          name: guest.name,
          category: guest.category,
          sessionInfo: guest.sessionInfo,
        },
        alreadyRedeemed: true,
      }, { status: 400 });
    }

    if (isCheckIn) {
      // Atomic Conditional Update: hanya update jika isTokenRedeemed masih false (Anti-Race Condition Multi-Scanner)
      const updateResult = await prisma.guest.updateMany({
        where: { id: guest.id, isTokenRedeemed: false },
        data: { isTokenRedeemed: true },
      });

      const isFirstCheckIn = updateResult.count === 1;
      const wasAlreadyRedeemed = !isFirstCheckIn;

      return NextResponse.json({
        success: true,
        alreadyRedeemed: wasAlreadyRedeemed,
        message: wasAlreadyRedeemed ? "Tamu sudah pernah check-in sebelumnya (Sinkronisasi Idempoten)." : "Check-in berhasil disimpan ke server!",
        guest: {
          id: guest.id,
          name: guest.name,
          category: guest.category,
          sessionInfo: guest.sessionInfo,
          invitation: guest.invitation,
        },
      });
    }

    return NextResponse.json({
      success: true,
      message: isCheckIn ? "Check-in berhasil disimpan ke server!" : "QR Code valid. Siap mengambil foto momen!",
      guest: {
        id: guest.id,
        name: guest.name,
        category: guest.category,
        sessionInfo: guest.sessionInfo,
        invitation: guest.invitation,
      },
    });
  } catch (error) {
    return routeError("ReceptionistScan", error, "Gagal memproses QR Code");
  }
}

