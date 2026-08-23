import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const invitationId = searchParams.get("invitationId");

    if (!invitationId) {
      return NextResponse.json({ error: "invitationId is required" }, { status: 400 });
    }

    const rsvps = await prisma.rsvp.findMany({
      where: { invitationId },
      orderBy: { respondedAt: "desc" },
      take: 50,
      select: {
        id: true,
        guestName: true,
        status: true,
        guestCount: true,
        message: true,
        respondedAt: true,
      },
    });

    return NextResponse.json({ success: true, rsvps });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to fetch RSVPs" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { invitationId, guestName, status, guestCount, message, phone } = body;

    if (!invitationId || !guestName || !status) {
      return NextResponse.json(
        { error: "invitationId, guestName, and status (hadir/tidak) are required" },
        { status: 400 }
      );
    }

    // Find invitation
    const invitation = await prisma.invitation.findUnique({
      where: { id: invitationId },
    });

    if (!invitation) {
      return NextResponse.json({ error: "Invitation not found" }, { status: 404 });
    }

    // Find or create guest record
    let guest = await prisma.guest.findFirst({
      where: {
        invitationId,
        name: { equals: guestName },
      },
    });

    if (!guest) {
      const slug = guestName.toLowerCase().replace(/[^a-z0-9]+/g, "-");
      guest = await prisma.guest.create({
        data: {
          invitationId,
          name: guestName,
          slug: `${slug}-${Date.now().toString(36)}`,
          phone: phone || null,
          category: "UMUM",
          guestQuota: Number(guestCount) || 1,
        },
      });
    }

    // Find existing RSVP or create new
    const existingRsvp = await prisma.rsvp.findFirst({
      where: { invitationId, guestId: guest.id },
    });

    let rsvp;
    if (existingRsvp) {
      rsvp = await prisma.rsvp.update({
        where: { id: existingRsvp.id },
        data: {
          status,
          guestCount: Number(guestCount) || 1,
          message: message || null,
          respondedAt: new Date(),
        },
      });
    } else {
      rsvp = await prisma.rsvp.create({
        data: {
          invitationId,
          guestId: guest.id,
          guestName,
          status,
          guestCount: Number(guestCount) || 1,
          message: message || null,
        },
      });
    }

    return NextResponse.json({
      success: true,
      message: "RSVP berhasil dikirim. Terima kasih atas konfirmasinya!",
      rsvp,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Gagal mengirim RSVP" }, { status: 500 });
  }
}
