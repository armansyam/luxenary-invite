import { getActiveGateway, getActiveGatewayId, getGatewayById } from "@/lib/gatewayRegistry";
import { computeGatewayCharge } from "@/lib/paymentFees";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
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

    const sessionUserId = (session.user as any).id;
    const sessionEmail = session.user.email;
    const isAdmin =
      (session.user as any).role === "SUPER_ADMIN" ||
      (session.user as any).role === "ADMIN" ||
      (session.user as any).isAdmin === true;

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

    if (order.status !== "PENDING" && order.status !== "FAILED") {
      return NextResponse.json({
        error: `Order tidak bisa diproses, status saat ini: ${order.status}`,
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
    if (order.status === "PENDING" && order.snapToken && order.gatewayId === activeGatewayId) {
      try {
        const parsed = JSON.parse(order.snapToken);
        const now = Date.now();
        if (parsed.qrString && parsed.expiry > now) {
          return NextResponse.json({
            qrString: parsed.qrString,
            sessionId: parsed.sessionId,
            expiryTimestamp: parsed.expiry,
            serverTime: now,
            gateway: activeGatewayId,
          });
        }
      } catch {
        // Jika bukan JSON (misal format redirect lama), lanjutkan alur inisialisasi ulang
      }
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

    // Nominal tagihan dan masa berlaku dari AdminSetting — satu sumber kebenaran, dibagi dengan penerbitan ulang QRIS
    const { finalAmount, expiryMinutes } = await computeGatewayCharge(Number(order.amount));

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
        // Rekam gateway yang menangani order ini + ID transaksi di sisi gateway
        gatewayId: activeGatewayId,
        gatewayTxId: gatewayTxId || orderId, // Fallback ke orderId jika gateway tidak mengembalikan txId spesifik
        // Nominal yang benar-benar ditagihkan ke gateway (termasuk biaya layanan mode BUYER) — dipakai webhook untuk validasi
        chargedAmount: finalAmount,
        snapToken: qrString ? JSON.stringify({ qrString, sessionId, expiry: expiryMs }) : checkoutUrl,
        expiredAt: new Date(expiryMs),
      },
    });

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
          recipientName: (order.user as any)?.name || undefined,
          type: "UNPAID",
          appUrl,
        });
      } catch (mailErr) {
        console.warn("[Payments Checkout] Gagal mengirim email invoice UNPAID:", mailErr);
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
  } catch (error: any) {
    console.error("[Payments Checkout Error]", error);
    return NextResponse.json({ error: process.env.NODE_ENV === "production" ? "Gagal memulai pembayaran" : (error.message || "Gagal memulai pembayaran") }, { status: 500 });
  }
}
