import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user || !(session.user as any).id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const userEmail = session.user.email;

    // 1. Cek apakah user sudah memiliki undangan
    const existingInvitation = await prisma.invitation.findFirst({
      where: { userId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        status: true,
        subdomain: true,
        groomSlug: true,
        brideSlug: true,
        invitationSlug: true,
      },
    });

    if (existingInvitation) {
      return NextResponse.json({
        step: "COMPLETED",
        invitation: existingInvitation,
        redirectUrl: "/dashboard",
      });
    }

    // 2. Cek transaksi order terakhir user
    const latestOrder = await prisma.order.findFirst({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });

    if (!latestOrder) {
      return NextResponse.json({
        step: "NO_ORDER",
        redirectUrl: "/register",
      });
    }

    // Kasus 1: Order sudah lunas tapi belum menyelesaikan setup undangan
    if (latestOrder.status === "PAID") {
      return NextResponse.json({
        step: "PAID_NEED_SETUP",
        orderId: latestOrder.id,
        planType: latestOrder.planType,
        redirectUrl: `/dashboard/setup?order=${latestOrder.id}&plan=${latestOrder.planType}`,
      });
    }

    // Kasus 2: Order masih PENDING (Transfer manual maupun QRIS)
    if (latestOrder.status === "PENDING") {
      return NextResponse.json({
        step: "ORDER_PENDING",
        orderId: latestOrder.id,
        invoiceNumber: latestOrder.invoiceNumber,
        planType: latestOrder.planType,
        amount: Number(latestOrder.amount),
        redirectUrl: `/checkout?order=${latestOrder.id}`,
      });
    }

    // Kasus 3: Order EXPIRED atau FAILED (dari gateway webhook)
    return NextResponse.json({
      step: "ORDER_EXPIRED",
      orderId: latestOrder.id,
      planType: latestOrder.planType,
      invoiceNumber: latestOrder.invoiceNumber,
      redirectUrl: `/checkout?plan=${latestOrder.planType}`,
    });
  } catch (error: any) {
    console.error("[Onboarding-State-Error]:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
