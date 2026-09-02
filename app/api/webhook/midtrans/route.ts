import { MidtransGateway } from "@/lib/gateways/midtrans";
import { prisma } from "@/lib/prisma";
import { applyUpgradePlan } from "@/lib/upgradeHelper";
import { paymentEmitter } from "@/lib/paymentEvents";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const body = JSON.parse(rawBody);

    const orderId = body.order_id;
    const statusCode = body.status_code;
    const grossAmount = body.gross_amount;
    const signatureKey = body.signature_key;
    const trxStatus = body.transaction_status;
    const fraudStatus = body.fraud_status;

    if (!orderId) {
      return NextResponse.json({ error: "Missing order_id" }, { status: 400 });
    }

    // Ambil server key dari AdminSetting atau env
    let serverKey = process.env.MIDTRANS_SERVER_KEY || "";
    try {
      const setting = await prisma.adminSetting.findUnique({ where: { key: "midtrans_server_key" } });
      if (setting?.value) serverKey = setting.value;
    } catch {}

    // Validasi format orderId (harus UUID v4 — mencegah query sia-sia dengan input sembarang)
    const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!UUID_REGEX.test(orderId)) {
      return NextResponse.json({ status: "ignored", reason: "invalid_order_id_format" }, { status: 200 });
    }

    // Verifikasi Signature — WAJIB jika server key terkonfigurasi
    if (serverKey && !serverKey.includes("your_")) {
      // Jika server key ada tapi signatureKey tidak dikirim — tolak (kemungkinan payload palsu)
      if (!signatureKey) {
        console.warn("[Midtrans Webhook] Payload tanpa signature_key ditolak untuk order:", orderId);
        return NextResponse.json({ status: "rejected", reason: "missing_signature" }, { status: 400 });
      }

      const isValid = MidtransGateway.verifyWebhookSignature({
        order_id: orderId,
        status_code: statusCode,
        gross_amount: grossAmount,
        signature_key: signatureKey,
        serverKey,
      });

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
    } catch {}

    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Validasi Gateway Ownership — tolak jika order sudah dipindah ke gateway lain
    // Contoh: admin switch dari Midtrans ke iPaymu, lalu Midtrans kirim webhook telat
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
      await prisma.$transaction(async (tx) => {
        await tx.order.update({
          where: { id: orderId },
          data: {
            status: "PAID",
            paymentMethod: "GATEWAY",
            paymentGatewayRef: body.transaction_id || null,
            paidAt: new Date(),
          },
        });

        if (webhookLogId) {
          await tx.webhookLog.update({
            where: { id: webhookLogId },
            data: { status: "processed", processedAt: new Date() },
          });
        }
      });

      // If this is an UPGRADE order, update planType on the linked original order
      await applyUpgradePlan(orderId);

      // Push notifikasi real-time ke browser klien via SSE
      paymentEmitter.emit(orderId, { status: "PAID", planType: order.planType });

    } else if (trxStatus === "expire" || trxStatus === "cancel" || trxStatus === "deny") {
      await prisma.order.updateMany({
        where: { id: orderId, status: "PENDING" },
        data: { status: "EXPIRED" },
      });

      // Push notifikasi real-time ke browser klien via SSE
      paymentEmitter.emit(orderId, { status: "EXPIRED", planType: order.planType });
    }

    return NextResponse.json({ status: "ok" });
  } catch (error: any) {
    console.error("[Midtrans Webhook Error]", error);
    return NextResponse.json({ error: process.env.NODE_ENV === "production" ? "Internal server error" : (error.message || "Internal server error") }, { status: 500 });
  }
}

