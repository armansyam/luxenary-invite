/**
 * Tripay Payment Gateway
 * Docs: https://tripay.co.id/developer
 *
 * Flow: Redirect ke halaman pembayaran Tripay (Close Payment / Open Payment)
 * Webhook: POST /api/webhook/tripay
 * Signature: HMAC-SHA256(merchantCode + orderId + amount, privateKey)
 */
import crypto from "crypto";
import { PaymentGateway } from "@/lib/gateways/types";
import { prisma } from "@/lib/prisma";

export class TripayGateway implements PaymentGateway {
  private async getConfig() {
    let apiKey = process.env.TRIPAY_API_KEY || "";
    let privateKey = process.env.TRIPAY_PRIVATE_KEY || "";
    let merchantCode = process.env.TRIPAY_MERCHANT_CODE || "";
    let mode = "sandbox";

    try {
      const settings = await prisma.adminSetting.findMany({ where: { group: "tripay" } });
      const map: Record<string, string> = {};
      settings.forEach((s) => (map[s.key] = s.value));
      if (map["tripay_api_key"]) apiKey = map["tripay_api_key"];
      if (map["tripay_private_key"]) privateKey = map["tripay_private_key"];
      if (map["tripay_merchant_code"]) merchantCode = map["tripay_merchant_code"];
      if (map["tripay_mode"]) mode = map["tripay_mode"];

      const globalModeSetting = await prisma.adminSetting.findUnique({
        where: { key: "payment_gateway_mode" },
      });
      if (globalModeSetting?.value) mode = globalModeSetting.value;
    } catch {}

    const baseUrl =
      mode === "production"
        ? "https://tripay.co.id/api"
        : "https://tripay.co.id/api-sandbox";

    return { apiKey, privateKey, merchantCode, baseUrl, mode };
  }

  async init(orderId: string, amount: number, appUrl?: string): Promise<{ checkoutUrl: string }> {
    const { apiKey, privateKey, merchantCode, baseUrl } = await this.getConfig();

    if (!apiKey || !privateKey || !merchantCode || apiKey.includes("your_")) {
      throw new Error("Tripay belum dikonfigurasi. Isi API Key, Private Key, dan Merchant Code di Admin → Pengaturan → Tripay.");
    }

    // Signature: HMAC-SHA256(merchantCode + orderId + amount, privateKey)
    const signature = crypto
      .createHmac("sha256", privateKey)
      .update(`${merchantCode}${orderId}${amount}`)
      .digest("hex");

    // Ambil data buyer dari order
    let customerName = "Klien Luxenary";
    let customerEmail = "client@luxenary.id";
    let customerPhone = "08000000000";
    try {
      const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: { user: { select: { name: true, email: true } } },
      });
      if (order?.user?.name) customerName = order.user.name;
      if (order?.user?.email) customerEmail = order.user.email;
    } catch {}

    // Baca masa kedaluwarsa QRIS & prefix judul dari admin setting
    let expiryMinutes = 60;
    let invoicePrefix = "Luxenary Invite";
    try {
      const expirySetting = await prisma.adminSetting.findUnique({ where: { key: "payment_expiry_minutes" } });
      if (expirySetting && !isNaN(Number(expirySetting.value))) {
        expiryMinutes = Math.max(5, Math.min(1440, Number(expirySetting.value)));
      }
      const prefixSetting = await prisma.adminSetting.findUnique({ where: { key: "payment_invoice_prefix" } });
      if (prefixSetting?.value) invoicePrefix = prefixSetting.value;
    } catch {}

    const expiredTime = Math.floor(Date.now() / 1000) + expiryMinutes * 60;

    const response = await fetch(`${baseUrl}/transaction/create`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        method: "QRIS",                  // Default QRIS; bisa diubah ke BRIVA, MANDIRIVA, dll
        merchant_ref: orderId,
        amount,
        customer_name: customerName,
        customer_email: customerEmail,
        customer_phone: customerPhone,
        order_items: [
          {
            name: `${invoicePrefix} — ${orderId.slice(-6).toUpperCase()}`,
            price: amount,
            quantity: 1,
          },
        ],
        callback_url: appUrl ? `${appUrl}/api/webhook/tripay` : "",
        return_url: appUrl ? `${appUrl}/checkout/success?order=${orderId}` : "",
        expired_time: expiredTime,
        signature,
      }),
    });

    const data = await response.json();

    if (!response.ok || !data?.data?.checkout_url) {
      throw new Error(`Tripay: ${data?.message || JSON.stringify(data)}`);
    }

    return { checkoutUrl: data.data.checkout_url };
  }

  async verify(reference: string): Promise<{ status: "PAID" | "FAILED" | "PENDING" }> {
    const { apiKey, baseUrl } = await this.getConfig();

    const response = await fetch(`${baseUrl}/transaction/detail?reference=${reference}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });

    const data = await response.json();
    const trxStatus = data?.data?.status;

    // Tripay status: PAID, UNPAID, FAILED, REFUND, EXPIRED
    if (trxStatus === "PAID") return { status: "PAID" };
    if (trxStatus === "FAILED" || trxStatus === "EXPIRED" || trxStatus === "REFUND") return { status: "FAILED" };
    return { status: "PENDING" };
  }

  /** Verifikasi signature webhook Tripay */
  static verifyWebhookSignature(
    rawBody: string,
    privateKey: string,
    incomingSignature: string
  ): boolean {
    const expected = crypto
      .createHmac("sha256", privateKey)
      .update(rawBody)
      .digest("hex");
    try {
      return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(incomingSignature));
    } catch {
      return false;
    }
  }
}
