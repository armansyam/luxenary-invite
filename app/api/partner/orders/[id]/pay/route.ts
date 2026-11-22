import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { routeError } from "@/lib/routeError";
import { PARTNER_COOKIE_NAME, getPartnerSessionFromRequest } from "@/lib/partnerAuth";
import { rateLimitDb } from "@/lib/rateLimit";
import { getActiveGateway, getActiveGatewayId, getGatewayById } from "@/lib/gatewayRegistry";
import { computeGatewayCharge } from "@/lib/paymentFees";
import { awaitConcurrentGatewaySession } from "@/lib/paymentSession";
import { getTrustedAppUrl } from "@/lib/serverDomainUtils";
import { getPublicPlatformSettings } from "@/lib/settings";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

export async function POST(
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
      select: { id: true, name: true, email: true, isActive: true, sessionVersion: true },
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

    if (!(await rateLimitDb(`partner_pay:${partner.id}`, 20, 60_000))) {
      return NextResponse.json(
        { error: "Terlalu banyak permintaan pembayaran. Tunggu sebentar lalu coba lagi." },
        { status: 429 },
      );
    }

    const { id: orderId } = await params;
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        user: {
          select: { id: true, name: true, email: true, provisionedByPartnerId: true },
        },
      },
    });

    if (!order || order.user?.provisionedByPartnerId !== partner.id) {
      return NextResponse.json({ error: "Tagihan tidak ditemukan pada akun mitra Anda." }, { status: 404 });
    }

    if (order.status === "PAID") {
      return NextResponse.json({
        success: true,
        alreadyPaid: true,
        status: "PAID",
        orderId: order.id,
      });
    }

    if (order.status !== "PENDING") {
      return NextResponse.json(
        { error: `Tagihan tidak dapat dibayar (Status: ${order.status}). Buat tagihan baru dari formulir.` },
        { status: 400 },
      );
    }

    if (order.expiredAt && order.expiredAt.getTime() <= Date.now() && !order.proofImageUrl) {
      await prisma.order.updateMany({
        where: { id: order.id, status: "PENDING", proofImageUrl: null },
        data: { status: "EXPIRED" },
      });
      return NextResponse.json(
        { error: "Tagihan ini sudah kedaluwarsa. Silakan buat tagihan baru untuk klien ini.", isExpired: true },
        { status: 400 },
      );
    }

    const settings = await getPublicPlatformSettings();
    const isManualMode = settings.paymentMode === "MANUAL" || order.paymentMethod === "MANUAL_TRANSFER" || Boolean(order.proofImageUrl);

    if (isManualMode) {
      return NextResponse.json({
        success: true,
        paymentMethod: "MANUAL_TRANSFER",
        orderId: order.id,
        invoiceNumber: order.invoiceNumber,
        amount: Number(order.amount),
        bank: {
          bankName: settings.bankName,
          bankAccountNumber: settings.bankAccountNumber,
          bankAccountHolder: settings.bankAccountHolder,
          bankInstructions: settings.bankInstructions,
        },
        hasProof: Boolean(order.proofImageUrl),
        serverTime: Date.now(),
      });
    }

    // Mode GATEWAY (Midtrans QRIS / Snap)
    const appUrl = await getTrustedAppUrl();
    const gw = await getActiveGateway();
    const activeGatewayId = await getActiveGatewayId();
    const now = Date.now();

    // Idempotency: gunakan kembali sesi QRIS/Snap aktif jika belum kedaluwarsa
    if (
      order.gatewayId === activeGatewayId &&
      order.gatewaySessionExpiresAt &&
      order.gatewaySessionExpiresAt.getTime() > now &&
      (order.gatewayQrString || order.gatewayCheckoutUrl)
    ) {
      return NextResponse.json({
        success: true,
        paymentMethod: "GATEWAY",
        orderId: order.id,
        invoiceNumber: order.invoiceNumber,
        amount: Number(order.amount),
        chargedAmount: order.chargedAmount !== null ? Number(order.chargedAmount) : Number(order.amount),
        qrString: order.gatewayQrString ?? undefined,
        checkoutUrl: order.gatewayCheckoutUrl ?? undefined,
        sessionId: order.gatewayTxId,
        expiryTimestamp: order.gatewaySessionExpiresAt.getTime(),
        gateway: activeGatewayId,
        serverTime: now,
      });
    }

    // Cancel sesi gateway lama sebelum membuat sesi baru
    const prevGatewayTxId = order.gatewayTxId;
    const prevGatewayId = order.gatewayId;
    if (prevGatewayTxId) {
      const prevGw = prevGatewayId ? await getGatewayById(prevGatewayId).catch(() => null) : null;
      if (prevGw) {
        const cancelRes = await prevGw.cancel(prevGatewayTxId);
        if (!cancelRes.success && cancelRes.error?.includes("terbayar")) {
          return NextResponse.json(
            { error: "Transaksi ini sudah terbayar. Muat ulang status pesanan." },
            { status: 409 },
          );
        }
        if (!cancelRes.success) {
          logger.warn("PartnerOrderPay", "Pembatalan sesi gateway lama gagal; melanjutkan sesi baru", {
            orderId: order.id,
            error: cancelRes.error,
          });
        }
      }
    }

    const { finalAmount, expiryMinutes } = await computeGatewayCharge(Number(order.amount));

    let initResult: Awaited<ReturnType<typeof gw.init>>;
    try {
      initResult = await gw.init(order.id, finalAmount, appUrl);
    } catch (initError) {
      const concurrent = await awaitConcurrentGatewaySession(order.id, activeGatewayId, prevGatewayTxId);
      if (!concurrent) throw initError;
      return NextResponse.json({
        success: true,
        paymentMethod: "GATEWAY",
        orderId: order.id,
        invoiceNumber: order.invoiceNumber,
        amount: Number(order.amount),
        chargedAmount: finalAmount,
        ...concurrent,
        gateway: activeGatewayId,
        serverTime: Date.now(),
      });
    }

    const { checkoutUrl, qrString, sessionId, expiryTimestamp, gatewayTxId } = initResult;
    const serverNow = Date.now();
    const expiryMs = Math.min(
      expiryTimestamp ?? (serverNow + expiryMinutes * 60 * 1000),
      order.expiredAt?.getTime() ?? Infinity,
    );

    const saved = await prisma.order.updateMany({
      where: { id: order.id, status: "PENDING" },
      data: {
        paymentMethod: "GATEWAY",
        rejectReason: null,
        gatewayId: activeGatewayId,
        gatewayTxId: gatewayTxId || order.id,
        chargedAmount: finalAmount,
        gatewayQrString: qrString ?? null,
        gatewayCheckoutUrl: qrString ? null : (checkoutUrl ?? null),
        gatewaySessionExpiresAt: new Date(expiryMs),
      },
    });

    if (saved.count === 0) {
      return NextResponse.json(
        { error: "Pesanan sudah diproses. Muat ulang halaman untuk melihat status terbaru." },
        { status: 409 },
      );
    }

    return NextResponse.json({
      success: true,
      paymentMethod: "GATEWAY",
      orderId: order.id,
      invoiceNumber: order.invoiceNumber,
      amount: Number(order.amount),
      chargedAmount: finalAmount,
      qrString,
      checkoutUrl,
      sessionId,
      expiryTimestamp: expiryMs,
      gateway: activeGatewayId,
      serverTime: serverNow,
    });
  } catch (error) {
    return routeError("PartnerOrderPay", error, "Gagal memulai pembayaran tagihan mitra.");
  }
}
