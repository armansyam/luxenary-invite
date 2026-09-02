import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { paymentEmitter } from "@/lib/paymentEvents";
import { applyUpgradePlan } from "@/lib/upgradeHelper";
import { NextRequest, NextResponse } from "next/server";

/**
 * iPaymu Webhook Handler
 * Payload iPaymu berisi: status_code, reference_id, trx_id, amount, paid_status
 * paid_status: 1 = PAID, 6 = PENDING, 2 = FAILED/EXPIRED
 *
 * FIX #3: Verifikasi tanda tangan HMAC dari iPaymu sebelum memproses payload.
 * Format signature iPaymu: SHA256(VA:ApiKey:SHA256(bodyRaw):timestamp)
 * Header yang dikirim iPaymu: signature, va, timestamp
 */
async function getIPaymuCredentials(): Promise<{ va: string; apiKey: string }> {
  let va = process.env.IPAYMU_VA || "";
  let apiKey = process.env.IPAYMU_API_KEY || "";
  try {
    const settings = await prisma.adminSetting.findMany({ where: { group: "ipaymu" } });
    const map: Record<string, string> = {};
    settings.forEach((s) => (map[s.key] = s.value));
    if (map["ipaymu_va"]) va = map["ipaymu_va"];
    if (map["ipaymu_api_key"]) apiKey = map["ipaymu_api_key"];
  } catch {}
  return { va, apiKey };
}

function verifyIPaymuSignature(
  incomingSignature: string,
  va: string,
  apiKey: string,
  rawBody: string,
  timestamp: string
): boolean {
  try {
    const bodyHash = crypto.createHash("sha256").update(rawBody).digest("hex").toLowerCase();
    const toSign = `POST:${va}:${bodyHash}:${apiKey}:${timestamp}`;
    const expected = crypto.createHmac("sha256", apiKey).update(toSign).digest("hex");
    const bufExpected = Buffer.from(expected);
    const bufIncoming = Buffer.from(incomingSignature);
    if (bufExpected.length !== bufIncoming.length) return false;
    return crypto.timingSafeEqual(bufExpected, bufIncoming);
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  try {
    // Baca raw body terlebih dahulu untuk verifikasi signature
    const rawBody = await req.text();
    const body = JSON.parse(rawBody);

    // FIX #3: Verifikasi signature iPaymu
    const incomingSignature = req.headers.get("signature") || "";
    const incomingVa = req.headers.get("va") || "";
    const incomingTimestamp = req.headers.get("timestamp") || "";

    const { va, apiKey } = await getIPaymuCredentials();
    const isConfigured = va && apiKey && va !== "0000000000000000" && apiKey !== "your_ipaymu_api_key";

    if (isConfigured) {
      if (!incomingSignature) {
        return NextResponse.json({ status: "ignored", reason: "missing_signature" }, { status: 400 });
      }
      const isValid = verifyIPaymuSignature(incomingSignature, va, apiKey, rawBody, incomingTimestamp);
      if (!isValid) {
        console.warn("[iPaymu Webhook] Signature tidak valid — payload diabaikan");
        // Return 200 untuk mencegah iPaymu retry tak henti (tapi tidak diproses)
        return NextResponse.json({ status: "ignored", reason: "invalid_signature" });
      }
    }

    // Log semua webhook yang masuk ke database
    let webhookLogId = null;
    try {
      const log = await prisma.webhookLog.create({
        data: {
          source: "ipaymu",
          event: `status_${body.status_code || body.paid_status || "unknown"}`,
          payload: body,
          status: "received",
        },
      });
      webhookLogId = log.id;
    } catch {
      // Log error tidak menghentikan proses webhook
    }

    // referenceId = orderId yang kita kirim saat checkout
    const orderId = body.reference_id || body.referenceId || body.reference;
    if (!orderId) {
      return NextResponse.json({ error: "Missing reference_id" }, { status: 400 });
    }

    // Validasi Gateway Ownership — tolak jika order sudah dipindah ke gateway lain
    try {
      const orderCheck = await prisma.order.findUnique({
        where: { id: orderId },
        select: { gatewayId: true } as any,
      });
      const gwId = (orderCheck as any)?.gatewayId as string | null;
      if (gwId && gwId !== "ipaymu") {
        console.warn(`[iPaymu Webhook] Order ${orderId} gatewayId=${gwId}, bukan ipaymu — diabaikan.`);
        return NextResponse.json({ status: "ignored", reason: "gateway_mismatch" }, { status: 200 });
      }
    } catch {}

    // paid_status: 1 = PAID, 2 = FAILED/Expired, 6 = PENDING
    const paidStatus = Number(body.paid_status ?? body.status_code ?? 0);

    if (paidStatus === 1) {
      // Payment berhasil — update order secara atomic dalam satu $transaction
      // Idempotency + update dilakukan atomik untuk mencegah double-processing race condition
      let order: { status: string; planType: string } | null = null;

      await prisma.$transaction(async (tx) => {
        order = await tx.order.findUnique({
          where: { id: orderId },
          select: { status: true, planType: true },
        });

        if (!order) throw new Error("Order not found");
        // Idempotency: abaikan jika sudah PAID (throw agar rollback tapi kita handle di luar)
        if (order.status === "PAID") return;

        await tx.order.update({
          where: { id: orderId },
          data: {
            status: "PAID",
            paymentMethod: "GATEWAY",
            paymentGatewayRef: body.trx_id || body.sid || null,
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

      // Jika sudah PAID sebelumnya, return tanpa lakukan applyUpgrade / emit SSE
      if (!order || (order as { status: string }).status === "PAID") {
        return NextResponse.json({ status: "ok", note: "already_paid" });
      }

      // If this is an UPGRADE order, update planType on the linked original order
      await applyUpgradePlan(orderId);

      // Push notifikasi real-time ke browser klien via SSE
      paymentEmitter.emit(orderId, { status: "PAID", planType: (order as { planType: string }).planType });

    } else if (
      paidStatus === 2 ||
      paidStatus === -2 ||
      body.status_code === -2 ||
      body.status_code === 2 ||
      body.status?.toLowerCase() === "expired" ||
      body.status?.toLowerCase() === "batal" ||
      body.status?.toLowerCase() === "cancel"
    ) {
      // Payment expired/dibatalkan di gateway iPaymu
      await prisma.order.updateMany({
        where: { id: orderId, status: "PENDING" },
        data: { status: "EXPIRED" },
      });

      // Push notifikasi real-time ke browser klien via SSE
      // Ambil planType dari order yang baru saja di-expire
      const expiredOrder = await prisma.order.findUnique({
        where: { id: orderId },
        select: { planType: true },
      });
      paymentEmitter.emit(orderId, { status: "EXPIRED", planType: expiredOrder?.planType ?? "PREMIUM" });
    }

    return NextResponse.json({ status: "ok" });
  } catch (error: any) {
    console.error("[iPaymu Webhook Error]", error);
    return NextResponse.json({ error: process.env.NODE_ENV === "production" ? "Terjadi kesalahan server" : error.message }, { status: 500 });
  }
}
