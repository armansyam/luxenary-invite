import { TripayGateway } from "@/lib/gateways/tripay";
import { prisma } from "@/lib/prisma";
import { applyUpgradePlan } from "@/lib/upgradeHelper";
import { paymentEmitter } from "@/lib/paymentEvents";
import { NextRequest, NextResponse } from "next/server";

/**
 * Tripay Webhook (Callback) Handler
 * Docs: https://tripay.co.id/developer#callback
 *
 * Tripay mengirim POST callback saat status transaksi berubah.
 * Verifikasi via HMAC-SHA256 signature dari header X-Callback-Signature.
 *
 * Payload utama:
 *   - merchant_ref: orderId yang kita kirim
 *   - reference: Tripay reference number
 *   - status: "PAID" | "UNPAID" | "FAILED" | "REFUND" | "EXPIRED"
 *   - signature: HMAC-SHA256(rawBody, privateKey)
 */

async function getTripayPrivateKey(): Promise<string> {
  let privateKey = process.env.TRIPAY_PRIVATE_KEY || "";
  try {
    const setting = await prisma.adminSetting.findUnique({
      where: { key: "tripay_private_key" },
    });
    if (setting?.value) privateKey = setting.value;
  } catch {}
  return privateKey;
}

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const body = JSON.parse(rawBody);

    const orderId = body.merchant_ref;
    const tripayStatus = body.status;
    const incomingSignature = req.headers.get("X-Callback-Signature") || "";

    if (!orderId) {
      return NextResponse.json({ error: "Missing merchant_ref" }, { status: 400 });
    }

    // Validasi format orderId (UUID v4)
    const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!UUID_REGEX.test(orderId)) {
      return NextResponse.json({ status: "ignored", reason: "invalid_order_id_format" }, { status: 200 });
    }

    // Verifikasi HMAC-SHA256 signature dari Tripay
    const privateKey = await getTripayPrivateKey();
    const isConfigured = privateKey && !privateKey.includes("your_");

    if (isConfigured) {
      if (!incomingSignature) {
        return NextResponse.json({ status: "rejected", reason: "missing_signature" }, { status: 400 });
      }
      const isValid = TripayGateway.verifyWebhookSignature(rawBody, privateKey, incomingSignature);
      if (!isValid) {
        console.warn("[Tripay Webhook] Signature tidak valid — payload diabaikan untuk order:", orderId);
        return NextResponse.json({ status: "ignored", reason: "invalid_signature" }, { status: 200 });
      }
    }

    // Log webhook ke database
    let webhookLogId = "";
    try {
      const log = await prisma.webhookLog.create({
        data: {
          source: "tripay",
          event: `status_${tripayStatus || "unknown"}`,
          payload: body,
          status: "received",
        },
      });
      webhookLogId = log.id;
    } catch {}

    const isPaid = tripayStatus === "PAID";
    const isFailed =
      tripayStatus === "FAILED" ||
      tripayStatus === "EXPIRED" ||
      tripayStatus === "REFUND";

    // Validasi Gateway Ownership — tolak jika order sudah dipindah ke gateway lain
    try {
      const orderCheck = await prisma.order.findUnique({
        where: { id: orderId },
        select: { gatewayId: true } as any,
      });
      const gwId = (orderCheck as any)?.gatewayId as string | null;
      if (gwId && gwId !== "tripay") {
        console.warn(`[Tripay Webhook] Order ${orderId} gatewayId=${gwId}, bukan tripay — diabaikan.`);
        return NextResponse.json({ status: "ignored", reason: "gateway_mismatch" }, { status: 200 });
      }
    } catch {}

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
            paymentGatewayRef: body.reference || null,
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
    console.error("[Tripay Webhook Error]", error);
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
