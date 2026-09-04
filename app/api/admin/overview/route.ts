import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await auth();
    const isAdmin = (session?.user as any)?.isAdmin === true || (session?.user as any)?.role === "SUPER_ADMIN" || (session?.user as any)?.role === "ADMIN";
    
    if (!session?.user || !isAdmin) {
      return NextResponse.json({ error: "Unauthorized. Khusus Administrator." }, { status: 401 });
    }

    // --- AUTO EXPIRE SWEEP (ADMIN SIDE) ---
    // Pastikan admin selalu melihat data mutakhir (expired QRIS & order usang)
    const pendingOrders = await prisma.order.findMany({
      where: { status: "PENDING" },
      select: { id: true, snapToken: true, paymentMethod: true, expiredAt: true }
    });
    
    const now = Date.now();
    const expiredIds: string[] = [];
    
    for (const ord of pendingOrders) {
      let isExpired = false;
      
      // 1. Cek expiry dari QRIS snapToken (jika ada)
      if (ord.paymentMethod === "GATEWAY" && typeof ord.snapToken === "string" && ord.snapToken.startsWith("{")) {
        try {
          const tokenData = JSON.parse(ord.snapToken);
          if (tokenData && tokenData.expiry && now > tokenData.expiry + 120000) {
            isExpired = true;
          }
        } catch (e) {}
      }
      
      // 2. Cek expiry database (fallback jika snapToken null atau manual transfer ditinggalkan lama > 24h)
      if (!isExpired && ord.expiredAt && ord.expiredAt.getTime() < now) {
        isExpired = true;
      }
      
      if (isExpired) {
        expiredIds.push(ord.id);
      }
    }

    if (expiredIds.length > 0) {
      await prisma.order.updateMany({
        where: { id: { in: expiredIds } },
        data: { status: "EXPIRED" }
      });
    }
    // ----------------------------------------

    // Load available themes from database
    const themes = await prisma.theme.findMany({
      orderBy: { sortOrder: "asc" },
    });

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
      customDomainOrders,
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
        where: {
          status: {
            notIn: ["EXPIRED", "FAILED"],
          },
        },
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
            select: { id: true, subdomain: true, status: true, expiresAt: true, eventData: true },
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
      prisma.order.findMany({
        where: { orderType: "CUSTOM_DOMAIN_ADDON" },
        orderBy: { createdAt: "desc" },
        include: {
          user: { select: { name: true, email: true } },
          invitation: { select: { subdomain: true, customDomain: true } }
        }
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
      customDomainOrders,
    });
  } catch (error: any) {
    return NextResponse.json({ error: process.env.NODE_ENV === "production" ? "Failed to load admin overview" : (error.message || "Failed to load admin overview") }, { status: 500 });
  }
}
