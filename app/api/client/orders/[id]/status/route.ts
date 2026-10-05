import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { hasAdminPermission } from "@/lib/adminPermissions";

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
    const isAdmin = hasAdminPermission(session?.user, "orders");
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
        fulfilledAt: true,
        gatewayId: true,
        gatewayTxId: true,
        expiredAt: true,
        checkoutConfirmedAt: true,
        promoCodeApplied: true,
        discountAmount: true,
        createdAt: true,
        snapToken: true,
        orderType: true,
        requestedDomain: true,
        itemsJson: true,
        linkedInvitationId: true,
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
    const isOwner =
      order.userId === currentUserId ||
      (!!session?.user?.email && !!order.user?.email && order.user.email.toLowerCase() === session.user.email.toLowerCase());

    if (!isAdmin && !isOwner) {
      return NextResponse.json({ error: "Forbidden: Anda tidak memiliki akses ke pesanan ini" }, { status: 403 });
    }

    // --- AUTO EXPIRE LOGIC ---
    // Batas hidup order adalah 24 jam (order.expiredAt).
    // Kedaluwarsa sesi QRIS (tokenData.expiry 15-60 menit) TIDAK mematikan order,
    // melainkan hanya menandai isQrisSessionExpired agar frontend menampilkan tombol regenerasi QRIS.
    let finalStatus = order.status;
    let isQrisSessionExpired = false;
    const nowMs = Date.now();

    // Order sudah PAID tetapi pemenuhan layanan belum selesai (mis. gagal setelah webhook): ulangi, idempoten.
    if (order.status === "PAID" && !order.fulfilledAt) {
      try {
        const { applyUpgradePlan } = await import("@/lib/upgradeHelper");
        await applyUpgradePlan(order.id);
      } catch (fulfillErr) {
        console.error(`[Order Status] Pemenuhan ulang order ${order.id} gagal:`, fulfillErr);
      }
    }

    if (order.status === "PENDING") {
      // 1. Cek sesi QRIS
      if (order.snapToken) {
        try {
          const tokenData = JSON.parse(order.snapToken);
          if (tokenData && tokenData.expiry && nowMs > tokenData.expiry) {
            isQrisSessionExpired = true;
          }
        } catch {}
      }

      // 2. Cek batas hidup keseluruhan order (24 jam)
      if (order.expiredAt && nowMs > order.expiredAt.getTime()) {
        const expired = await prisma.order.updateMany({
          where: { id: order.id, status: "PENDING" },
          data: { status: "EXPIRED" },
        });

        if (expired.count > 0) {
          const { releaseOrderPromoHold } = await import("@/lib/marketing");
          await releaseOrderPromoHold(order.id);
          finalStatus = "EXPIRED";
        } else {
          finalStatus = (await prisma.order.findUniqueOrThrow({ where: { id: order.id }, select: { status: true } })).status;
        }
      } else if (order.paymentMethod === "GATEWAY" && !isQrisSessionExpired) {
        // Realtime Reconciliation via Gateway (Midtrans / Xendit)
        try {
          const { getActiveGatewayId, getGatewayById } = await import("@/lib/gatewayRegistry");
          const activeGwId = order.gatewayId || (await getActiveGatewayId());
          const gw = await getGatewayById(activeGwId);
          if (gw && typeof gw.verify === "function") {
            // Referensi sisi gateway (ID invoice Xendit / transaction_id Midtrans), bukan ID order kita.
            const checkRes = await gw.verify(order.gatewayTxId || order.id);
            if (checkRes.status === "PAID") {
              // Transisi atomik PENDING -> PAID + marketing; false jika webhook sudah lebih dulu memprosesnya
              const { settleOrderAsPaid } = await import("@/lib/paymentSettlement");
              const settled = await settleOrderAsPaid(order.id);

              if (settled) {
                const { applyUpgradePlan } = await import("@/lib/upgradeHelper");
                await applyUpgradePlan(order.id);

                const { paymentEmitter } = await import("@/lib/paymentEvents");
                paymentEmitter.emit(order.id, { status: "PAID", planType: order.planType });
              }
              finalStatus = "PAID";
            }
          }
        } catch (reconcileErr) {
          console.error(`[Order Status] Rekonsiliasi gateway gagal untuk order ${order.id}:`, reconcileErr);
        }
      }
    }

    const isAuthorizedOwner = isAdmin || order.userId === currentUserId;

    // Cek apakah pemilik order ini sudah memiliki order PAID (HANYA untuk order tipe NEW / pendaftaran awal)
    // Add-on (GALLERY_EXTENSION, MEMORIES_TOPUP) atau UPGRADE TIDAK BOLEH memicu isUserPaid
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
          linkedInvitationId: order.linkedInvitationId,
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
      linkedInvitationId: order.linkedInvitationId,
      buyerName: order.user?.name || null,
      buyerEmail: order.user?.email || null,
      buyerPhone: order.user?.phoneNumber || null,
      proofImageUrl: isAuthorizedOwner ? order.proofImageUrl : null,
      proofUploadedAt: isAuthorizedOwner ? order.proofUploadedAt : null,
      rejectReason: isAuthorizedOwner ? order.rejectReason : null,
      paidAt: order.paidAt,
      expiredAt: order.expiredAt,
      checkoutConfirmedAt: order.checkoutConfirmedAt,
      promoCodeApplied: order.promoCodeApplied,
      discountAmount: order.discountAmount ? Number(order.discountAmount) : 0,
      itemsJson: order.itemsJson || null,
      isQrisSessionExpired,
      snapToken: isAuthorizedOwner ? order.snapToken : null,
      serverTime: Date.now(),
    });
  } catch (error: any) {
    return NextResponse.json({ error: process.env.NODE_ENV === "production" ? "Terjadi kesalahan server" : error.message }, { status: 500 });
  }
}

