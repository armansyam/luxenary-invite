import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const DEFAULT_THEMES = [
  { id: "kalandra", name: "Kalandra", category: "premium", series: "Premium", description: "Modern, Elegan & Minimalis", isPremium: true, sortOrder: 1, isActive: true },
  { id: "valente", name: "Valente", category: "premium", series: "Premium", description: "High-Fashion, Editorial & Mewah", isPremium: true, sortOrder: 2, isActive: true },
  { id: "aurelia", name: "Aurelia", category: "premium", series: "Premium", description: "Romantis, Sinematik & Anggun", isPremium: true, sortOrder: 3, isActive: true },
  { id: "artisan", name: "Artisan", category: "premium", series: "Premium", description: "Artistik, Hangat & Vintage", isPremium: true, sortOrder: 4, isActive: true },
  { id: "prameswari", name: "Prameswari", category: "traditional", series: "Traditional", description: "Sakral, Megah & Royal Keraton", isPremium: false, sortOrder: 5, isActive: true },
  { id: "wave", name: "Wave", category: "modern", series: "Modern", description: "Dark, Moody & Dramatic — Gelombang Elegan", isPremium: false, sortOrder: 6, isActive: true },
  { id: "papercut", name: "Papercut", category: "modern", series: "Modern", description: "Moody Papercut — Kraft Paper Aesthetic & Artistik", isPremium: false, sortOrder: 7, isActive: true },
  { id: "dillalucky", name: "Dilla Lucky", category: "traditional", series: "Traditional", description: "Islami Sakral — Batik Ornament & Penuh Berkah", isPremium: false, sortOrder: 8, isActive: true },
  { id: "ameera", name: "Ameera", category: "modern", series: "Modern", description: "Heritage Modern — Elegan Dark & Nuansa Warisan Budaya", isPremium: false, sortOrder: 9, isActive: true },
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
      publishedInvitationCount,
      draftInvitationCount,
      orderCount,
      guestCount,
      rsvpCount,
      videoWishCount,
      userCount,
      allOrders,
      recentOrders,
      recentUsers,
      recentInvitations,
      webhookLogs,
    ] = await Promise.all([
      prisma.invitation.count(),
      prisma.invitation.count({ where: { status: "PUBLISHED" } }),
      prisma.invitation.count({ where: { status: "DRAFT" } }),
      prisma.order.count(),
      prisma.guest.count(),
      prisma.rsvp.count().catch(() => 0),
      prisma.wish.count().catch(() => 0),
      prisma.user.count({ where: { role: "CLIENT" } }),
      prisma.order.findMany({
        select: { id: true, amount: true, status: true, planType: true, createdAt: true },
      }),
      prisma.order.findMany({
        take: 10,
        orderBy: { createdAt: "desc" },
        include: { user: { select: { name: true, email: true } } },
      }),
      prisma.user.findMany({
        where: { role: "CLIENT" },
        take: 50,
        orderBy: { createdAt: "desc" },
        select: { id: true, name: true, email: true, role: true, createdAt: true },
      }),
      prisma.invitation.findMany({
        take: 50,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          groomSlug: true,
          brideSlug: true,
          invitationSlug: true,
          groomName: true,
          brideName: true,
          groomNickname: true,
          brideNickname: true,
          themeId: true,
          status: true,
          subdomain: true,
          createdAt: true,
          user: {
            select: {
              name: true,
              email: true,
            },
          },
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
        publishedInvitationCount,
        draftInvitationCount,
        orderCount,
        guestCount,
        rsvpCount,
        videoWishCount,
        userCount,
      },
      allOrders,
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
