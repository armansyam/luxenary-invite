import { getActiveGateway, getActiveGatewayId, getGatewayById } from "@/lib/gatewayRegistry";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * POST /api/payments/checkout
 * Trigger pembayaran QRIS/Gateway untuk order PENDING.
 *
 * Gateway dipilih secara dinamis dari AdminSetting (active_payment_gateway).
 * Klien dapat override gateway via param `gateway` jika diizinkan.
 *
 * Auth: hanya pemilik order atau admin yang bisa trigger.
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
        // Tarif fee dibaca dari AdminSetting — bukan hardcode
        // Default seed: 0.007 (0.7% QRIS), admin bisa ubah kapan saja dari dashboard
        const feeRate = feeRateSetting && !isNaN(Number(feeRateSetting.value))
          ? Math.max(0, Math.min(0.1, Number(feeRateSetting.value))) // clamp 0–10%
          : 0.007;
        const adminFee = Math.ceil(finalAmount * feeRate);
        finalAmount += adminFee;
      }

      if (expirySetting && !isNaN(Number(expirySetting.value))) {
        expiryMinutes = Math.max(5, Math.min(1440, Number(expirySetting.value)));
      }
    } catch {}

    const { checkoutUrl, qrString, sessionId, expiryTimestamp } = await gw.init(orderId, finalAmount, appUrl);

    /**
     * Tentukan waktu kedaluwarsa yang valid:
     * - Utamakan `expiryTimestamp` dari respons gateway (paling akurat, sinkron dengan sistem gateway)
     * - Fallback: hitung dari setting admin `payment_expiry_minutes` relatif terhadap waktu server
     *
     * TIDAK BOLEH menggunakan waktu perangkat klien (browser) karena bisa tidak sinkron dengan
     * jam server maupun jam gateway, sehingga countdown bisa meleset.
     */
    const serverNow = Date.now();
    const expiryMs = expiryTimestamp ?? (serverNow + expiryMinutes * 60 * 1000);

    // Simpan ke DB — expiredAt adalah referensi waktu otoritatif untuk sweep/cron
    await prisma.order.update({
      where: { id: orderId },
      data: {
        paymentMethod: "GATEWAY",
        status: "PENDING", // Reset jika sebelumnya FAILED/EXPIRED
        rejectReason: null,
        paymentGatewayRef: activeGatewayId,
        snapToken: qrString ? JSON.stringify({ qrString, sessionId, expiry: expiryMs }) : checkoutUrl,
        expiredAt: new Date(expiryMs),
      },
    });

    /**
     * Response ke client:
     * - `expiryTimestamp`: waktu kedaluwarsa dalam ms (Unix epoch) — dari DB, bukan dari jam klien
     * - `serverTime`: waktu server saat ini — klien WAJIB gunakan ini sebagai basis countdown,
     *   bukan Date.now() browser, agar hitungan mundur tetap sinkron dengan gateway
     */
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
