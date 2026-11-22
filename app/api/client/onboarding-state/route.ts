import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { routeError } from "@/lib/routeError";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userEmail = session.user.email?.toLowerCase().trim();
    const currentUserId = session.user.id;

    // Resolve user dari database berdasarkan ID atau email akun
    const dbUser = await prisma.user.findFirst({
      where: {
        OR: [
          ...(currentUserId ? [{ id: currentUserId }] : []),
          ...(userEmail ? [{ email: userEmail }] : []),
        ],
      },
      select: { id: true },
    });

    const targetUserId = dbUser?.id || currentUserId;

    // 1. Cek order paket baru (NEW) lunas yang belum punya undangan terlebih dahulu
    //    (mendukung pembelian undangan ke-2/multi-undangan agar langsung masuk ke setup wizard undangan baru).
    const unlinkedPaidOrder = await prisma.order.findFirst({
      where: { userId: targetUserId, status: "PAID", orderType: "NEW", invitation: { is: null } },
      orderBy: { paidAt: "desc" },
    });

    if (unlinkedPaidOrder) {
      return NextResponse.json({
        step: "PAID_NEED_SETUP",
        orderId: unlinkedPaidOrder.id,
        planType: unlinkedPaidOrder.planType,
        redirectUrl: `/dashboard/setup?order=${unlinkedPaidOrder.id}&plan=${unlinkedPaidOrder.planType}`,
        hasPaidOrder: true,
      });
    }

    // 2. Cek apakah user sudah memiliki undangan berbayar (non-free-draft)
    const invitations = await prisma.invitation.findMany({
      where: { userId: targetUserId },
      orderBy: [{ isFreeDraft: "asc" }, { createdAt: "desc" }],
      select: {
        id: true,
        status: true,
        subdomain: true,
        invitationSlug: true,
        orderId: true,
        isFreeDraft: true,
        themeId: true,
        eventType: true,
        subEvent: true,
      },
    });

    const paidInvitation = invitations.find((inv) => !inv.isFreeDraft);
    const freeDraft = invitations.find((inv) => inv.isFreeDraft);

    if (paidInvitation) {
      return NextResponse.json({
        step: "COMPLETED",
        invitation: paidInvitation,
        redirectUrl: "/dashboard",
        hasPaidOrder: true,
      });
    }

    // 2b. Jika user hanya memiliki draf gratis, arahkan ke studio draf tetapi pertahankan hasPaidOrder: false
    if (freeDraft) {
      return NextResponse.json({
        step: "FREE_DRAFT",
        invitation: freeDraft,
        freeDraftId: freeDraft.id,
        redirectUrl: `/dashboard/invitation/${freeDraft.id}`,
        hasPaidOrder: false,
        hasFreeDraft: true,
      });
    }

    // 3. Cek transaksi order terakhir user (misal masih PENDING)
    const latestOrder = await prisma.order.findFirst({
      where: { userId: targetUserId },
      orderBy: { createdAt: "desc" },
    });

    if (!latestOrder) {
      return NextResponse.json({
        step: "NO_ORDER",
        redirectUrl: "/packages",
        hasPaidOrder: false,
      });
    }

    // Kasus: Order masih PENDING
    if (latestOrder.status === "PENDING") {
      const redirectUrl = latestOrder.checkoutConfirmedAt
        ? `/payment?order=${latestOrder.id}`
        : `/checkout?order=${latestOrder.id}`;

      return NextResponse.json({
        step: "ORDER_PENDING",
        orderId: latestOrder.id,
        invoiceNumber: latestOrder.invoiceNumber,
        planType: latestOrder.planType,
        amount: Number(latestOrder.amount),
        redirectUrl,
        hasPaidOrder: false,
      });
    }

    // Kasus 4: Order EXPIRED (gateway timeout/cancel). Order yang ditolak admin tetap PENDING dan ditangani di atas.
    // Arahkan ke pembuatan order baru dengan menyertakan pesan kecil
    return NextResponse.json({
      step: "ORDER_EXPIRED",
      orderId: latestOrder.id,
      planType: latestOrder.planType,
      invoiceNumber: latestOrder.invoiceNumber,
      redirectUrl: `/checkout?plan=${latestOrder.planType}&msg=qris_expired`,
    });
  } catch (error) {
    return routeError("OnboardingState", error);
  }
}
