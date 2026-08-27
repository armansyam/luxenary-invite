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
        orderId: true,
      },
    });

    if (existingInvitation) {
      const hasPaid = existingInvitation.orderId 
        ? await prisma.order.findFirst({ where: { id: existingInvitation.orderId, status: "PAID" } })
        : null;
      
      return NextResponse.json({
        step: "COMPLETED",
        invitation: existingInvitation,
        redirectUrl: "/dashboard",
        hasPaidOrder: !!hasPaid,
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
        redirectUrl: "/packages",
        hasPaidOrder: false,
      });
    }

    // Kasus 1: Order sudah lunas tapi belum menyelesaikan setup undangan
    if (latestOrder.status === "PAID") {
      return NextResponse.json({
        step: "PAID_NEED_SETUP",
        orderId: latestOrder.id,
        planType: latestOrder.planType,
        redirectUrl: `/dashboard/setup?order=${latestOrder.id}&plan=${latestOrder.planType}`,
        hasPaidOrder: true,
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
        hasPaidOrder: false,
      });
    }

    // Kasus 3: Order EXPIRED atau FAILED (dari gateway webhook atau sweep)
    // Arahkan ke ID order lama agar mereka melihat warning merah "Sesi QRIS Berakhir"
    return NextResponse.json({
      step: "ORDER_EXPIRED",
      orderId: latestOrder.id,
      planType: latestOrder.planType,
      invoiceNumber: latestOrder.invoiceNumber,
      redirectUrl: `/checkout?order=${latestOrder.id}`,
    });
  } catch (error: any) {
    console.error("[Onboarding-State-Error]:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
