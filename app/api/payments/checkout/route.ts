import { getActiveGateway, getActiveGatewayId, getGatewayById } from "@/lib/gatewayRegistry";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * POST /api/payments/checkout
 * Trigger pembayaran QRIS/Gateway untuk order PENDING.
 *
 * Dynamic Gateway Switching — Arsitektur:
 * - Setiap order menyimpan `gatewayId` dan `gatewayTxId` (ID transaksi di sisi gateway)
 * - Sebelum init ke gateway (baru/sama), sistem akan cancel transaksi lama di gateway tsb
 * - Ini mencegah error "transaction already exists" di Midtrans saat user regenerate
 * - Gateway stateless (iPaymu, Tripay, Duitku) cancel() = no-op, langsung re-init
 * - Gateway stateful (Midtrans, Xendit) cancel() = real API call ke gateway
 */
export async function POST(req: Request) {
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

    const { orderId, gateway: requestedGateway } = await req.json();
    if (!orderId) {
      return NextResponse.json({ error: "orderId wajib diisi" }, { status: 400 });
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { user: { select: { id: true, email: true } } },
    });

    if (!order) {
      return NextResponse.json({ error: "Order tidak ditemukan" }, { status: 404 });
    }

    // Pastikan order milik user yang sedang login atau admin
    const isOwner =
      order.userId === sessionUserId ||
      (sessionEmail && order.user?.email?.toLowerCase() === sessionEmail.toLowerCase());

    if (!isOwner && !isAdmin) {
      return NextResponse.json({ error: "Akses ditolak. Bukan order Anda." }, { status: 403 });
    }

    if (order.status !== "PENDING" && order.status !== "FAILED" && order.status !== "EXPIRED") {
      return NextResponse.json({
        error: `Order tidak bisa diproses, status saat ini: ${order.status}`,
      }, { status: 400 });
    }

    // Auto-detect appUrl dari request headers
    const host = req.headers.get("x-forwarded-host") || req.headers.get("host") || "";
    const proto = req.headers.get("x-forwarded-proto") || (host.includes("localhost") ? "http" : "https");
    const appUrl = `${proto}://${host}`;

    // Gunakan gateway yang diminta klien, atau fallback ke gateway aktif dari AdminSetting
    const gw = requestedGateway
      ? await getGatewayById(requestedGateway)
      : await getActiveGateway();

    const activeGatewayId = requestedGateway || (await getActiveGatewayId());

    // ──────────────────────────────────────────────────────────────────────
    // DYNAMIC GATEWAY SWITCHING — Cancel transaksi lama sebelum re-init
    //
    // Jika order sudah punya gatewayTxId (transaksi sebelumnya sudah pernah di-init),
    // kita WAJIB membatalkan transaksi lama di gateway tersebut sebelum membuat yang baru.
    //
    // Kenapa: Midtrans menolak init ulang jika order_id yang sama masih pending.
    //         Xendit sama. iPaymu/Tripay/Duitku no-op (aman langsung).
    // ──────────────────────────────────────────────────────────────────────
    const prevGatewayTxId = (order as any).gatewayTxId as string | null;
    const prevGatewayId = (order as any).gatewayId as string | null;

    if (prevGatewayTxId && order.status === "PENDING") {
      // Ambil gateway yang sebelumnya menangani order ini
      const prevGw = prevGatewayId
        ? await getGatewayById(prevGatewayId).catch(() => null)
        : null;

      if (prevGw) {
        const cancelResult = await prevGw.cancel(prevGatewayTxId);
        if (!cancelResult.success) {
          // Jika gagal dibatalkan karena sudah terbayar — STOP, jangan proses lagi
          if (cancelResult.error?.includes("terbayar")) {
            return NextResponse.json(
              { error: "Transaksi ini sudah terbayar dan tidak bisa diproses ulang." },
              { status: 409 }
            );
          }
          // Jika cancel gagal karena alasan lain (network timeout, dll) — log tapi tetap lanjut
          // karena kemungkinan transaksi sudah expired di gateway
          console.warn(`[Checkout] Cancel ${prevGatewayId} gagal (${cancelResult.error}), lanjut init ulang.`);
        }
      }
    }

    // Baca konfigurasi pembayaran dari AdminSetting — satu sumber kebenaran
    let finalAmount = Number(order.amount);
    let expiryMinutes = 60;
    try {
      const [feePayerSetting, feeRateSetting, expirySetting] = await Promise.all([
        prisma.adminSetting.findUnique({ where: { key: "payment_fee_payer" } }),
        prisma.adminSetting.findUnique({ where: { key: "payment_fee_rate" } }),
        prisma.adminSetting.findUnique({ where: { key: "payment_expiry_minutes" } }),
      ]);

      if (feePayerSetting?.value === "BUYER") {
        const feeRate = feeRateSetting && !isNaN(Number(feeRateSetting.value))
          ? Math.max(0, Math.min(0.1, Number(feeRateSetting.value)))
          : 0.007;
        const adminFee = Math.ceil(finalAmount * feeRate);
        finalAmount += adminFee;
      }

      if (expirySetting && !isNaN(Number(expirySetting.value))) {
        expiryMinutes = Math.max(5, Math.min(1440, Number(expirySetting.value)));
      }
    } catch {}

    const { checkoutUrl, qrString, sessionId, expiryTimestamp, gatewayTxId } = await gw.init(orderId, finalAmount, appUrl);

    /**
     * Tentukan waktu kedaluwarsa yang valid:
     * - Utamakan `expiryTimestamp` dari respons gateway (paling akurat, sinkron dengan sistem gateway)
     * - Fallback: hitung dari setting admin `payment_expiry_minutes` relatif terhadap waktu server
     */
    const serverNow = Date.now();
    const expiryMs = expiryTimestamp ?? (serverNow + expiryMinutes * 60 * 1000);

    // Simpan ke DB — termasuk gatewayId dan gatewayTxId untuk keperluan cancel berikutnya
    await prisma.order.update({
      where: { id: orderId },
      data: {
        paymentMethod: "GATEWAY",
        status: "PENDING",
        rejectReason: null,
        paymentGatewayRef: activeGatewayId,
        // Rekam gateway yang menangani order ini + ID transaksi di sisi gateway
        gatewayId: activeGatewayId,
        gatewayTxId: gatewayTxId || orderId, // Fallback ke orderId jika gateway tidak mengembalikan txId spesifik
        snapToken: qrString ? JSON.stringify({ qrString, sessionId, expiry: expiryMs }) : checkoutUrl,
        expiredAt: new Date(expiryMs),
      },
    });

    return NextResponse.json({
      checkoutUrl,
      qrString,
      sessionId,
      expiryTimestamp: expiryMs,
      gateway: activeGatewayId,
      serverTime: serverNow,
    });
  } catch (error: any) {
    console.error("[Payments Checkout Error]", error);
    return NextResponse.json({ error: process.env.NODE_ENV === "production" ? "Gagal memulai pembayaran" : (error.message || "Gagal memulai pembayaran") }, { status: 500 });
  }
}
