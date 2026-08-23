import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const [
      invitationCount,
      orderCount,
      guestCount,
      userCount,
      recentOrders,
      recentUsers,
      recentInvitations,
      themes,
      webhookLogs,
    ] = await Promise.all([
      prisma.invitation.count(),
      prisma.order.count(),
      prisma.guest.count(),
      prisma.user.count(),
      prisma.order.findMany({
        take: 10,
        orderBy: { createdAt: "desc" },
        include: { user: { select: { name: true, email: true } } },
      }),
      prisma.user.findMany({
        take: 10,
        orderBy: { createdAt: "desc" },
        select: { id: true, name: true, email: true, role: true, createdAt: true },
      }),
      prisma.invitation.findMany({
        take: 10,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          groomSlug: true,
          brideSlug: true,
          invitationSlug: true,
          groomName: true,
          brideName: true,
          themeId: true,
          status: true,
          createdAt: true,
        },
      }),
      prisma.theme.findMany({
        orderBy: { sortOrder: "asc" },
      }),
      prisma.webhookLog.findMany({
        take: 10,
        orderBy: { createdAt: "desc" },
      }),
    ]);

    return NextResponse.json({
      success: true,
      stats: {
        invitationCount,
        orderCount,
        guestCount,
        userCount,
      },
      orders: recentOrders,
      users: recentUsers,
      invitations: recentInvitations,
      themes,
      logs: webhookLogs,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to load admin overview" }, { status: 500 });
  }
}
