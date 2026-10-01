import { MidtransGateway } from "@/lib/gateways/midtrans";
import { prisma } from "@/lib/prisma";
import { applyUpgradePlan } from "@/lib/upgradeHelper";
import { paymentEmitter } from "@/lib/paymentEvents";
import { releaseOrderPromoHold } from "@/lib/marketing";
import { isGatewayAmountValid, isStaleGatewaySession, settleOrderAsPaid } from "@/lib/paymentSettlement";
import { logger } from "@/lib/logger";
import { captureException } from "@/lib/errorTracker";
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
            in: [
              "midtrans_server_key",
              "midtrans_client_key",
              "midtrans_sandbox_server_key",
              "midtrans_sandbox_client_key",
              "midtrans_production_server_key",
              "midtrans_production_client_key",
            ],
          },
        },
      });
      const map: Record<string, string> = {};
      settings.forEach((s) => (map[s.key] = s.value?.trim() || ""));

      let dbServerKey = map["midtrans_server_key"] || "";
      let dbClientKey = map["midtrans_client_key"] || "";

      // Auto-swap guard jika user menukar Server Key & Client Key di Admin Settings
      if (
        (dbServerKey.startsWith("Mid-client-") || dbServerKey.startsWith("SB-Mid-client-")) &&
        (dbClientKey.startsWith("Mid-server-") || dbClientKey.startsWith("SB-Mid-server-"))
      ) {
        const temp = dbServerKey;
        dbServerKey = dbClientKey;
        dbClientKey = temp;
      }

      if (dbServerKey) serverKeys.push(dbServerKey);
      if (map["midtrans_sandbox_server_key"]) serverKeys.push(map["midtrans_sandbox_server_key"]);
      if (map["midtrans_production_server_key"]) serverKeys.push(map["midtrans_production_server_key"]);
      if (dbClientKey && (dbClientKey.startsWith("Mid-server-") || dbClientKey.startsWith("SB-Mid-server-"))) {
        serverKeys.push(dbClientKey);
      }
    } catch (err) {
      console.warn("[Midtrans Webhook] Gagal memuat server key dari AdminSettings DB:", err);
    }

    const validServerKeys = Array.from(new Set(serverKeys.filter((k) => k && !k.includes("your_"))));

    // Hard-block di production DAN staging jika tidak ada key terkonfigurasi.
    // Bypass hanya diizinkan di mesin lokal (NODE_ENV=development) untuk sandbox testing.
    if (validServerKeys.length === 0) {
      const isLocalDev = process.env.NODE_ENV !== "production" && process.env.NEXT_PUBLIC_APP_ENV !== "staging";
      if (!isLocalDev) {
        console.error("[Midtrans Webhook] KRITIS: MIDTRANS_SERVER_KEY tidak terkonfigurasi. Webhook ditolak.");
        return NextResponse.json({ error: "Gateway not configured" }, { status: 503 });
      }
      console.warn("[Midtrans Webhook] ⚠️ Server key tidak terkonfigurasi — dev/sandbox bypass aktif (lokal only).");
    }

    // Verifikasi Signature — WAJIB jika server key terkonfigurasi
    if (validServerKeys.length > 0) {
      // Jika server key ada tapi signatureKey tidak dikirim — tolak (kemungkinan payload palsu)
      if (!signatureKey) {
        console.warn("[Midtrans Webhook] Payload tanpa signature_key ditolak untuk order:", orderId);
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
        console.warn("[Midtrans Webhook] Signature tidak valid — payload diabaikan untuk order:", orderId);
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
      console.error("[Midtrans Webhook] Gagal merekam webhookLog ke database:", err);
    }

    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Validasi Gateway Ownership — tolak jika order sudah dipindah ke gateway lain
    // Contoh: admin switch dari Midtrans ke Xendit, lalu Midtrans kirim webhook telat
    const orderGatewayId = (order as any).gatewayId as string | null;
    if (orderGatewayId && orderGatewayId !== "midtrans") {
      console.warn(`[Midtrans Webhook] Order ${orderId} gatewayId=${orderGatewayId}, bukan midtrans — diabaikan.`);
      return NextResponse.json({ status: "ignored", reason: "gateway_mismatch" }, { status: 200 });
    }

    // Cek Idempotency: Jika sudah PAID, return ok
    if (order.status === "PAID") {
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

      // Transisi PENDING -> PAID + marketing dalam satu transaksi (atomic check-and-set,
      // aman terhadap webhook duplikat bersamaan)
      const settled = await settleOrderAsPaid(orderId, { paymentMethod: "GATEWAY" });

      // Order sudah diproses webhook sebelumnya — return idempotent
      if (!settled) {
        return NextResponse.json({ status: "ok", note: "already_processed" });
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
  } catch (error: any) {
    captureException(error, { path: "/api/webhook/midtrans", method: "POST" });
    return NextResponse.json({ error: process.env.NODE_ENV === "production" ? "Internal server error" : (error.message || "Internal server error") }, { status: 500 });
  }
}

