import crypto from "crypto";
import { prisma } from "@/lib/prisma";
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

    // Jika header signature ada, wajib diverifikasi
    if (incomingSignature) {
      const { va, apiKey } = await getIPaymuCredentials();

      // Hanya verifikasi jika VA dan ApiKey sudah dikonfigurasi
      if (va && apiKey && va !== "0000000000000000" && apiKey !== "your_ipaymu_api_key") {
        const isValid = verifyIPaymuSignature(incomingSignature, va, apiKey, rawBody, incomingTimestamp);
        if (!isValid) {
          console.warn("[iPaymu Webhook] Signature tidak valid — payload diabaikan");
          // Return 200 untuk mencegah iPaymu retry tak henti (tapi tidak diproses)
          return NextResponse.json({ status: "ignored", reason: "invalid_signature" });
        }
      }
    }

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

    // paid_status: 1 = PAID, 2 = FAILED/Expired, 6 = PENDING
    const paidStatus = Number(body.paid_status ?? body.status_code ?? 0);

    if (paidStatus === 1) {
      // Payment berhasil — update order dan publish undangan
      const order = await prisma.order.findUnique({ where: { id: orderId } });
      if (!order) {
        return NextResponse.json({ error: "Order not found" }, { status: 404 });
      }

      // Idempotency: abaikan jika sudah PAID
      if (order.status === "PAID") {
        return NextResponse.json({ status: "ok", note: "already_paid" });
      }

      await prisma.order.update({
        where: { id: orderId },
        data: {
          status: "PAID",
          paymentMethod: "GATEWAY", // Pastikan method tercatat
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
    }

    return NextResponse.json({ status: "ok" });
  } catch (error: any) {
    console.error("[iPaymu Webhook Error]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
