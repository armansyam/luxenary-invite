import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

// Throttle: auto-expire sweep hanya berjalan maks 1x per 5 menit
// (in-memory, reset saat server restart — aman dan tidak perlu DB tambahan)
let lastExpireSweepAt = 0;
const EXPIRE_SWEEP_INTERVAL_MS = 5 * 60 * 1000; // 5 menit

export async function GET() {
  try {
    const session = await auth();
    const isAdmin = (session?.user as any)?.isAdmin === true || (session?.user as any)?.role === "SUPER_ADMIN" || (session?.user as any)?.role === "ADMIN";
    
    if (!session?.user || !isAdmin) {
      return NextResponse.json({ error: "Unauthorized. Khusus Administrator." }, { status: 401 });
    }

    // --- AUTO EXPIRE SWEEP (ADMIN SIDE) — Throttle 5 menit ---
    // Sweep hanya dijalankan jika sudah > 5 menit dari sweep terakhir
    // Mencegah query berat berjalan di setiap refresh admin
    const now = Date.now();
    if (now - lastExpireSweepAt > EXPIRE_SWEEP_INTERVAL_MS) {
      lastExpireSweepAt = now; // Update timestamp SEBELUM await agar tidak ada double-sweep concurrent
      try {
        const pendingOrders = await prisma.order.findMany({
          where: { status: "PENDING" },
          select: { id: true, snapToken: true, paymentMethod: true, expiredAt: true }
        });

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
            } catch {}
          }

          // 2. Cek expiry database (fallback: manual transfer ditinggalkan > batas waktu)
          if (!isExpired && ord.expiredAt && ord.expiredAt.getTime() < now) {
            isExpired = true;
          }

          if (isExpired) expiredIds.push(ord.id);
        }

        if (expiredIds.length > 0) {
          await prisma.order.updateMany({
            where: { id: { in: expiredIds } },
            data: { status: "EXPIRED" }
          });
          console.info(`[Expire Sweep] ${expiredIds.length} order ditandai EXPIRED.`);
        }
      } catch (sweepErr) {
        // Sweep failure tidak boleh gagalkan seluruh overview response
        console.error("[Expire Sweep Error]:", sweepErr);
        lastExpireSweepAt = 0; // Reset agar sweep bisa dicoba lagi di request berikutnya
      }
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
      const hasDesktopThumb = fs.existsSync(path.join(demoThemeDir, "thumbnail_desktop.webp"));
      const hasCoverDesktop = fs.existsSync(path.join(demoThemeDir, "cover_desktop.webp"));
      const defaultCoverFallback = t.thumbnail || `/demo/${themeKey}/cover.webp`;
      const desktopFallback = customData?.landingCoverDesktopUrl || (hasCoverDesktop ? `/demo/${themeKey}/cover_desktop.webp` : defaultCoverFallback);

      const rawThumbMobile = customData?.thumbnailMobileUrl || (hasMobileThumb ? `/demo/${themeKey}/thumbnail_mobile.webp` : defaultCoverFallback);
      const rawThumbDesktop = customData?.thumbnailDesktopUrl || (hasDesktopThumb ? `/demo/${themeKey}/thumbnail_desktop.webp` : desktopFallback);

      return {
        ...t,
        thumbnailMobile: rawThumbMobile,
        thumbnailDesktop: rawThumbDesktop,
      };
    });

    // Boundary waktu untuk filter event & registrasi
    const nowTs = new Date();
    const todayStart = new Date(nowTs); todayStart.setHours(0, 0, 0, 0);
    const todayEnd   = new Date(nowTs); todayEnd.setHours(23, 59, 59, 999);
    const weekStart  = new Date(nowTs); weekStart.setDate(nowTs.getDate() - nowTs.getDay()); weekStart.setHours(0, 0, 0, 0);
    const weekEnd    = new Date(weekStart); weekEnd.setDate(weekStart.getDate() + 6); weekEnd.setHours(23, 59, 59, 999);
    const monthStart = new Date(nowTs.getFullYear(), nowTs.getMonth(), 1, 0, 0, 0, 0);
    const monthEnd   = new Date(nowTs.getFullYear(), nowTs.getMonth() + 1, 0, 23, 59, 59, 999);

    const [
      invitationCount,
      publishedInvitationCount,
      draftInvitationCount,
      eventFinishedCount,
      archivedCount,
      orderCount,
      paidOrderCount,
      pendingOrderCount,
      guestCount,
      rsvpCount,
      videoWishCount,
      userCount,
      paidUserCount,
      newRegistrationsToday,
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
      prisma.invitation.count({ where: { status: "EVENT_FINISHED" } }),
      prisma.invitation.count({ where: { status: "ARCHIVED" } }),
      prisma.order.count(),
      // Order LUNAS
      prisma.order.count({ where: { status: "PAID" } }),
      // Order MENUNGGU BAYAR (aktif, belum expired)
      prisma.order.count({ where: { status: "PENDING" } }),
      prisma.guest.count(),
      prisma.rsvp.count().catch(() => 0),
      prisma.guest.count({ where: { videoWishUrl: { not: null } } }).catch(() => 0),
      // Klien aktif: sudah PAID atau sudah punya undangan
      prisma.user.count({
        where: {
          role: "CLIENT",
          OR: [
            { orders: { some: { status: "PAID" } } },
            { invitations: { some: {} } },
          ],
        },
      }),
      // Klien yang sudah PAID (konversi terverifikasi)
      prisma.user.count({
        where: {
          role: "CLIENT",
          orders: { some: { status: "PAID" } },
        },
      }),
      // Registrasi baru hari ini (semua role CLIENT, kapanpun)
      prisma.user.count({
        where: {
          role: "CLIENT",
          createdAt: { gte: todayStart, lte: todayEnd },
        },
      }),
      prisma.order.findMany({
        where: { status: { notIn: ["EXPIRED", "FAILED"] } },
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
        where: { requestedDomain: { not: null } },
        orderBy: { createdAt: "desc" },
        include: {
          user: { select: { name: true, email: true, phoneNumber: true } },
          invitation: { select: { subdomain: true, customDomain: true } }
        }
      }),
    ]);

    // --- Hitung hari-H dari eventData JSON (in-memory: data sudah di-fetch) ---
    // eventData adalah JSON array berisi { date: "YYYY-MM-DD", ... }
    const parseEventDates = (eventData: any): Date[] => {
      try {
        const events = typeof eventData === "string" ? JSON.parse(eventData) : (eventData || []);
        if (!Array.isArray(events)) return [];
        return events
          .filter((e: any) => e?.date)
          .map((e: any) => { const d = new Date(e.date); d.setHours(12, 0, 0, 0); return d; })
          .filter((d: Date) => !isNaN(d.getTime()));
      } catch { return []; }
    };

    let eventTodayCount = 0;
    let eventThisWeekCount = 0;
    let eventThisMonthCount = 0;

    for (const inv of recentInvitations) {
      const dates = parseEventDates(inv.eventData);
      for (const d of dates) {
        if (d >= todayStart && d <= todayEnd) eventTodayCount++;
        if (d >= weekStart && d <= weekEnd) eventThisWeekCount++;
        if (d >= monthStart && d <= monthEnd) eventThisMonthCount++;
      }
    }

    // Konversi rate (PAID / total ORDER non-expired non-failed × 100)
    const conversionRate = orderCount > 0
      ? Math.round((paidOrderCount / orderCount) * 100)
      : 0;

    return NextResponse.json({
      success: true,
      stats: {
        invitationCount,
        publishedInvitationCount,
        draftInvitationCount,
        eventFinishedCount,
        archivedCount,
        orderCount,
        paidOrderCount,
        pendingOrderCount,
        guestCount,
        rsvpCount,
        videoWishCount,
        userCount,
        paidUserCount,
        newRegistrationsToday,
        eventTodayCount,
        eventThisWeekCount,
        eventThisMonthCount,
        conversionRate,
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
    console.error("[Admin Overview Server Error]:", error);
    return NextResponse.json({ error: process.env.NODE_ENV === "production" ? "Failed to load admin overview" : (error.message || "Failed to load admin overview") }, { status: 500 });
  }
}
