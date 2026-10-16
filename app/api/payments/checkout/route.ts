import { getActiveGateway, getActiveGatewayId, getGatewayById } from "@/lib/gatewayRegistry";
import { computeGatewayCharge } from "@/lib/paymentFees";
import { awaitConcurrentGatewaySession } from "@/lib/paymentSession";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { hasAdminPermission } from "@/lib/adminPermissions";
import { logger } from "@/lib/logger";
import { rateLimitDb } from "@/lib/rateLimit";
import { routeError } from "@/lib/routeError";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * POST /api/payments/checkout
 * Trigger pembayaran QRIS/Gateway untuk order PENDING.
 *
 * Dynamic Gateway Switching — Arsitektur 2-Arah (Two-Way Handshake):
 * - Gateway yang didukung secara eksklusif: Midtrans dan Xendit.
 * - Setiap order menyimpan `gatewayId` dan `gatewayTxId` (ID transaksi di sisi gateway).
 * - Saat pembatalan, penggantian paket, atau timeout expired, sistem memanggil cancel() ke gateway aktif.
 * - Midtrans memanggil /v2/{orderId}/cancel dan Xendit memanggil /v2/invoices/{invoiceId}/expire.
 */
export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized. Silakan login terlebih dahulu." }, { status: 401 });
    }

    const sessionUserId = session.user.id;
    const sessionEmail = session.user.email;
    const isAdmin = hasAdminPermission(session.user, "orders");

    if (!(await rateLimitDb(`payments_checkout:${sessionUserId}`, 15, 60000))) {
      return NextResponse.json({ error: "Terlalu banyak permintaan pembayaran. Silakan coba lagi sebentar." }, { status: 429 });
    }

    const { orderId, customerName, customerPhone } = await req.json();
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

    // Pastikan order milik user yang sedang login atau admin
    const isOwner =
      order.userId === sessionUserId ||
      (sessionEmail && order.user?.email?.toLowerCase() === sessionEmail.toLowerCase());

    if (!isOwner && !isAdmin) {
      return NextResponse.json({ error: "Akses ditolak. Bukan order Anda." }, { status: 403 });
    }

    // Sinkronisasi data kontak pembeli (Nama & WhatsApp) jika dikirimkan dari UI checkout
    if (order.user) {
      const userUpdates: { name?: string; phoneNumber?: string } = {};
      if (typeof customerName === "string" && customerName.trim().length > 0) {
        userUpdates.name = customerName.trim();
      }
      if (typeof customerPhone === "string" && customerPhone.trim().length > 0) {
        const cleanPhone = customerPhone.replace(/\D/g, "");
        if (cleanPhone.length >= 9 && cleanPhone.length <= 15) {
          userUpdates.phoneNumber = cleanPhone;
        }
      }
      if (Object.keys(userUpdates).length > 0) {
        await prisma.user.update({
          where: { id: order.userId },
          data: userUpdates,
        });
      }
    }



    if (order.status === "EXPIRED") {
      return NextResponse.json({
        error: "Tagihan ini sudah kedaluwarsa. Silakan muat ulang halaman untuk mendapatkan tagihan baru.",
        isExpired: true,
      }, { status: 400 });
    }

    if (order.status !== "PENDING") {
      return NextResponse.json({
        error: `Order tidak bisa diproses, status saat ini: ${order.status}`,
      }, { status: 400 });
    }

    if (order.expiredAt && order.expiredAt.getTime() <= Date.now()) {
      const expired = await prisma.order.updateMany({ where: { id: order.id, status: "PENDING" }, data: { status: "EXPIRED" } });
      if (expired.count > 0) {
        const { releaseOrderPromoHold } = await import("@/lib/marketing");
        await releaseOrderPromoHold(order.id);
      }
      return NextResponse.json({
        error: "Tagihan ini sudah kedaluwarsa. Silakan muat ulang halaman untuk mendapatkan tagihan baru.",
        isExpired: true,
      }, { status: 400 });
    }

    const platformMode = (await prisma.adminSetting.findUnique({ where: { key: "payment_mode" } }))?.value;
    if (platformMode === "MANUAL" || order.paymentMethod === "MANUAL_TRANSFER" || order.proofImageUrl) {
      return NextResponse.json(
        { error: "Order ini memakai transfer manual. Unggah bukti transfer, bukan pembayaran gateway." },
        { status: 409 }
      );
    }

    // Auto-detect appUrl dari request headers
    const host = req.headers.get("x-forwarded-host") || req.headers.get("host") || "";
    const proto = req.headers.get("x-forwarded-proto") || (host.includes("localhost") ? "http" : "https");
    const appUrl = `${proto}://${host}`;

    // Gateway ditentukan admin lewat pengaturan, bukan oleh klien: parameter `gateway` dari klien diabaikan.
    const gw = await getActiveGateway();
    const activeGatewayId = await getActiveGatewayId();

    // ──────────────────────────────────────────────────────────────────────
    // IDEMPOTENCY / SESI QRIS AKTIF:
    // Jika order masih PENDING, gateway tidak berubah, dan sudah memiliki QRIS aktif
    // yang belum kedaluwarsa: langsung kembalikan sesi yang sama tanpa panggil ulang gateway.
    // Ini mencegah error "order_id already been taken" pada Midtrans & gateway stateful lainnya.
    // ──────────────────────────────────────────────────────────────────────
    const now = Date.now();
    if (
      order.status === "PENDING" &&
      order.gatewayId === activeGatewayId &&
      order.gatewaySessionExpiresAt &&
      order.gatewaySessionExpiresAt.getTime() > now &&
      (order.gatewayQrString || order.gatewayCheckoutUrl)
    ) {
      return NextResponse.json({
        qrString: order.gatewayQrString ?? undefined,
        checkoutUrl: order.gatewayCheckoutUrl ?? undefined,
        sessionId: order.gatewayTxId,
        expiryTimestamp: order.gatewaySessionExpiresAt.getTime(),
        serverTime: now,
        gateway: activeGatewayId,
      });
    }

    // ──────────────────────────────────────────────────────────────────────
    // DYNAMIC GATEWAY SWITCHING — Cancel transaksi lama sebelum re-init
    //
    // Jika order sudah punya gatewayTxId (transaksi sebelumnya sudah pernah di-init),
    // kita WAJIB membatalkan transaksi lama di gateway tersebut sebelum membuat yang baru.
    //
    // Kenapa: Midtrans dan Xendit memerlukan pembatalan resmi via API agar status
    //         di jaringan perbankan (ASPI / BI) langsung hangus dan tidak terjadi pembayaran ganda.
    // ──────────────────────────────────────────────────────────────────────
    const prevGatewayTxId = order.gatewayTxId;
    const prevGatewayId = order.gatewayId;

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
          logger.warn("PaymentsCheckout", "Pembatalan sesi gateway lama gagal; sesi baru tetap dibuat", { orderId: order.id, gatewayId: prevGatewayId, error: cancelResult.error });
        }
      }
    }

    // Nominal tagihan dan masa berlaku dari AdminSetting — satu sumber kebenaran, dibagi dengan penerbitan ulang QRIS
    const { finalAmount, expiryMinutes } = await computeGatewayCharge(Number(order.amount));

    let initResult: Awaited<ReturnType<typeof gw.init>>;
    try {
      initResult = await gw.init(orderId, finalAmount, appUrl);
    } catch (initError) {
      // Permintaan bersamaan untuk order yang sama: yang kedua ditolak gateway, sesi dari yang pertama dipakai bersama.
      const concurrent = await awaitConcurrentGatewaySession(orderId, activeGatewayId, prevGatewayTxId);
      if (!concurrent) throw initError;
      return NextResponse.json({ ...concurrent, serverTime: Date.now(), gateway: activeGatewayId });
    }
    const { checkoutUrl, qrString, sessionId, expiryTimestamp, gatewayTxId } = initResult;

    // Kedaluwarsa sesi dari gateway bila ada, selain itu `payment_expiry_minutes`. Batas hidup order (expiredAt)
    // tidak disentuh: sesi yang habis diterbitkan ulang lewat /api/payments/qris/regenerate.
    const serverNow = Date.now();
    const expiryMs = Math.min(expiryTimestamp ?? (serverNow + expiryMinutes * 60 * 1000), order.expiredAt?.getTime() ?? Infinity);

    // Simpan ke DB — termasuk gatewayId dan gatewayTxId untuk keperluan cancel berikutnya. Bersyarat PENDING: order yang
    // lunas selama init gateway tidak boleh dikembalikan ke PENDING.
    const saved = await prisma.order.updateMany({
      where: { id: orderId, status: "PENDING" },
      data: {
        paymentMethod: "GATEWAY",
        rejectReason: null,
        // Rekam gateway yang menangani order ini + ID transaksi di sisi gateway
        gatewayId: activeGatewayId,
        gatewayTxId: gatewayTxId || orderId, // Fallback ke orderId jika gateway tidak mengembalikan txId spesifik
        // Nominal yang benar-benar ditagihkan ke gateway (termasuk biaya layanan mode BUYER) — dipakai webhook untuk validasi
        chargedAmount: finalAmount,
        gatewayQrString: qrString ?? null,
        gatewayCheckoutUrl: qrString ? null : (checkoutUrl ?? null),
        gatewaySessionExpiresAt: new Date(expiryMs),
      },
    });
    if (saved.count === 0) {
      return NextResponse.json({ error: "Pesanan sudah diproses. Muat ulang halaman untuk melihat status terbarunya." }, { status: 409 });
    }

    // Kirim email instruksi tagihan (UNPAID) secara terjamin
    if (order.user?.email) {
      try {
        const { sendInvoiceEmail } = await import("@/lib/mailer");
        await sendInvoiceEmail({
          orderId: order.id,
          orderType: order.orderType,
          plan: order.planType,
          amount: Number(order.amount),
          paymentMethod: "QRIS / Payment Gateway",
          recipientEmail: order.user.email,
          recipientName: order.user.name || undefined,
          type: "UNPAID",
          appUrl,
        });
      } catch (mailErr) {
        logger.warn("PaymentsCheckout", "Email invoice UNPAID gagal dikirim", { orderId: order.id, error: mailErr instanceof Error ? mailErr.message : String(mailErr) });
      }
    }

    return NextResponse.json({
      checkoutUrl,
      qrString,
      sessionId,
      expiryTimestamp: expiryMs,
      gateway: activeGatewayId,
      serverTime: serverNow,
    });
  } catch (error) {
    return routeError("PaymentsCheckout", error, "Gagal memulai pembayaran");
  }
}
