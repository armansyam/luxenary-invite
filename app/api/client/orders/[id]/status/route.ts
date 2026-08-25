import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

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

    const order = await prisma.order.findUnique({
      where: { id },
      select: {
        id: true,
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

    return NextResponse.json({
      id: order.id,
      invoiceNumber: order.invoiceNumber,
      status: order.status,
      isExpired: order.status === "EXPIRED",
      amount: Number(order.amount),
      planType: order.planType,
      paymentMethod: order.paymentMethod,
      proofImageUrl: order.proofImageUrl,
      proofUploadedAt: order.proofUploadedAt,
      rejectReason: order.rejectReason,
      paidAt: order.paidAt,
      expiredAt: order.expiredAt,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
