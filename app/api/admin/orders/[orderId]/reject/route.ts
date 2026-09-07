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
    const isAdmin =
      (session?.user as any)?.isAdmin === true ||
      (session?.user as any)?.role === "SUPER_ADMIN" ||
      (session?.user as any)?.role === "ADMIN";

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

    let reason = "Bukti transfer tidak valid atau dana belum masuk.";
    try {
      const body = await req.json();
      if (body.reason && body.reason.trim()) {
        reason = body.reason.trim();
      }
    } catch {}

    // Update order status ke FAILED / REJECTED
    await prisma.order.update({
      where: { id: orderId },
      data: {
        status: "FAILED",
        rejectReason: reason,
      },
    });

    // Catat ke AdminAuditLog
    try {
      const adminRecord = await prisma.admin.findFirst({
        where: { email: (session.user as any).email },
      });
      if (adminRecord) {
        await prisma.adminAuditLog.create({
          data: {
            adminId: adminRecord.id,
            action: "REJECT_MANUAL_ORDER",
            details: `Menolak transaksi order ${order.invoiceNumber || orderId}. Alasan: ${reason}`,
            ipAddress: req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "localhost",
          },
        });
      }
    } catch {}

    return NextResponse.json({
      success: true,
      message: "Order berhasil ditolak.",
      orderId,
      rejectReason: reason,
    });
  } catch (error: any) {
    console.error("[Admin Reject Order Error]", error);
    return NextResponse.json({ error: process.env.NODE_ENV === "production" ? "Terjadi kesalahan server" : error.message }, { status: 500 });
  }
}
