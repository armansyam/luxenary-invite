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
        snapToken: true,
      },
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized. Silakan login terlebih dahulu." }, { status: 401 });
    }

    // Jika bukan admin dan bukan pemilik pesanan: Tolak akses (IDOR protection)
    if (!isAdmin && order.userId !== currentUserId) {
      return NextResponse.json({ error: "Forbidden: Anda tidak memiliki akses ke pesanan ini" }, { status: 403 });
    }

    // --- AUTO EXPIRE LOGIC FOR QRIS ---
    // Jika order masih PENDING, metode GATEWAY, dan ada snapToken (berisi batas waktu expiry)
    let finalStatus = order.status;
    
    if (order.status === "PENDING" && order.paymentMethod === "GATEWAY" && order.snapToken) {
      try {
        const tokenData = JSON.parse(order.snapToken);
        if (tokenData && tokenData.expiry) {
          const now = Date.now();
          // Tambahkan grace period 2 menit (120000ms) untuk sinkronisasi webhook iPaymu
          if (now > tokenData.expiry + 120000) {
            // Otomatis kedaluwarsakan pesanan ini karena iPaymu tidak kunjung mengirim status sukses/gagal
            const updatedOrder = await prisma.order.update({
              where: { id: order.id },
              data: { status: "EXPIRED" }
            });
            finalStatus = "EXPIRED";
          }
        }
      } catch (e) {
        // Abaikan jika snapToken bukan JSON valid
      }
    }

    const isAuthorizedOwner = true;

    return NextResponse.json({
      id: order.id,
      invoiceNumber: order.invoiceNumber,
      status: finalStatus,
      isExpired: finalStatus === "EXPIRED",
      amount: Number(order.amount),
      planType: order.planType,
      paymentMethod: order.paymentMethod,
      proofImageUrl: isAuthorizedOwner ? order.proofImageUrl : null,
      proofUploadedAt: isAuthorizedOwner ? order.proofUploadedAt : null,
      rejectReason: isAuthorizedOwner ? order.rejectReason : null,
      paidAt: order.paidAt,
      expiredAt: order.expiredAt,
      snapToken: isAuthorizedOwner ? order.snapToken : null,
      serverTime: Date.now(),
    });
  } catch (error: any) {
    return NextResponse.json({ error: process.env.NODE_ENV === "production" ? "Terjadi kesalahan server" : error.message }, { status: 500 });
  }
}

