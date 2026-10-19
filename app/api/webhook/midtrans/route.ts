import { MidtransGateway } from "@/lib/gateways/midtrans";
import { prisma } from "@/lib/prisma";
import { applyUpgradePlan } from "@/lib/upgradeHelper";
import { paymentEmitter } from "@/lib/paymentEvents";
import { releaseOrderPromoHold } from "@/lib/marketing";
import { isGatewayAmountValid, isOrderPaid, isStaleGatewaySession, settleOrderAsPaid, settlementSourceStatuses } from "@/lib/paymentSettlement";
import { logger } from "@/lib/logger";
import { routeError } from "@/lib/routeError";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    let body: any;
    try {
      body = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const orderId = body.order_id;
    const statusCode = body.status_code;
    const grossAmount = body.gross_amount;
    const signatureKey = body.signature_key;
    const trxStatus = body.transaction_status;
    const fraudStatus = body.fraud_status;

    if (!orderId) {
      return NextResponse.json({ error: "Missing order_id" }, { status: 400 });
    }

    // Validasi format orderId (harus UUID v4 — mencegah query DB sia-sia dari input sembarang)
    const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!UUID_REGEX.test(orderId)) {
      return NextResponse.json({ status: "ignored", reason: "invalid_order_id_format" }, { status: 200 });
    }

    // Ambil server key dari AdminSetting atau env dengan pembersihan whitespace & auto-swap guard
    const serverKeys: string[] = [];
    if (process.env.MIDTRANS_SERVER_KEY) serverKeys.push(process.env.MIDTRANS_SERVER_KEY.trim());
    try {
      const settings = await prisma.adminSetting.findMany({
        where: {
          key: {
            in: ["midtrans_sandbox_server_key", "midtrans_sandbox_client_key", "midtrans_production_server_key", "midtrans_production_client_key"],
          },
        },
      });
      const map: Record<string, string> = {};
      settings.forEach((s) => (map[s.key] = s.value?.trim() || ""));

      // Server key dari kedua lingkungan; kolom client key ikut dicoba bila admin menukar isian keduanya.
      for (const mode of ["sandbox", "production"]) {
        for (const field of ["server", "client"]) {
          const value = map[`midtrans_${mode}_${field}_key`] || "";
          if (value.startsWith("Mid-server-") || value.startsWith("SB-Mid-server-") || (field === "server" && value)) serverKeys.push(value);
        }
      }
    } catch (err) {
      logger.error("MidtransWebhook", "Server key dari pengaturan admin gagal dibaca; hanya kunci env yang dipakai", err);
    }

    const validServerKeys = Array.from(new Set(serverKeys.filter((k) => k && !k.includes("your_"))));

    // Hard-block di production DAN staging jika tidak ada key terkonfigurasi.
    // Bypass hanya diizinkan di mesin lokal (NODE_ENV=development) untuk sandbox testing.
    if (validServerKeys.length === 0) {
      const isLocalDev = process.env.NODE_ENV !== "production" && process.env.NEXT_PUBLIC_APP_ENV !== "staging";
      if (!isLocalDev) {
        logger.error("MidtransWebhook", "Server key Midtrans tidak terkonfigurasi; webhook ditolak");
        return NextResponse.json({ error: "Gateway not configured" }, { status: 503 });
      }
      logger.warn("MidtransWebhook", "Server key tidak terkonfigurasi; verifikasi signature dilewati (hanya pengembangan lokal)");
    }

    // Verifikasi Signature — WAJIB jika server key terkonfigurasi
    if (validServerKeys.length > 0) {
      // Jika server key ada tapi signatureKey tidak dikirim — tolak (kemungkinan payload palsu)
      if (!signatureKey) {
        logger.warn("MidtransWebhook", "Payload tanpa signature_key ditolak", { orderId });
        return NextResponse.json({ status: "rejected", reason: "missing_signature" }, { status: 400 });
      }

      const isValid = validServerKeys.some((serverKey) =>
        MidtransGateway.verifyWebhookSignature({
          order_id: orderId,
          status_code: statusCode,
          gross_amount: grossAmount,
          signature_key: signatureKey,
          serverKey,
        })
      );

      if (!isValid) {
        logger.warn("MidtransWebhook", "Signature tidak valid; payload diabaikan", { orderId });
        return NextResponse.json({ status: "ignored", reason: "invalid_signature" }, { status: 200 });
      }
    }


    // Log webhook yang masuk ke database
    let webhookLogId = "";
    try {
      const log = await prisma.webhookLog.create({
        data: {
          source: "midtrans",
          event: `status_${trxStatus || statusCode || "unknown"}`,
          payload: body,
          status: "received",
        },
      });
      webhookLogId = log.id;
    } catch (err) {
      logger.error("MidtransWebhook", "Gagal merekam webhook log; pemrosesan tetap dilanjutkan", err, { orderId });
    }

    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Cek Idempotency: Jika sudah PAID, return ok
    if (order.status === "PAID") {
      // Pemenuhan layanan yang gagal pada pengiriman sebelumnya dicoba lagi di sini (idempoten lewat fulfilledAt).
      if (!order.fulfilledAt) await applyUpgradePlan(orderId);
      return NextResponse.json({ status: "ok", note: "already_paid" });
    }

    // Evaluasi status transaksi Midtrans
    const isPaid =
      trxStatus === "settlement" ||
      (trxStatus === "capture" && fraudStatus === "accept");

    if (isPaid) {
      // Nominal yang dibayar harus sama dengan nominal yang ditagihkan saat init gateway
      if (!isGatewayAmountValid(order, Number(grossAmount))) {
        logger.error("MidtransWebhook", `Nominal tidak cocok, order ${orderId} tidak dilunasi.`, undefined, {
          orderId,
          grossAmount,
          chargedAmount: order.chargedAmount?.toString() ?? null,
          amount: order.amount.toString(),
        });
        if (webhookLogId) {
          await prisma.webhookLog.update({
            where: { id: webhookLogId },
            data: { status: "amount_mismatch", processedAt: new Date() },
          });
        }
        return NextResponse.json({ status: "ignored", reason: "amount_mismatch" }, { status: 200 });
      }

      const sources = await settlementSourceStatuses(order);
      if (!sources) {
        logger.error("MidtransWebhook", `Pembayaran diterima untuk order ${orderId} berstatus ${order.status}; perlu rekonsiliasi manual.`, undefined, {
          orderId,
          status: order.status,
          grossAmount,
        });
        if (webhookLogId) {
          await prisma.webhookLog.update({
            where: { id: webhookLogId },
            data: { status: "paid_on_closed_order", processedAt: new Date() },
          });
        }
        return NextResponse.json({ status: "ignored", reason: "order_closed" }, { status: 200 });
      }
      // Signature saja tidak cukup: kunci server sandbox yang tersimpan juga lolos validasi. Status transaksi
      // dikonfirmasi ke API Midtrans pada lingkungan aktif; non-2xx membuat Midtrans mengirim ulang notifikasi.
      let confirmedStatus: "PAID" | "FAILED" | "PENDING";
      try {
        confirmedStatus = (await new MidtransGateway().verify(orderId)).status;
      } catch (err) {
        logger.error("MidtransWebhook", `Status order ${orderId} gagal dikonfirmasi ke API Midtrans; order tidak dilunasi.`, err, { orderId });
        return NextResponse.json({ status: "retry", reason: "gateway_status_unavailable" }, { status: 503 });
      }
      if (confirmedStatus !== "PAID") {
        logger.warn("MidtransWebhook", `API Midtrans tidak mengonfirmasi pelunasan order ${orderId} (${confirmedStatus}); order tidak dilunasi.`, { orderId, confirmedStatus });
        return NextResponse.json({ status: "retry", reason: "status_unconfirmed" }, { status: 503 });
      }

      if (order.status !== "PENDING") {
        logger.warn("MidtransWebhook", `Order ${orderId} berstatus ${order.status} dilunasi karena pembayaran gateway valid diterima.`, { orderId });
      }

      // Transisi ke PAID + marketing dalam satu transaksi (atomic check-and-set,
      // aman terhadap webhook duplikat bersamaan)
      const settled = await settleOrderAsPaid(orderId, { paymentMethod: "GATEWAY" }, { from: sources });

      if (!settled) {
        // Order sudah diproses webhook sebelumnya — return idempotent
        if (await isOrderPaid(orderId)) {
          return NextResponse.json({ status: "ok", note: "already_processed" });
        }
        // Uang diterima tetapi pengguna sudah punya paket lunas lain (pembayaran ganda): perlu pengembalian dana manual.
        logger.error("MidtransWebhook", `Pembayaran ganda untuk order ${orderId}: pengguna sudah punya paket lunas; perlu pengembalian dana manual.`, undefined, { orderId, grossAmount });
        if (webhookLogId) {
          await prisma.webhookLog.update({
            where: { id: webhookLogId },
            data: { status: "paid_on_closed_order", processedAt: new Date() },
          });
        }
        return NextResponse.json({ status: "ignored", reason: "duplicate_payment" }, { status: 200 });
      }

      // Update webhook log
      if (webhookLogId) {
        await prisma.webhookLog.update({
          where: { id: webhookLogId },
          data: { status: "processed", processedAt: new Date() },
        }).catch((err) => logger.warn("MidtransWebhook", "Gagal memperbarui status webhookLog", { orderId, error: String(err) }));
      }

      // If this is an UPGRADE order, update planType on the linked original order
      await applyUpgradePlan(orderId);

      // Push notifikasi real-time ke browser klien via SSE
      paymentEmitter.emit(orderId, { status: "PAID", planType: order.planType });

      logger.info("MidtransWebhook", `Order ${orderId} settlement processed.`, {
        orderId,
        planType: order.planType,
        trxStatus,
      });

    } else if (trxStatus === "expire" || trxStatus === "cancel" || trxStatus === "deny") {
      if (isStaleGatewaySession(order, body.transaction_id)) {
        if (webhookLogId) {
          await prisma.webhookLog.update({
            where: { id: webhookLogId },
            data: { status: "stale_session", processedAt: new Date() },
          });
        }
        return NextResponse.json({ status: "ignored", reason: "stale_session" }, { status: 200 });
      }

      await prisma.order.updateMany({
        where: { id: orderId, status: "PENDING" },
        data: { status: "EXPIRED" },
      });

      // Lepaskan hold promo jika order kedaluwarsa
      await releaseOrderPromoHold(orderId);

      // Push notifikasi real-time ke browser klien via SSE
      paymentEmitter.emit(orderId, { status: "EXPIRED", planType: order.planType });

      logger.warn("MidtransWebhook", `Order ${orderId} marked as EXPIRED/CANCELLED (${trxStatus}).`, {
        orderId,
        trxStatus,
      });
    }

    return NextResponse.json({ status: "ok" });
  } catch (error) {
    return routeError("MidtransWebhook", error, "Internal server error");
  }
}

