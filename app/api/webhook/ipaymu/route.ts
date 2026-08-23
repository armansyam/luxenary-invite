import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

/**
 * iPaymu Webhook Handler
 * Payload iPaymu berisi: status_code, reference_id, trx_id, amount, paid_status
 * paid_status: 1 = PAID, 6 = PENDING, 2 = FAILED/EXPIRED
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Log semua webhook yang masuk ke database
    try {
      await prisma.webhookLog.create({
        data: {
          source: "ipaymu",
          event: `status_${body.status_code || body.paid_status || "unknown"}`,
          payload: body,
          status: "received",
        },
      });
    } catch {
      // Log error tidak menghentikan proses webhook
    }

    // referenceId = orderId yang kita kirim saat checkout
    const orderId = body.reference_id || body.referenceId || body.reference;
    if (!orderId) {
      return NextResponse.json({ error: "Missing reference_id" }, { status: 400 });
    }

    // paid_status: 1 = PAID, 2 = FAILED, 6 = PENDING
    const paidStatus = Number(body.paid_status ?? body.status_code ?? 0);

    if (paidStatus === 1) {
      // Payment berhasil — update order dan publish undangan
      const order = await prisma.order.findUnique({ where: { id: orderId } });
      if (!order) {
        return NextResponse.json({ error: "Order not found" }, { status: 404 });
      }

      await prisma.order.update({
        where: { id: orderId },
        data: {
          status: "PAID",
          paymentGatewayRef: body.trx_id || body.sid || null,
          paidAt: new Date(),
        },
      });

      // Publish undangan terkait jika ada
      try {
        await prisma.invitation.update({
          where: { orderId },
          data: { status: "PUBLISHED", publishedAt: new Date() },
        });
      } catch {
        // Mungkin undangan belum dibuat — oke
      }

      // Update webhook log ke processed
      try {
        await prisma.webhookLog.updateMany({
          where: { source: "ipaymu", status: "received" },
          data: { status: "processed", processedAt: new Date() },
        });
      } catch {}

    } else if (paidStatus === 2) {
      // Payment gagal/expired
      await prisma.order.updateMany({
        where: { id: orderId, status: "PENDING" },
        data: { status: "FAILED" },
      });
    }

    return NextResponse.json({ status: "ok" });
  } catch (error: any) {
    console.error("[iPaymu Webhook Error]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
