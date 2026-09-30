import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const isAdmin =
      (session.user as any).isAdmin === true ||
      (session.user as any).role === "SUPER_ADMIN" ||
      (session.user as any).role === "ADMIN";

    const requestedInvitationId = new URL(req.url).searchParams.get("invitationId");

    let invitationId: string;
    if (requestedInvitationId) {
      const invitation = await prisma.invitation.findUnique({
        where: { id: requestedInvitationId },
        select: { userId: true },
      });
      if (!invitation) {
        return NextResponse.json({ error: "Undangan tidak ditemukan" }, { status: 404 });
      }
      if (invitation.userId !== userId && !isAdmin) {
        return NextResponse.json({ error: "Forbidden: bukan pemilik undangan ini" }, { status: 403 });
      }
      invitationId = requestedInvitationId;
    } else {
      const ownInvitation = await prisma.invitation.findFirst({
        where: { userId },
        orderBy: { createdAt: "asc" },
        select: { id: true },
      });
      if (!ownInvitation) {
        return NextResponse.json({
          success: true,
          stats: { totalResponses: 0, attending: 0, declined: 0, uncertain: 0, totalWishes: 0 },
          rsvps: [],
          wishes: [],
        });
      }
      invitationId = ownInvitation.id;
    }

    const rsvps = await prisma.rsvp.findMany({
      where: { invitationId },
      orderBy: { respondedAt: "desc" },
      include: { guest: { select: { name: true, category: true, phone: true } } },
    });

    const stats = {
      totalResponses: rsvps.length,
      attending: rsvps.filter((r) => r.status.toLowerCase() === "hadir").reduce((sum, r) => sum + (r.guestCount || 1), 0),
      declined: rsvps.filter((r) => r.status.toLowerCase() === "tidak").length,
      uncertain: rsvps.filter((r) => r.status.toLowerCase() === "ragu").length,
      totalWishes: rsvps.filter((r) => r.message && r.message.trim().length > 0).length,
    };

    return NextResponse.json({
      success: true,
      stats,
      rsvps,
      wishes: [],
    });
  } catch (error: any) {
    return NextResponse.json({ error: process.env.NODE_ENV === "production" ? "Gagal memuat data RSVP" : (error.message || "Gagal memuat data RSVP") }, { status: 500 });
  }
}
