import { DuitkuGateway } from "@/lib/gateways/duitku";
import { prisma } from "@/lib/prisma";
import { applyUpgradePlan } from "@/lib/upgradeHelper";
import { paymentEmitter } from "@/lib/paymentEvents";
import { NextRequest, NextResponse } from "next/server";

/**
 * Duitku Webhook (Callback) Handler
 * Docs: https://docs.duitku.com/api/id/#callback
 *
 * Duitku mengirim POST callback saat status transaksi berubah.
 * Payload utama:
 *   - merchantCode: kode merchant kita
 *   - amount: nominal transaksi
 *   - merchantOrderId: orderId yang kita kirim
 *   - resultCode: "00" = Sukses, "01" = Pending, "02" = Dibatalkan
 *   - signature: MD5(merchantCode + amount + merchantOrderId + apiKey)
 */

async function getDuitkuCredentials(): Promise<{ merchantCode: string; apiKey: string }> {
  let merchantCode = process.env.DUITKU_MERCHANT_CODE || "";
  let apiKey = process.env.DUITKU_API_KEY || "";
  try {
    const settings = await prisma.adminSetting.findMany({ where: { group: "duitku" } });
    const map: Record<string, string> = {};
    settings.forEach((s) => (map[s.key] = s.value));
    if (map["duitku_merchant_code"]) merchantCode = map["duitku_merchant_code"];
    if (map["duitku_api_key"]) apiKey = map["duitku_api_key"];
  } catch {}
  return { merchantCode, apiKey };
}

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();

    // Duitku mengirim form-urlencoded atau JSON — tangani keduanya
    let body: Record<string, string> = {};
    const contentType = req.headers.get("content-type") || "";
    if (contentType.includes("application/x-www-form-urlencoded")) {
      const params = new URLSearchParams(rawBody);
      params.forEach((value, key) => { body[key] = value; });
    } else {
      try { body = JSON.parse(rawBody); } catch {}
    }

    const orderId = body.merchantOrderId;
    const amount = body.amount;
    const incomingSignature = body.signature || "";
    const resultCode = body.resultCode;

    if (!orderId) {
      return NextResponse.json({ error: "Missing merchantOrderId" }, { status: 400 });
    }

    // Validasi format orderId (UUID v4)
    const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!UUID_REGEX.test(orderId)) {
      return NextResponse.json({ status: "ignored", reason: "invalid_order_id_format" }, { status: 200 });
    }

    // Verifikasi signature Duitku: MD5(merchantCode + amount + orderId + apiKey)
    const { merchantCode, apiKey } = await getDuitkuCredentials();
    const isConfigured = merchantCode && apiKey && !apiKey.includes("your_");

    if (isConfigured) {
      if (!incomingSignature) {
        return NextResponse.json({ status: "rejected", reason: "missing_signature" }, { status: 400 });
      }
      const isValid = DuitkuGateway.verifyWebhookSignature(
        merchantCode,
        amount,
        orderId,
        apiKey,
        incomingSignature
      );
      if (!isValid) {
        console.warn("[Duitku Webhook] Signature tidak valid — payload diabaikan untuk order:", orderId);
        return NextResponse.json({ status: "ignored", reason: "invalid_signature" }, { status: 200 });
      }
    }

    // Log webhook ke database
    let webhookLogId = "";
    try {
      const log = await prisma.webhookLog.create({
        data: {
          source: "duitku",
          event: `resultCode_${resultCode || "unknown"}`,
          payload: body,
          status: "received",
        },
      });
      webhookLogId = log.id;
    } catch {}

    // resultCode: "00" = Sukses, "01" = Pending, "02" = Dibatalkan
    const isPaid = resultCode === "00";
    const isFailed = resultCode === "02";

    if (isPaid) {
      let existingOrder: { status: string; planType: string } | null = null;

      await prisma.$transaction(async (tx) => {
        existingOrder = await tx.order.findUnique({
          where: { id: orderId },
          select: { status: true, planType: true },
        });

        if (!existingOrder) throw new Error("Order not found");
        if (existingOrder.status === "PAID") return;

        await tx.order.update({
          where: { id: orderId },
          data: {
            status: "PAID",
            paymentMethod: "GATEWAY",
            paymentGatewayRef: body.reference || body.trxId || null,
            paidAt: new Date(),
          },
        });

        if (webhookLogId) {
          await tx.webhookLog.update({
            where: { id: webhookLogId },
            data: { status: "processed", processedAt: new Date() },
          }).catch(() => {});
        }
      });

      if (!existingOrder || (existingOrder as { status: string }).status === "PAID") {
        return NextResponse.json({ status: "ok", note: "already_paid" });
      }

      await applyUpgradePlan(orderId);

      paymentEmitter.emit(orderId, {
        status: "PAID",
        planType: (existingOrder as { planType: string }).planType,
      });

    } else if (isFailed) {
      await prisma.order.updateMany({
        where: { id: orderId, status: "PENDING" },
        data: { status: "EXPIRED" },
      });

      const expiredOrder = await prisma.order.findUnique({
        where: { id: orderId },
        select: { planType: true },
      });
      paymentEmitter.emit(orderId, {
        status: "EXPIRED",
        planType: expiredOrder?.planType ?? "PREMIUM",
      });
    }

    return NextResponse.json({ status: "ok" });
  } catch (error: any) {
    console.error("[Duitku Webhook Error]", error);
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
