import { XenditGateway } from "@/lib/gateways/xendit";
import { prisma } from "@/lib/prisma";
import { applyUpgradePlan } from "@/lib/upgradeHelper";
import { paymentEmitter } from "@/lib/paymentEvents";
import { releaseOrderPromoHold } from "@/lib/marketing";
import { isGatewayAmountValid, isStaleGatewaySession, settleOrderAsPaid } from "@/lib/paymentSettlement";
import { logger } from "@/lib/logger";
import { NextRequest, NextResponse } from "next/server";

/**
 * Xendit Webhook Handler
 * Docs: https://developers.xendit.co/api-reference/#invoice-callback
 *
 * Xendit mengirim webhook saat status invoice berubah.
 * Verifikasi via header: x-callback-token (static secret dari dashboard Xendit)
 *
 * Payload utama:
 *   - id: Xendit invoice ID
 *   - external_id: orderId yang kita kirim saat buat invoice
 *   - status: "PAID" | "EXPIRED" | "SETTLED"
 */

async function getXenditWebhookTokens(): Promise<string[]> {
  const tokens: string[] = [];
  if (process.env.XENDIT_WEBHOOK_TOKEN) tokens.push(process.env.XENDIT_WEBHOOK_TOKEN);
  const setting = await prisma.adminSetting.findUnique({
    where: { key: "xendit_webhook_token" },
  });
  if (setting?.value) tokens.push(setting.value);
  return Array.from(new Set(tokens.filter((t) => t && !t.includes("your_"))));
}

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    let body: any;
    try {
      body = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    // orderId adalah external_id yang kita kirim saat membuat invoice
    const orderId = body.external_id;
    const xenditStatus = body.status;

    if (!orderId) {
      return NextResponse.json({ error: "Missing external_id" }, { status: 400 });
    }

    // Validasi format orderId (UUID v4) — mencegah query sia-sia
    const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!UUID_REGEX.test(orderId)) {
      return NextResponse.json({ status: "ignored", reason: "invalid_order_id_format" }, { status: 200 });
    }

    // Verifikasi x-callback-token dari header
    const incomingToken = req.headers.get("x-callback-token") || "";
    const storedTokens = await getXenditWebhookTokens();

    // Hard-block di production jika tidak ada token terkonfigurasi.
    // Di dev/staging: webhook tetap bisa masuk tapi dengan warning (sandbox testing).
    if (storedTokens.length === 0) {
      if (process.env.NODE_ENV === "production") {
        console.error("[Xendit Webhook] KRITIS: XENDIT_WEBHOOK_TOKEN tidak terkonfigurasi. Webhook ditolak.");
        return NextResponse.json({ error: "Gateway not configured" }, { status: 503 });
      }
      console.warn("[Xendit Webhook] ⚠️ Webhook token tidak terkonfigurasi — dev/sandbox bypass aktif.");
    }

    if (storedTokens.length > 0) {
      if (!incomingToken) {
        return NextResponse.json({ status: "rejected", reason: "missing_callback_token" }, { status: 400 });
      }
      const isValid = storedTokens.some((token) => XenditGateway.verifyWebhookToken(incomingToken, token));
      if (!isValid) {
        console.warn("[Xendit Webhook] x-callback-token tidak valid — payload diabaikan untuk order:", orderId);
        return NextResponse.json({ status: "ignored", reason: "invalid_token" }, { status: 200 });
      }
    }

    // Log webhook ke database
    let webhookLogId = "";
    try {
      const log = await prisma.webhookLog.create({
        data: {
          source: "xendit",
          event: `status_${xenditStatus || "unknown"}`,
          payload: body,
          status: "received",
        },
      });
      webhookLogId = log.id;
    } catch (err) {
      logger.error("XenditWebhook", "Gagal merekam webhookLog ke database", err, { orderId });
    }

    const isPaid = xenditStatus === "PAID" || xenditStatus === "SETTLED";
    const isExpired = xenditStatus === "EXPIRED";

    // Validasi Gateway Ownership — tolak jika order sudah dipindah ke gateway lain
    try {
      const orderCheck = await prisma.order.findUnique({
        where: { id: orderId },
        select: { gatewayId: true } as any,
      });
      const gwId = (orderCheck as any)?.gatewayId as string | null;
      if (gwId && gwId !== "xendit") {
        console.warn(`[Xendit Webhook] Order ${orderId} gatewayId=${gwId}, bukan xendit — diabaikan.`);
        return NextResponse.json({ status: "ignored", reason: "gateway_mismatch" }, { status: 200 });
      }
    } catch (err) {
      console.error("[Xendit Webhook] Gagal memverifikasi gateway kepemilikan order:", err);
      return NextResponse.json({ error: "Database error during gateway verification" }, { status: 500 });
    }

    if (isPaid) {
      // Nominal yang dibayar harus sama dengan nominal yang ditagihkan saat init gateway
      const orderForAmount = await prisma.order.findUnique({
        where: { id: orderId },
        select: { amount: true, chargedAmount: true },
      });
      if (!orderForAmount) {
        return NextResponse.json({ error: "Order not found" }, { status: 404 });
      }
      const paidAmount = Number(body.paid_amount ?? body.amount);
      if (!isGatewayAmountValid(orderForAmount, paidAmount)) {
        logger.error("XenditWebhook", `Nominal tidak cocok, order ${orderId} tidak dilunasi.`, undefined, {
          orderId,
          paidAmount,
          chargedAmount: orderForAmount.chargedAmount?.toString() ?? null,
          amount: orderForAmount.amount.toString(),
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

      // Order sudah diproses sebelumnya — return idempotent
      if (!settled) {
        return NextResponse.json({ status: "ok", note: "already_processed" });
      }

      // Update webhook log
      if (webhookLogId) {
        await prisma.webhookLog.update({
          where: { id: webhookLogId },
          data: { status: "processed", processedAt: new Date() },
        }).catch((err) => logger.warn("XenditWebhook", "Gagal memperbarui status webhookLog", { orderId, error: String(err) }));
      }

      // Ambil planType untuk SSE emit
      const paidOrder = await prisma.order.findUnique({
        where: { id: orderId },
        select: { planType: true },
      });

      // Proses upgrade jika ini order UPGRADE
      await applyUpgradePlan(orderId);

      // Push notifikasi real-time ke browser klien via SSE
      paymentEmitter.emit(orderId, {
        status: "PAID",
        planType: paidOrder?.planType ?? "TIER_1",
      });

    } else if (isExpired) {
      const current = await prisma.order.findUnique({ where: { id: orderId }, select: { id: true, gatewayTxId: true } });
      if (current && isStaleGatewaySession(current, body.id)) {
        return NextResponse.json({ status: "ignored", reason: "stale_session" }, { status: 200 });
      }

      await prisma.order.updateMany({
        where: { id: orderId, status: "PENDING" },
        data: { status: "EXPIRED" },
      });

      // Lepaskan hold promo jika order kedaluwarsa
      await releaseOrderPromoHold(orderId);

      const expiredOrder = await prisma.order.findUnique({
        where: { id: orderId },
        select: { planType: true },
      });
      paymentEmitter.emit(orderId, {
        status: "EXPIRED",
        planType: expiredOrder?.planType ?? "TIER_1",
      });
    }

    return NextResponse.json({ status: "ok" });
  } catch (error: any) {
    console.error("[Xendit Webhook Error]", error);
    return NextResponse.json(
      {
        error:
          process.env.NODE_ENV === "production"
            ? "Internal server error"
            : error.message || "Internal server error",
      },
      { status: 500 }
    );
  }
}
