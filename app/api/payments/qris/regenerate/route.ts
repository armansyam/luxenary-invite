import { getActiveGateway, getActiveGatewayId, getGatewayById } from "@/lib/gatewayRegistry";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
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

    const sessionUserId = (session.user as any).id;
    const sessionEmail = session.user.email;
    const isAdmin =
      (session.user as any).role === "SUPER_ADMIN" ||
      (session.user as any).role === "ADMIN" ||
      (session.user as any).isAdmin === true;

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
      // Release promo hold jika ada
      await prisma.promoHold.updateMany({
        where: { orderId: order.id, status: "HELD" },
        data: { status: "RELEASED" },
      });

      await prisma.order.update({
        where: { id: order.id },
        data: { status: "EXPIRED" },
      });

      return NextResponse.json({
        error: "Batas waktu pesanan ini telah habis (Expired). Silakan buat pesanan baru dari halaman paket.",
        isOrderExpired: true,
      }, { status: 410 });
    }

    // Auto-detect appUrl dari request headers
    const host = req.headers.get("x-forwarded-host") || req.headers.get("host") || "";
    const proto = req.headers.get("x-forwarded-proto") || (host.includes("localhost") ? "http" : "https");
    const appUrl = `${proto}://${host}`;

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

    // Hitung waktu kedaluwarsa sesi QRIS baru
    let expiryMinutes = 60;
    try {
      const expirySetting = await prisma.adminSetting.findUnique({ where: { key: "payment_expiry_minutes" } });
      if (expirySetting && !isNaN(Number(expirySetting.value))) {
        expiryMinutes = Math.max(5, Math.min(1440, Number(expirySetting.value)));
      }
    } catch {}

    const finalAmount = Number(order.amount);
    const { checkoutUrl, qrString, sessionId, expiryTimestamp, gatewayTxId } = await gw.init(orderId, finalAmount, appUrl);

    const expiryMs = expiryTimestamp ?? (serverNow + expiryMinutes * 60 * 1000);

    // Update order dengan sesi QRIS baru TANPA merubah ID atau menghapus diskon
    await prisma.order.update({
      where: { id: orderId },
      data: {
        paymentMethod: "GATEWAY",
        status: "PENDING",
        rejectReason: null,
        paymentGatewayRef: activeGatewayId,
        gatewayId: activeGatewayId,
        gatewayTxId: gatewayTxId || orderId,
        snapToken: qrString ? JSON.stringify({ qrString, sessionId, expiry: expiryMs }) : checkoutUrl,
        expiredAt: new Date(expiryMs),
      },
    });

    return NextResponse.json({
      success: true,
      checkoutUrl,
      qrString,
      sessionId,
      expiryTimestamp: expiryMs,
      gateway: activeGatewayId,
      serverTime: serverNow,
    });
  } catch (error: any) {
    console.error("[QRIS Regenerate Error]", error);
    return NextResponse.json({ error: error.message || "Gagal memperbarui sesi QRIS" }, { status: 500 });
  }
}
