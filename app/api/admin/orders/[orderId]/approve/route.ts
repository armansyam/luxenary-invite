import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const session = await auth();
    const isAdmin = (session?.user as any)?.isAdmin === true || (session?.user as any)?.role === "SUPER_ADMIN" || (session?.user as any)?.role === "ADMIN";
    if (!session?.user || !isAdmin) {
      return NextResponse.json({ error: "Unauthorized. Khusus Administrator." }, { status: 401 });
    }

    const { orderId } = await params;
    if (!orderId) {
      return NextResponse.json({ error: "Order ID diperlukan" }, { status: 400 });
    }

    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order) {
      return NextResponse.json({ error: "Order tidak ditemukan" }, { status: 404 });
    }

    if (order.status === "PAID") {
      return NextResponse.json({ error: "Order sudah berstatus PAID" }, { status: 400 });
    }

    // Update order status ke PAID
    await prisma.order.update({
      where: { id: orderId },
      data: {
        status: "PAID",
        paidAt: new Date(),
        paymentGatewayRef: "MANUAL_ADMIN_APPROVAL",
      },
    });

    // Publish undangan terkait jika ada
    try {
      await prisma.invitation.update({
        where: { orderId },
        data: { status: "PUBLISHED", publishedAt: new Date() },
      });
    } catch {
      // Undangan belum dibuat — oke
    }

    // Log audit
    try {
      await prisma.webhookLog.create({
        data: {
          source: "admin",
          event: "MANUAL_ORDER_APPROVE",
          payload: { orderId, approvedAt: new Date().toISOString() },
          status: "processed",
          processedAt: new Date(),
        },
      });
    } catch {}

    return NextResponse.json({ success: true, message: "Order berhasil dikonfirmasi manual" });
  } catch (error: any) {
    console.error("[Admin Approve Order Error]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
