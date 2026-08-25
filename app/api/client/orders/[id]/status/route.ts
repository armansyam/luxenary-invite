import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "Missing order ID" }, { status: 400 });
    }

    const session = await auth();
    const isAdmin =
      (session?.user as any)?.isAdmin === true ||
      (session?.user as any)?.role === "ADMIN" ||
      (session?.user as any)?.role === "SUPER_ADMIN";
    const currentUserId = session?.user?.id;

    const order = await prisma.order.findUnique({
      where: { id },
      select: {
        id: true,
        userId: true,
        invoiceNumber: true,
        status: true,
        amount: true,
        planType: true,
        paymentMethod: true,
        proofImageUrl: true,
        proofUploadedAt: true,
        rejectReason: true,
        paidAt: true,
        expiredAt: true,
        createdAt: true,
      },
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Jika user login tapi bukan pemilik dan bukan admin: Tolak akses (IDOR protection)
    if (session?.user && !isAdmin && order.userId && currentUserId && order.userId !== currentUserId) {
      return NextResponse.json({ error: "Forbidden: Anda tidak memiliki akses ke pesanan ini" }, { status: 403 });
    }

    const isAuthorizedOwner = isAdmin || (currentUserId && order.userId === currentUserId);

    return NextResponse.json({
      id: order.id,
      invoiceNumber: order.invoiceNumber,
      status: order.status,
      isExpired: order.status === "EXPIRED",
      amount: Number(order.amount),
      planType: order.planType,
      paymentMethod: order.paymentMethod,
      proofImageUrl: isAuthorizedOwner ? order.proofImageUrl : null,
      proofUploadedAt: isAuthorizedOwner ? order.proofUploadedAt : null,
      rejectReason: isAuthorizedOwner ? order.rejectReason : null,
      paidAt: order.paidAt,
      expiredAt: order.expiredAt,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

