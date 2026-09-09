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

async function getXenditWebhookTokens(): Promise<string[]> {
  const tokens: string[] = [];
  if (process.env.XENDIT_WEBHOOK_TOKEN) tokens.push(process.env.XENDIT_WEBHOOK_TOKEN);
  try {
    const setting = await prisma.adminSetting.findUnique({
      where: { key: "xendit_webhook_token" },
    });
    if (setting?.value) tokens.push(setting.value);
  } catch {}
  return Array.from(new Set(tokens.filter((t) => t && !t.includes("your_"))));
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
      // Idempotency Guard: updateMany dengan filter status=PENDING — atomic check-and-set
      // Mencegah double-processing jika Xendit kirim webhook duplikat bersamaan
      const updated = await prisma.order.updateMany({
        where: { id: orderId, status: "PENDING" },
        data: {
          status: "PAID",
          paymentMethod: "GATEWAY",
          paymentGatewayRef: body.id || null,
          paidAt: new Date(),
        },
      });

      // Jika count=0, order sudah di-update sebelumnya — return idempotent
      if (updated.count === 0) {
        return NextResponse.json({ status: "ok", note: "already_processed" });
      }

      // Update webhook log
      if (webhookLogId) {
        await prisma.webhookLog.update({
          where: { id: webhookLogId },
          data: { status: "processed", processedAt: new Date() },
        }).catch(() => {});
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
        planType: paidOrder?.planType ?? "TRADITIONAL",
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
