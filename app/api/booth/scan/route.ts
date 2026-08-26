import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sseEmitter } from "@/lib/sseEmitter";

export async function POST(req: NextRequest) {
  try {
    const { qrToken, invitationId, isCheckIn } = await req.json();

    if (!qrToken) {
      return NextResponse.json({ error: "QR Token wajib diisi" }, { status: 400 });
    }

    let guest = null;
    
    if (qrToken.startsWith('LUX|')) {
      const parts = qrToken.split('|');
      const targetInvId = parts[1];
      const targetName = parts[2];
      
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
            category: "Umum",
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
    return NextResponse.json({ error: error.message || "Gagal memproses QR Code" }, { status: 500 });
  }
}
