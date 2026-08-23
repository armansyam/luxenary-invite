import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const invitationId = searchParams.get("invitationId");

    let whereClause: any = {};
    if (invitationId) {
      whereClause.invitationId = invitationId;
    } else {
      // Find user's invitation
      const user = await prisma.user.findUnique({
        where: { email: session.user.email },
        include: { invitations: { select: { id: true } } },
      });
      if (user?.invitations?.[0]) {
        whereClause.invitationId = user.invitations[0].id;
      }
    }

    const [rsvps, wishes] = await Promise.all([
      prisma.rsvp.findMany({
        where: whereClause,
        orderBy: { respondedAt: "desc" },
        include: { guest: { select: { name: true, category: true, phone: true } } },
      }),
      prisma.wish.findMany({
        where: whereClause,
        orderBy: { createdAt: "desc" },
      }),
    ]);

    const stats = {
      totalResponses: rsvps.length,
      attending: rsvps.filter((r) => r.status.toLowerCase() === "hadir").reduce((sum, r) => sum + (r.guestCount || 1), 0),
      declined: rsvps.filter((r) => r.status.toLowerCase() === "tidak").length,
      uncertain: rsvps.filter((r) => r.status.toLowerCase() === "ragu").length,
      totalWishes: wishes.length + rsvps.filter((r) => r.message).length,
    };

    return NextResponse.json({
      success: true,
      stats,
      rsvps,
      wishes,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Gagal memuat data RSVP" }, { status: 500 });
  }
}
