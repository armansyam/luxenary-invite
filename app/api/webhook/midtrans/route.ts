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
        where: { group: "midtrans" },
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
      if (dbClientKey && (dbClientKey.startsWith("Mid-server-") || dbClientKey.startsWith("SB-Mid-server-"))) {
        serverKeys.push(dbClientKey);
      }
    } catch {}

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
      // Idempotency Guard: gunakan updateMany dengan filter status=PENDING untuk atomic check-and-set
      // Mencegah double-processing jika Midtrans kirim webhook duplikat bersamaan
      const updated = await prisma.order.updateMany({
        where: { id: orderId, status: "PENDING" },
        data: {
          status: "PAID",
          paymentMethod: "GATEWAY",
          paymentGatewayRef: body.transaction_id || null,
          paidAt: new Date(),
        },
      });

      // Jika count=0, order sudah di-update oleh webhook sebelumnya — return idempotent
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

