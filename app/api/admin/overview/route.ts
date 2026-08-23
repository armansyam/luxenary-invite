import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const DEFAULT_THEMES = [
  { id: "kalandra", name: "Kalandra", category: "modern", series: "Modern", description: "Modern, Elegan & Minimalis", isPremium: true, sortOrder: 1, isActive: true },
  { id: "valente", name: "Valente", category: "modern", series: "Modern", description: "High-Fashion, Editorial & Mewah", isPremium: true, sortOrder: 2, isActive: true },
  { id: "aurelia", name: "Aurelia", category: "modern", series: "Modern", description: "Romantis, Sinematik & Anggun", isPremium: true, sortOrder: 3, isActive: true },
  { id: "artisan", name: "Artisan", category: "modern", series: "Modern", description: "Artistik, Hangat & Vintage", isPremium: true, sortOrder: 4, isActive: true },
  { id: "prameswari", name: "Prameswari", category: "traditional", series: "Traditional", description: "Sakral, Megah & Royal Keraton", isPremium: false, sortOrder: 5, isActive: true },
];

export async function GET() {
  try {
    // Check if themes need initial seeding
    let themes = await prisma.theme.findMany({ orderBy: { sortOrder: "asc" } });
    if (themes.length === 0 || themes.some((t) => ["kila", "aruna", "ivanna", "danila", "papercut"].includes(t.id))) {
      // Re-seed with new clean themes
      for (const t of DEFAULT_THEMES) {
        await prisma.theme.upsert({
          where: { id: t.id },
          create: t,
          update: t,
        });
      }
      // Clean up old theme IDs from database
      await prisma.theme.deleteMany({
        where: { id: { in: ["kila", "aruna", "ivanna", "danila", "papercut"] } },
      });
      themes = await prisma.theme.findMany({ orderBy: { sortOrder: "asc" } });
    }

    const [
      invitationCount,
      orderCount,
      guestCount,
      userCount,
      recentOrders,
      recentUsers,
      recentInvitations,
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
