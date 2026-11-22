import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { routeError } from "@/lib/routeError";
import { PARTNER_COOKIE_NAME, getPartnerSessionFromRequest } from "@/lib/partnerAuth";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getPartnerSessionFromRequest(req);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const partner = await prisma.partnerAffiliate.findUnique({
      where: { id: session.partnerId },
      select: { id: true, name: true, isActive: true, sessionVersion: true },
    });

    if (!partner || !partner.isActive) {
      return NextResponse.json({ error: "Akun mitra tidak aktif." }, { status: 403 });
    }

    if (session.sv !== partner.sessionVersion) {
      const expired = NextResponse.json(
        { error: "Sesi mitra telah berakhir. Silakan masuk kembali." },
        { status: 401 },
      );
      expired.cookies.set(PARTNER_COOKIE_NAME, "", { httpOnly: true, sameSite: "lax", path: "/", maxAge: 0 });
      return expired;
    }

    const { id: orderId } = await params;
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        invoiceNumber: true,
        status: true,
        planType: true,
        orderType: true,
        amount: true,
        chargedAmount: true,
        discountAmount: true,
        paymentMethod: true,
        proofImageUrl: true,
        proofUploadedAt: true,
        rejectReason: true,
        paidAt: true,
        fulfilledAt: true,
        expiredAt: true,
        gatewayId: true,
        gatewayTxId: true,
        gatewayQrString: true,
        gatewayCheckoutUrl: true,
        gatewaySessionExpiresAt: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phoneNumber: true,
            passwordHash: true,
            googleId: true,
            provisionedByPartnerId: true,
          },
        },
      },
    });

    if (!order || order.user?.provisionedByPartnerId !== partner.id) {
      return NextResponse.json({ error: "Tagihan tidak ditemukan pada akun mitra Anda." }, { status: 404 });
    }

    let finalStatus = order.status;
    let isQrisSessionExpired = false;
    const nowMs = Date.now();

    if (order.status === "PAID" && !order.fulfilledAt) {
      try {
        const { applyUpgradePlan } = await import("@/lib/upgradeHelper");
        await applyUpgradePlan(order.id);
      } catch (err) {
        logger.error("PartnerOrderStatus", "Pemenuhan ulang order gagal", err, { orderId: order.id });
      }
    }

    if (order.status === "PENDING") {
      if (order.gatewaySessionExpiresAt && nowMs > order.gatewaySessionExpiresAt.getTime()) {
        isQrisSessionExpired = true;
      }

      if (order.expiredAt && nowMs > order.expiredAt.getTime() && !order.proofImageUrl) {
        const expired = await prisma.order.updateMany({
          where: { id: order.id, status: "PENDING", proofImageUrl: null },
          data: { status: "EXPIRED" },
        });
        if (expired.count > 0) {
          finalStatus = "EXPIRED";
        }
      } else if (order.paymentMethod === "GATEWAY" && order.gatewayTxId && !isQrisSessionExpired) {
        try {
          const { getActiveGatewayId, getGatewayById } = await import("@/lib/gatewayRegistry");
          const activeGwId = order.gatewayId || (await getActiveGatewayId());
          const gw = await getGatewayById(activeGwId);
          if (gw && typeof gw.verify === "function") {
            const checkRes = await gw.verify(order.gatewayTxId || order.id);
            if (checkRes.status === "PAID") {
              const { isGatewayAmountValid, settleOrderAsPaid, isOrderPaid } = await import("@/lib/paymentSettlement");
              if (checkRes.grossAmount === undefined || isGatewayAmountValid(order, checkRes.grossAmount)) {
                const settled = await settleOrderAsPaid(order.id);
                if (settled) {
                  const { applyUpgradePlan } = await import("@/lib/upgradeHelper");
                  await applyUpgradePlan(order.id);
                }
                if (settled || (await isOrderPaid(order.id))) {
                  finalStatus = "PAID";
                }
              }
            }
          }
        } catch (err) {
          logger.warn("PartnerOrderStatus", "Rekonsiliasi gateway gagal sementara", {
            orderId: order.id,
            error: err instanceof Error ? err.message : String(err),
          });
        }
      }
    }

    return NextResponse.json(
      {
        success: true,
        id: order.id,
        invoiceNumber: order.invoiceNumber,
        status: finalStatus,
        planType: order.planType,
        orderType: order.orderType,
        amount: Number(order.amount),
        chargedAmount: order.chargedAmount !== null ? Number(order.chargedAmount) : null,
        discountAmount: order.discountAmount ? Number(order.discountAmount) : 0,
        paymentMethod: order.paymentMethod,
        hasProof: Boolean(order.proofImageUrl),
        proofUploadedAt: order.proofUploadedAt,
        rejectReason: order.rejectReason,
        paidAt: order.paidAt,
        expiredAt: order.expiredAt,
        isQrisSessionExpired,
        gatewayQrString: order.gatewayQrString,
        gatewayCheckoutUrl: order.gatewayCheckoutUrl,
        gatewaySessionExpiresAt: order.gatewaySessionExpiresAt?.getTime() ?? null,
        client: {
          id: order.user.id,
          name: order.user.name,
          email: order.user.email,
          phoneNumber: order.user.phoneNumber,
          isActivated: Boolean(order.user.passwordHash || order.user.googleId),
        },
        serverTime: Date.now(),
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return routeError("PartnerOrderStatus", error, "Gagal memeriksa status pembayaran mitra.");
  }
}
