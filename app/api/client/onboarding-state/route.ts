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

    // Resolve user dari database berdasarkan ID atau Email Google
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

    // 1. Cek apakah user sudah memiliki undangan yang terbuat
    const existingInvitation = await prisma.invitation.findFirst({
      where: { userId: targetUserId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        status: true,
        subdomain: true,
        groomSlug: true,
        brideSlug: true,
        invitationSlug: true,
        orderId: true,
      },
    });

    if (existingInvitation) {
      return NextResponse.json({
        step: "COMPLETED",
        invitation: existingInvitation,
        redirectUrl: "/dashboard",
        hasPaidOrder: true,
      });
    }

    // 2. Cek apakah user sudah bayar lunas (PAID) tapi belum setup undangan
    // Sesuai aturan: Yang sudah bayar langsung masuk ke dashboard setup studio
    const paidOrder = await prisma.order.findFirst({
      where: { userId: targetUserId, status: "PAID" },
      orderBy: { createdAt: "desc" },
    });

    if (paidOrder) {
      return NextResponse.json({
        step: "PAID_NEED_SETUP",
        orderId: paidOrder.id,
        planType: paidOrder.planType,
        redirectUrl: `/dashboard/setup?order=${paidOrder.id}&plan=${paidOrder.planType}`,
        hasPaidOrder: true,
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
