import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { routeError } from "@/lib/routeError";
import { auth } from "@/auth";
import { hasAdminPermission } from "@/lib/adminPermissions";
import { logger } from "@/lib/logger";
import { calculatePartnerWholesaleDiscount, isPartnerWholesaleInvoice } from "@/lib/clientActivation";

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
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized. Silakan login terlebih dahulu." }, { status: 401 });
    }
    const isAdmin = hasAdminPermission(session.user, "orders");
    const currentUserId = session.user.id;

    const order = await prisma.order.findUnique({
      where: { id },
      select: {
        id: true,
        userId: true,
        invoiceNumber: true,
        status: true,
        amount: true,
        chargedAmount: true,
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
        gatewayQrString: true,
        gatewayCheckoutUrl: true,
        gatewaySessionExpiresAt: true,
        orderType: true,
        requestedDomain: true,
        itemsJson: true,
        linkedInvitationId: true,
        invitation: {
          select: { id: true },
        },
        user: {
          select: {
            name: true,
            email: true,
            phoneNumber: true,
            provisionedByPartner: {
              select: {
                id: true,
                name: true,
                isActive: true,
                commissionType: true,
                commissionValue: true,
              },
            },
          },
        },
      },
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
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
    // Kedaluwarsa sesi gateway (gatewaySessionExpiresAt, 15-60 menit) TIDAK mematikan order,
    // melainkan hanya menandai isQrisSessionExpired agar frontend menampilkan tombol penerbitan ulang sesi.
    let finalStatus = order.status;
    let isQrisSessionExpired = false;
    const nowMs = Date.now();

    // Order sudah PAID tetapi pemenuhan layanan belum selesai (mis. gagal setelah webhook): ulangi, idempoten.
    if (order.status === "PAID" && !order.fulfilledAt) {
      try {
        const { applyUpgradePlan } = await import("@/lib/upgradeHelper");
        await applyUpgradePlan(order.id);
      } catch (fulfillErr) {
        logger.error("OrderStatus", "Pemenuhan ulang order gagal", fulfillErr, { orderId: order.id });
      }
    }

    if (order.status === "PENDING") {
      // 1. Cek sesi gateway (QRIS maupun URL checkout)
      if (order.gatewaySessionExpiresAt && nowMs > order.gatewaySessionExpiresAt.getTime()) {
        isQrisSessionExpired = true;
      }

      // 2. Cek batas hidup keseluruhan order (24 jam). Order berbukti transfer menunggu verifikasi admin dan tidak
      // kedaluwarsa (sama dengan sapuan di admin/overview).
      if (order.expiredAt && nowMs > order.expiredAt.getTime() && !order.proofImageUrl) {
        const expired = await prisma.order.updateMany({
          where: { id: order.id, status: "PENDING", proofImageUrl: null },
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
        // Rekonsiliasi langsung ke Midtrans
        try {
          const { getActiveGatewayId, getGatewayById } = await import("@/lib/gatewayRegistry");
          const activeGwId = order.gatewayId || (await getActiveGatewayId());
          const gw = await getGatewayById(activeGwId);
          if (gw && typeof gw.verify === "function") {
            // Referensi sisi gateway (transaction_id Midtrans), bukan ID order kita.
            const checkRes = await gw.verify(order.gatewayTxId || order.id);
            if (checkRes.status === "PAID") {
              const { isGatewayAmountValid, settleOrderAsPaid, isOrderPaid } = await import("@/lib/paymentSettlement");
              if (checkRes.grossAmount !== undefined && !isGatewayAmountValid(order, checkRes.grossAmount)) {
                logger.error("OrderStatus", "Rekonsiliasi gateway ditolak: nominal tidak cocok dengan tagihan", null, {
                  orderId: order.id,
                  expected: Number(order.chargedAmount ?? order.amount),
                  received: checkRes.grossAmount,
                });
              } else {
                // Transisi atomik PENDING -> PAID + marketing; false jika webhook sudah lebih dulu memprosesnya
                const settled = await settleOrderAsPaid(order.id);

                if (settled) {
                  const { applyUpgradePlan } = await import("@/lib/upgradeHelper");
                  await applyUpgradePlan(order.id);

                  const activatedInv = order.orderType === "NEW"
                    ? await prisma.invitation.findUnique({ where: { orderId: order.id }, select: { id: true } })
                    : null;

                  const { paymentEmitter } = await import("@/lib/paymentEvents");
                  paymentEmitter.emit(order.id, {
                    status: "PAID",
                    planType: order.planType,
                    orderType: order.orderType,
                    activatedInvitationId: activatedInv?.id ?? null,
                  });
                }
                // Pelunasan ditolak (pengguna sudah punya paket lunas lain) tidak boleh ditampilkan sebagai PAID.
                if (settled || (await isOrderPaid(order.id))) finalStatus = "PAID";
              }
            }
          }
        } catch (reconcileErr) {
          logger.error("OrderStatus", "Rekonsiliasi gateway gagal", reconcileErr, { orderId: order.id });
        }
      }
    }

    const isAuthorizedOwner = isAdmin || order.userId === currentUserId;

    // Cek apakah pemilik order ini sudah memiliki order NEW PAID lain yang BELUM dibuatkan undangan.
    // Order NEW yang sudah tertaut ke undangan lama tidak boleh memblokir checkout undangan tambahan (?new=1).
    let isUserPaid = false;
    let paidOrderId: string | null = null;
    let paidPlanType: string | null = null;

    if (!isAdmin && order.userId && order.orderType === "NEW") {
      const activePaidOrder = await prisma.order.findFirst({
        where: {
          userId: order.userId,
          status: "PAID",
          orderType: "NEW",
          invitation: { is: null },
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

    let activatedInvitationId: string | null = order.invitation?.id ?? null;
    if (finalStatus === "PAID" && order.orderType === "NEW" && !activatedInvitationId) {
      const linkedInv = await prisma.invitation.findUnique({
        where: { orderId: order.id },
        select: { id: true },
      });
      activatedInvitationId = linkedInv?.id ?? null;
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

    const isPartnerOrder = isPartnerWholesaleInvoice(order.invoiceNumber);
    const hidePartnerPricing = !isAdmin && isPartnerOrder;

    const activePartner =
      isPartnerOrder && !hidePartnerPricing && !order.itemsJson && order.orderType === "NEW" && order.user?.provisionedByPartner?.isActive
        ? order.user.provisionedByPartner
        : null;
    const basePriceForPartner =
      order.checkoutConfirmedAt && order.discountAmount
        ? Number(order.amount) + Number(order.discountAmount)
        : Number(order.amount);
    const partnerDiscountAmount = activePartner
      ? calculatePartnerWholesaleDiscount(basePriceForPartner, activePartner)
      : 0;
    const partnerDiscount =
      activePartner && partnerDiscountAmount > 0
        ? {
            partnerName: activePartner.name,
            discountType: activePartner.commissionType,
            discountValue: Number(activePartner.commissionValue),
            discountAmount: partnerDiscountAmount,
            basePrice: basePriceForPartner,
          }
        : null;

    return NextResponse.json({
      id: order.id,
      invoiceNumber: hidePartnerPricing ? null : order.invoiceNumber,
      isPartnerBilled: isPartnerOrder,
      status: finalStatus,
      isExpired: finalStatus === "EXPIRED",
      isSuperseded,
      activeOrderId,
      isUserPaid,
      paidOrderId,
      paidPlanType,
      amount: hidePartnerPricing ? null : Number(order.amount),
      // Nominal yang ditagihkan gateway (harga + biaya layanan bila ditanggung pembeli); null sebelum sesi gateway terbit.
      chargedAmount: hidePartnerPricing ? null : (order.chargedAmount !== null ? Number(order.chargedAmount) : null),
      planType: order.planType,
      orderType: order.orderType,
      paymentMethod: hidePartnerPricing ? null : order.paymentMethod,
      requestedDomain: order.requestedDomain,
      linkedInvitationId: order.linkedInvitationId,
      activatedInvitationId,
      buyerName: order.user?.name || null,
      buyerEmail: order.user?.email || null,
      buyerPhone: order.user?.phoneNumber || null,
      proofImageUrl: isAuthorizedOwner && !hidePartnerPricing ? order.proofImageUrl : null,
      proofUploadedAt: isAuthorizedOwner && !hidePartnerPricing ? order.proofUploadedAt : null,
      rejectReason: isAuthorizedOwner && !hidePartnerPricing ? order.rejectReason : null,
      paidAt: order.paidAt,
      expiredAt: order.expiredAt,
      checkoutConfirmedAt: order.checkoutConfirmedAt,
      promoCodeApplied: hidePartnerPricing ? null : order.promoCodeApplied,
      discountAmount: hidePartnerPricing ? 0 : (order.discountAmount ? Number(order.discountAmount) : 0),
      partnerDiscount,
      itemsJson: order.itemsJson || null,
      isQrisSessionExpired,
      gatewayQrString: isAuthorizedOwner && !hidePartnerPricing ? order.gatewayQrString : null,
      gatewayCheckoutUrl: isAuthorizedOwner && !hidePartnerPricing ? order.gatewayCheckoutUrl : null,
      gatewaySessionExpiresAt: isAuthorizedOwner && !hidePartnerPricing ? order.gatewaySessionExpiresAt?.getTime() ?? null : null,
      serverTime: Date.now(),
    });
  } catch (error) {
    return routeError("OrderStatus", error, "Gagal memuat status pesanan");
  }
}

