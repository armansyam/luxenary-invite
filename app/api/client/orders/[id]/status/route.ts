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
        orderType: true,
        requestedDomain: true,
        linkedOrderId: true,
        user: {
          select: {
            name: true,
            email: true,
            phoneNumber: true,
          },
        },
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

    // --- AUTO EXPIRE LOGIC FOR GATEWAY / QRIS ---
    // Jika order masih PENDING dan batas waktu kedaluwarsa sudah lewat,
    // tandai EXPIRED di database (self-healing saat webhook tidak sampai, misal di localhost Mac)
    let finalStatus = order.status;
    
    if (order.status === "PENDING" && order.paymentMethod === "GATEWAY") {
      const nowMs = Date.now();
      let isExpired = false;

      // 1. Cek dari order.expiredAt di database
      if (order.expiredAt && nowMs > order.expiredAt.getTime()) {
        isExpired = true;
      }

      // 2. Cek dari tokenData.expiry di snapToken (jika format JSON)
      if (!isExpired && order.snapToken) {
        try {
          const tokenData = JSON.parse(order.snapToken);
          if (tokenData && tokenData.expiry && nowMs > tokenData.expiry) {
            isExpired = true;
          }
        } catch {}
      }

      if (isExpired) {
        await prisma.order.update({
          where: { id: order.id },
          data: { status: "EXPIRED" },
        });
        finalStatus = "EXPIRED";
      } else {
        // Realtime Reconciliation via Gateway (Midtrans / Xendit)
        // Memastikan status tagihan realtime terverifikasi langsung ke gateway saat status dicek
        try {
          const { getActiveGatewayId, getGatewayById } = await import("@/lib/gatewayRegistry");
          const activeGwId = (order as any).gatewayId || (await getActiveGatewayId());
          const gw = await getGatewayById(activeGwId);
          if (gw && typeof gw.verify === "function") {
            const checkRes = await gw.verify(order.id);
            if (checkRes.status === "PAID") {
              await prisma.order.update({
                where: { id: order.id },
                data: {
                  status: "PAID",
                  paidAt: new Date(),
                },
              });

              const { applyUpgradePlan } = await import("@/lib/upgradeHelper");
              await applyUpgradePlan(order.id);

              const { paymentEmitter } = await import("@/lib/paymentEvents");
              paymentEmitter.emit(order.id, { status: "PAID", planType: order.planType });
              finalStatus = "PAID";
            } else if (checkRes.status === "FAILED") {
              await prisma.order.update({
                where: { id: order.id },
                data: { status: "FAILED" },
              });
              finalStatus = "FAILED";
            }
          }
        } catch {
          // Abaikan kegagalan jaringan sementara
        }
      }
    }

    const isAuthorizedOwner = isAdmin || order.userId === currentUserId;

    // Cek apakah pemilik order ini sudah memiliki order PAID (HANYA untuk order tipe NEW / pendaftaran awal)
    // Add-on (GALLERY_EXTENSION, CUSTOM_DOMAIN_ADDON) atau UPGRADE TIDAK BOLEH memicu isUserPaid
    let isUserPaid = false;
    let paidOrderId: string | null = null;
    let paidPlanType: string | null = null;

    if (!isAdmin && order.userId && order.orderType === "NEW") {
      const activePaidOrder = await prisma.order.findFirst({
        where: {
          userId: order.userId,
          status: "PAID",
          orderType: { in: ["NEW", "UPGRADE"] },
        },
        orderBy: { paidAt: "desc" },
        select: { id: true, planType: true, orderType: true },
      });

      if (activePaidOrder) {
        isUserPaid = true;
        paidOrderId = activePaidOrder.id;
        paidPlanType = activePaidOrder.planType;
      }
    }

    // Cek apakah order ini sudah digantikan oleh order yang lebih baru (superseded) dengan orderType dan scope yang sama
    let isSuperseded = false;
    let activeOrderId: string | null = null;

    if (finalStatus !== "PAID" && !isAdmin) {
      const newerActiveOrder = await prisma.order.findFirst({
        where: {
          userId: order.userId,
          id: { not: order.id },
          orderType: order.orderType,
          linkedOrderId: order.linkedOrderId || null,
          createdAt: { gt: order.createdAt },
          status: { in: ["PENDING", "PAID"] },
        },
        orderBy: { createdAt: "desc" },
        select: { id: true },
      });

      if (newerActiveOrder) {
        isSuperseded = true;
        activeOrderId = newerActiveOrder.id;
      }
    }

    return NextResponse.json({
      id: order.id,
      invoiceNumber: order.invoiceNumber,
      status: finalStatus,
      isExpired: finalStatus === "EXPIRED",
      isSuperseded,
      activeOrderId,
      isUserPaid,
      paidOrderId,
      paidPlanType,
      amount: Number(order.amount),
      planType: order.planType,
      orderType: order.orderType,
      paymentMethod: order.paymentMethod,
      requestedDomain: order.requestedDomain,
      linkedOrderId: order.linkedOrderId,
      buyerName: order.user?.name || null,
      buyerEmail: order.user?.email || null,
      buyerPhone: order.user?.phoneNumber || null,
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

