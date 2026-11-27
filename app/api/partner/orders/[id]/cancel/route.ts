import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { routeError } from "@/lib/routeError";
import { PARTNER_COOKIE_NAME, getPartnerSessionFromRequest } from "@/lib/partnerAuth";
import { rateLimitDb } from "@/lib/rateLimit";
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

    if (!(await rateLimitDb(`partner_cancel:${partner.id}`, 20, 60_000))) {
      return NextResponse.json(
        { error: "Terlalu banyak permintaan pembatalan. Tunggu sebentar lalu coba lagi." },
        { status: 429 },
      );
    }

    const { id: orderId } = await params;
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        user: { select: { id: true, provisionedByPartnerId: true } },
      },
    });

    if (!order || order.user?.provisionedByPartnerId !== partner.id) {
      return NextResponse.json({ error: "Tagihan tidak ditemukan pada akun mitra Anda." }, { status: 404 });
    }

    if (order.status === "PAID") {
      return NextResponse.json(
        { error: "Tagihan ini sudah lunas dan tidak dapat dibatalkan.", isPaid: true },
        { status: 409 },
      );
    }

    if (order.status !== "PENDING") {
      return NextResponse.json(
        { error: "Hanya tagihan berstatus menunggu pembayaran (PENDING) yang dapat dibatalkan." },
        { status: 400 },
      );
    }

    if (order.proofImageUrl) {
      return NextResponse.json(
        { error: "Tagihan tidak dapat dibatalkan karena bukti transfer sudah diunggah dan sedang diverifikasi admin." },
        { status: 400 },
      );
    }

    // Batalkan sesi gateway aktif (QRIS/Snap) agar tidak bisa dibayar setelah dibatalkan.
    if (order.gatewayTxId) {
      try {
        const { getGatewayById, getActiveGateway } = await import("@/lib/gatewayRegistry");
        const gateway = order.gatewayId ? await getGatewayById(order.gatewayId) : await getActiveGateway();
        if (gateway.cancel) {
          const cancelRes = await gateway.cancel(order.gatewayTxId || orderId);
          if (cancelRes && !cancelRes.success && cancelRes.error?.includes("terbayar")) {
            return NextResponse.json(
              { error: "Tagihan ini sudah terbayar di Payment Gateway dan tidak dapat dibatalkan.", isPaid: true },
              { status: 409 },
            );
          }
        }
      } catch (err) {
        logger.error("PartnerOrderCancel", "Pembatalan di payment gateway gagal; order tetap dibatalkan lokal", err, { orderId });
      }
    }

    const cancelled = await prisma.order.updateMany({
      where: { id: orderId, status: "PENDING", proofImageUrl: null },
      data: {
        status: "EXPIRED",
        rejectReason: "Dibatalkan oleh Mitra",
        gatewayQrString: null,
        gatewayCheckoutUrl: null,
        gatewaySessionExpiresAt: null,
      },
    });

    if (cancelled.count === 0) {
      return NextResponse.json(
        { error: "Tagihan sudah diproses (misalnya baru saja lunas) dan tidak dapat dibatalkan." },
        { status: 409 },
      );
    }

    try {
      const { releaseOrderPromoHold } = await import("@/lib/marketing");
      await releaseOrderPromoHold(orderId);
    } catch (promoErr) {
      logger.error("PartnerOrderCancel", "Gagal melepaskan promo hold", promoErr, { orderId });
    }

    try {
      const { paymentEmitter } = await import("@/lib/paymentEvents");
      paymentEmitter.emit(orderId, { status: "EXPIRED", planType: order.planType });
    } catch (emitErr) {
      logger.warn("PartnerOrderCancel", "Notifikasi SSE pembatalan gagal dikirim", {
        orderId,
        error: emitErr instanceof Error ? emitErr.message : String(emitErr),
      });
    }

    return NextResponse.json({
      success: true,
      status: "EXPIRED",
      message: "Tagihan berhasil dibatalkan.",
    });
  } catch (error) {
    return routeError("PartnerOrderCancel", error, "Gagal membatalkan tagihan mitra.");
  }
}
