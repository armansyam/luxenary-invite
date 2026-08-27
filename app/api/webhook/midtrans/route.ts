import { MidtransGateway } from "@/lib/gateways/midtrans";
import { prisma } from "@/lib/prisma";
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

    // Verifikasi Signature jika signature_key dikirimkan & serverKey telah dikonfigurasi
    if (signatureKey && serverKey && !serverKey.includes("your_")) {
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

    } else if (trxStatus === "expire" || trxStatus === "cancel" || trxStatus === "deny") {
      await prisma.order.updateMany({
        where: { id: orderId, status: "PENDING" },
        data: { status: "EXPIRED" },
      });
    }

    return NextResponse.json({ status: "ok" });
  } catch (error: any) {
    console.error("[Midtrans Webhook Error]", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}

