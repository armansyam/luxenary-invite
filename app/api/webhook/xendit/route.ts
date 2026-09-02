import { XenditGateway } from "@/lib/gateways/xendit";
import { prisma } from "@/lib/prisma";
import { applyUpgradePlan } from "@/lib/upgradeHelper";
import { paymentEmitter } from "@/lib/paymentEvents";
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

async function getXenditWebhookToken(): Promise<string> {
  let token = process.env.XENDIT_WEBHOOK_TOKEN || "";
  try {
    const setting = await prisma.adminSetting.findUnique({
      where: { key: "xendit_webhook_token" },
    });
    if (setting?.value) token = setting.value;
  } catch {}
  return token;
}

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const body = JSON.parse(rawBody);

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
    const storedToken = await getXenditWebhookToken();

    if (storedToken && !storedToken.includes("your_")) {
      if (!incomingToken) {
        return NextResponse.json({ status: "rejected", reason: "missing_callback_token" }, { status: 400 });
      }
      const isValid = XenditGateway.verifyWebhookToken(incomingToken, storedToken);
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
    } catch {}

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
    } catch {}

    if (isPaid) {
      // Atomic: cek idempotency + update dalam satu $transaction
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
            paymentGatewayRef: body.id || null,
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

      // Jika sudah PAID sebelumnya, return idempotent
      if (!existingOrder || (existingOrder as { status: string }).status === "PAID") {
        return NextResponse.json({ status: "ok", note: "already_paid" });
      }

      // Proses upgrade jika ini order UPGRADE
      await applyUpgradePlan(orderId);

      // Push notifikasi real-time ke browser klien via SSE
      paymentEmitter.emit(orderId, {
        status: "PAID",
        planType: (existingOrder as { planType: string }).planType,
      });

    } else if (isExpired) {
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
