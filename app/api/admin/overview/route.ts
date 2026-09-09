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
    const dbThemes = await prisma.theme.findMany({
      orderBy: { sortOrder: "asc" },
    });

    const themeSettingKeys = dbThemes.map((t) => `theme_demo_${t.id.toLowerCase()}`);
    const themeSettings = await prisma.adminSetting.findMany({
      where: { key: { in: themeSettingKeys } },
      select: { key: true, value: true, updatedAt: true },
    });

    const themeCustomDataMap: Record<string, { data: any; updatedAt: number }> = {};
    for (const s of themeSettings) {
      const themeId = s.key.replace("theme_demo_", "");
      try {
        themeCustomDataMap[themeId] = {
          data: JSON.parse(s.value),
          updatedAt: s.updatedAt ? new Date(s.updatedAt).getTime() : 1,
        };
      } catch {}
    }

    const themes = dbThemes.map((t) => {
      const themeKey = t.id.toLowerCase();
      const customEntry = themeCustomDataMap[themeKey];
      const customData = customEntry?.data;
      const v = customEntry?.updatedAt || 1;

      const demoThemeDir = path.join(process.cwd(), "public", "demo", themeKey);
      const hasMobileThumb = fs.existsSync(path.join(demoThemeDir, "thumbnail_mobile.webp"));
      const defaultCoverFallback = t.thumbnail || `/demo/${themeKey}/cover.webp`;

      const rawThumbMobile = customData?.thumbnailMobileUrl || (hasMobileThumb ? `/demo/${themeKey}/thumbnail_mobile.webp` : defaultCoverFallback);
      const thumbMobile = rawThumbMobile.includes("?") ? `${rawThumbMobile}&v=${v}` : `${rawThumbMobile}?v=${v}`;

      return {
        ...t,
        thumbnailMobile: thumbMobile,
      };
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
        include: { user: { select: { name: true, email: true, phoneNumber: true } } },
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
          userId: true,
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
          eventData: true,
          galleryExpiresAt: true,
          adminUnlockedUntil: true,
          isLockedPermanently: true,
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
          user: { select: { name: true, email: true, phoneNumber: true } },
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
