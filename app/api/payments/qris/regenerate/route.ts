import { getActiveGateway, getActiveGatewayId, getGatewayById } from "@/lib/gatewayRegistry";
import { prisma } from "@/lib/prisma";
import { computeGatewayCharge } from "@/lib/paymentFees";
import { awaitConcurrentGatewaySession } from "@/lib/paymentSession";
import { auth } from "@/auth";
import { hasAdminPermission } from "@/lib/adminPermissions";
import { logger } from "@/lib/logger";
import { rateLimitDb } from "@/lib/rateLimit";
import { getTrustedAppUrl } from "@/lib/serverDomainUtils";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * POST /api/payments/qris/regenerate
 * Memperbarui sesi QRIS yang kedaluwarsa TANPA membuat Order baru.
 * Menjaga diskon PromoHold dan ID pesanan tetap utuh selama Order.expiredAt belum lewat.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized. Silakan login terlebih dahulu." }, { status: 401 });
    }

    const sessionUserId = session.user.id;
    const sessionEmail = session.user.email;
    const isAdmin = hasAdminPermission(session.user, "orders");

    if (!(await rateLimitDb(`payments_qris_regenerate:${sessionUserId}`, 15, 60000))) {
      return NextResponse.json({ error: "Terlalu banyak permintaan pembayaran. Silakan coba lagi sebentar." }, { status: 429 });
    }

    const body = await req.json().catch(() => ({}));
    const { orderId } = body;

    if (!orderId) {
      return NextResponse.json({ error: "orderId wajib diisi" }, { status: 400 });
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { user: { select: { id: true, email: true, name: true, phoneNumber: true } } },
    });

    if (!order) {
      return NextResponse.json({ error: "Order tidak ditemukan" }, { status: 404 });
    }

    const isOwner =
      order.userId === sessionUserId ||
      (sessionEmail && order.user?.email?.toLowerCase() === sessionEmail.toLowerCase());

    if (!isOwner && !isAdmin) {
      return NextResponse.json({ error: "Akses ditolak. Bukan order Anda." }, { status: 403 });
    }

    if (order.status !== "PENDING") {
      return NextResponse.json({
        error: `Order tidak dapat diperbarui. Status saat ini: ${order.status}`,
        status: order.status,
      }, { status: 400 });
    }

    const serverNow = Date.now();

    // ──────────────────────────────────────────────────────────────────────
    // Cek apakah batas waktu hidup ORDER (24 jam) sudah habis:
    // Jika sudah habis, order benar-benar EXPIRED dan harus checkout ulang.
    // ──────────────────────────────────────────────────────────────────────
    if (order.expiredAt && new Date(order.expiredAt).getTime() <= serverNow) {
      // Bersyarat: pembayaran yang baru saja masuk (webhook) tidak boleh ditimpa menjadi EXPIRED.
      const expired = await prisma.order.updateMany({
        where: { id: order.id, status: "PENDING" },
        data: { status: "EXPIRED" },
      });
      if (expired.count > 0) {
        await prisma.promoHold.updateMany({
          where: { orderId: order.id, status: "HELD" },
          data: { status: "RELEASED" },
        });
      }

      return NextResponse.json({
        error: "Batas waktu pesanan ini telah habis (Expired). Silakan buat pesanan baru dari halaman paket.",
        isOrderExpired: true,
      }, { status: 410 });
    }

    // Halaman balik dan alamat notifikasi dikirim ke gateway: dari konfigurasi, bukan dari header Host yang dapat dipalsukan.
    const appUrl = await getTrustedAppUrl();

    const gw = await getActiveGateway();
    const activeGatewayId = await getActiveGatewayId();

    // Batalkan sesi gateway lama jika sebelumnya pernah ada transaksi
    const prevGatewayTxId = order.gatewayTxId;
    const prevGatewayId = order.gatewayId;
    if (prevGatewayTxId) {
      const prevGw = prevGatewayId ? await getGatewayById(prevGatewayId).catch(() => null) : null;
      if (prevGw) {
        const cancelResult = await prevGw.cancel(prevGatewayTxId);
        if (!cancelResult.success && cancelResult.error?.includes("terbayar")) {
          return NextResponse.json(
            { error: "Transaksi ini sudah terbayar dan tidak bisa diproses ulang." },
            { status: 409 }
          );
        }
      }
    }

    // Nominal (termasuk biaya layanan BUYER) dan masa berlaku sama persis dengan checkout awal
    const { finalAmount, expiryMinutes } = await computeGatewayCharge(Number(order.amount));

    let initResult: Awaited<ReturnType<typeof gw.init>>;
    try {
      initResult = await gw.init(orderId, finalAmount, appUrl);
    } catch (initError) {
      // Permintaan bersamaan untuk order yang sama: yang kedua ditolak gateway, sesi dari yang pertama dipakai bersama.
      const concurrent = await awaitConcurrentGatewaySession(orderId, activeGatewayId, prevGatewayTxId);
      if (!concurrent) throw initError;
      return NextResponse.json({ success: true, ...concurrent, gateway: activeGatewayId, serverTime: Date.now() });
    }
    const { checkoutUrl, qrString, sessionId, expiryTimestamp, gatewayTxId } = initResult;

    // Sesi baru tidak boleh melewati batas hidup order, dan batas hidup order (expiredAt) tidak diperpanjang.
    const expiryMs = Math.min(expiryTimestamp ?? (serverNow + expiryMinutes * 60 * 1000), order.expiredAt?.getTime() ?? Infinity);

    // Sesi QRIS baru disimpan TANPA merubah ID atau menghapus diskon. Bersyarat PENDING: init gateway memakan waktu, dan
    // order yang lunas di sela itu tidak boleh dikembalikan ke PENDING.
    const saved = await prisma.order.updateMany({
      where: { id: orderId, status: "PENDING" },
      data: {
        paymentMethod: "GATEWAY",
        rejectReason: null,
        gatewayId: activeGatewayId,
        gatewayTxId: gatewayTxId || orderId,
        chargedAmount: finalAmount,
        gatewayQrString: qrString ?? null,
        gatewayCheckoutUrl: qrString ? null : (checkoutUrl ?? null),
        gatewaySessionExpiresAt: new Date(expiryMs),
      },
    });
    if (saved.count === 0) {
      return NextResponse.json({ error: "Pesanan sudah diproses. Muat ulang halaman untuk melihat status terbarunya." }, { status: 409 });
    }

    return NextResponse.json({
      success: true,
      checkoutUrl,
      qrString,
      sessionId,
      expiryTimestamp: expiryMs,
      gateway: activeGatewayId,
      serverTime: serverNow,
    });
  } catch (error) {
    logger.error("QrisRegenerate", "Gagal memperbarui sesi QRIS", error);
    const detail = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: process.env.NODE_ENV === "production" ? "Gagal memperbarui sesi QRIS" : detail }, { status: 500 });
  }
}
