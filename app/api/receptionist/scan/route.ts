import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sseEmitter } from "@/lib/sseEmitter";
import { verifyPin } from "@/lib/pinEncryption";
import { rateLimit } from "@/lib/rateLimit";
import { verifyReceptionistToken } from "@/lib/receptionistAuth";

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for") || "unknown-ip";
    // Rate limit: max 30 scan per menit per IP (anti brute-force via scan endpoint)
    if (!rateLimit(`scan:${ip}`, 30, 60 * 1000)) {
      return NextResponse.json({ error: "Terlalu banyak permintaan. Silakan tunggu sebentar." }, { status: 429 });
    }

    const { qrToken, invitationId, isCheckIn, token } = await req.json();

    if (!qrToken || !invitationId || !token) {
      return NextResponse.json({ error: "Data tidak lengkap" }, { status: 400 });
    }

    // Server-side authorization check using session token
    if (!verifyReceptionistToken(token, invitationId)) {
      return NextResponse.json({ error: "Akses Ditolak. Sesi tidak valid." }, { status: 401 });
    }


    let guest = null;
    
    if (qrToken.startsWith('LUX|')) {
      const parts = qrToken.split('|');
      const targetInvId = parts[1];
      const targetName = parts[2];
      const targetCategory = parts[3] || "Umum";
      
      if (invitationId && targetInvId !== invitationId) {
        return NextResponse.json({ error: "QR Code ini bukan untuk acara pernikahan ini." }, { status: 400 });
      }
      
      guest = await prisma.guest.findFirst({
        where: {
          invitationId: targetInvId,
          name: targetName
        },
        include: {
          invitation: {
            select: { id: true, groomName: true, brideName: true }
          }
        }
      });
      
      // Auto-register On-The-Spot Guest
      if (!guest) {
        guest = await prisma.guest.create({
          data: {
            invitationId: targetInvId,
            name: targetName,
            slug: targetName.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
            category: targetCategory,
            isTokenRedeemed: false,
            qrToken: `OTS-${targetInvId}-${Date.now()}`
          },
          include: {
            invitation: {
              select: { id: true, groomName: true, brideName: true }
            }
          }
        });
      }
    } else {
      // Legacy UUID fallback
      guest = await prisma.guest.findUnique({
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
    }

    if (!guest) {
      return NextResponse.json({ error: "QR Code tidak valid atau tamu tidak terdaftar." }, { status: 404 });
    }

    if (invitationId && guest.invitationId !== invitationId) {
      return NextResponse.json({ error: "QR Code ini bukan untuk acara pernikahan ini." }, { status: 400 });
    }

    if (guest.isTokenRedeemed && !isCheckIn) {
      return NextResponse.json({
        error: "QR Code ini sudah pernah digunakan.",
        guest: {
          name: guest.name,
          category: guest.category,
        },
        alreadyRedeemed: true,
      }, { status: 400 });
    }

    if (isCheckIn) {
      // Mark as redeemed in database
      await prisma.guest.update({
        where: { id: guest.id },
        data: { isTokenRedeemed: true },
      });

      // Emit Server-Sent Event for real-time dashboard updates
      sseEmitter.emit("new_guest_checkin", {
        invitationId: guest.invitationId,
        guestId: guest.id,
        guestName: guest.name,
        timestamp: new Date().toISOString()
      });
    }

    return NextResponse.json({
      success: true,
      message: isCheckIn ? "Check-in berhasil disimpan ke server!" : "QR Code valid. Siap merekam video ucapan!",
      guest: {
        id: guest.id,
        name: guest.name,
        category: guest.category,
        sessionInfo: guest.sessionInfo,
        invitation: guest.invitation,
      },
    });
  } catch (error: any) {
    const msg = process.env.NODE_ENV === "production" ? "Gagal memproses QR Code" : (error.message || "Gagal memproses QR Code");
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

