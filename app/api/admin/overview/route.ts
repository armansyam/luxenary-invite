import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const isAdmin =
      (session.user as any).role === "SUPER_ADMIN" ||
      (session.user as any).role === "ADMIN" ||
      (session.user as any).isAdmin === true;

    if (!isAdmin) {
      return NextResponse.json({ error: "Forbidden. Admin only." }, { status: 403 });
    }

    // Load available themes
    const themesDir = path.join(process.cwd(), "themes");
    let themes: any[] = [];
    if (fs.existsSync(themesDir)) {
      const walk = (dir: string): string[] => {
        let results: string[] = [];
        const list = fs.readdirSync(dir);
        list.forEach((file) => {
          const fullPath = path.join(dir, file);
          const stat = fs.statSync(fullPath);
          if (stat && stat.isDirectory()) {
            results = results.concat(walk(fullPath));
          } else if (file.endsWith(".html")) {
            results.push(fullPath);
          }
        });
        return results;
      };

      const files = walk(themesDir);
      themes = files.map((filePath) => {
        const id = path.basename(filePath, ".html");
        const category = path.basename(path.dirname(filePath));
        return {
          id,
          name: id.charAt(0).toUpperCase() + id.slice(1),
          category: category.toUpperCase(),
          filePath,
        };
      });
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
      // Hanya hitung klien yang SUDAH LUNAS (PAID) atau memiliki undangan
      prisma.user.count({
        where: {
          role: "CLIENT",
          OR: [
            { orders: { some: { status: "PAID" } } },
            { invitations: { some: {} } },
          ],
        },
      }),
      prisma.order.findMany({
        select: { id: true, amount: true, status: true, planType: true, createdAt: true },
      }),
      prisma.order.findMany({
        take: 50,
        orderBy: { createdAt: "desc" },
        include: { user: { select: { name: true, email: true } } },
      }),
      // Daftar Klien Resmi: Hanya user yang SUDAH LUNAS atau SUDAH MEMILIKI UNDANGAN
      prisma.user.findMany({
        where: {
          role: "CLIENT",
          OR: [
            { orders: { some: { status: "PAID" } } },
            { invitations: { some: {} } },
          ],
        },
        take: 50,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          createdAt: true,
          orders: {
            where: { status: "PAID" },
            select: { planType: true, amount: true, paidAt: true },
            take: 1,
          },
          invitations: {
            select: { id: true, subdomain: true, status: true },
            take: 1,
          },
        },
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
