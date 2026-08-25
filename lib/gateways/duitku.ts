/**
 * Duitku Payment Gateway
 * Docs: https://docs.duitku.com
 *
 * Flow: Redirect ke halaman pembayaran Duitku
 * Webhook: POST /api/webhook/duitku
 * Signature: MD5(merchantCode + amount + merchantOrderId + apiKey)
 */
import crypto from "crypto";
import { PaymentGateway } from "@/lib/gateways/types";
import { prisma } from "@/lib/prisma";

export class DuitkuGateway implements PaymentGateway {
  private async getConfig() {
    let merchantCode = process.env.DUITKU_MERCHANT_CODE || "";
    let apiKey = process.env.DUITKU_API_KEY || "";
    let mode = "sandbox";

    try {
      const settings = await prisma.adminSetting.findMany({ where: { group: "duitku" } });
      const map: Record<string, string> = {};
      settings.forEach((s) => (map[s.key] = s.value));
      if (map["duitku_merchant_code"]) merchantCode = map["duitku_merchant_code"];
      if (map["duitku_api_key"]) apiKey = map["duitku_api_key"];
      if (map["duitku_mode"]) mode = map["duitku_mode"];
    } catch {}

    const baseUrl =
      mode === "production"
        ? "https://passport.duitku.com/webapi/api/merchant/v2"
        : "https://sandbox.duitku.com/webapi/api/merchant/v2";

    return { merchantCode, apiKey, baseUrl, mode };
  }

  async init(orderId: string, amount: number, appUrl?: string): Promise<{ checkoutUrl: string }> {
    const { merchantCode, apiKey, baseUrl } = await this.getConfig();

    if (!merchantCode || !apiKey || apiKey.includes("your_")) {
      throw new Error("Duitku belum dikonfigurasi. Isi Merchant Code & API Key di Admin → Pengaturan → Duitku.");
    }

    // Signature: MD5(merchantCode + amount + orderId + apiKey)
    const signature = crypto
      .createHash("md5")
      .update(`${merchantCode}${amount}${orderId}${apiKey}`)
      .digest("hex");

    // Ambil data buyer dari order
    let customerName = "Klien Luxenary";
    let customerEmail = "client@luxenary.id";
    try {
      const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: { user: { select: { name: true, email: true } } },
      });
      if (order?.user?.name) customerName = order.user.name;
      if (order?.user?.email) customerEmail = order.user.email;
    } catch {}

    // Baca masa kedaluwarsa QRIS dari admin setting (dalam menit)
    let expiryMinutes = 60;
    try {
      const expirySetting = await prisma.adminSetting.findUnique({ where: { key: "payment_expiry_minutes" } });
      if (expirySetting && !isNaN(Number(expirySetting.value))) {
        expiryMinutes = Math.max(5, Math.min(1440, Number(expirySetting.value)));
      }
    } catch {}

    const expiryPeriod = expiryMinutes; // dalam menit

    const response = await fetch(`${baseUrl}/inquiry`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        merchantCode,
        paymentAmount: amount,
        merchantOrderId: orderId,
        productDetails: `Luxenary Invite — Order ${orderId.slice(-6).toUpperCase()}`,
        email: customerEmail,
        additionalParam: "",
        merchantUserInfo: customerName,
        customerVaName: customerName,
        callbackUrl: appUrl ? `${appUrl}/api/webhook/duitku` : "",
        returnUrl: appUrl ? `${appUrl}/checkout/success?order=${orderId}` : "",
        expiryPeriod,
        signature,
      }),
    });

    const data = await response.json();

    if (!response.ok || !data?.paymentUrl) {
      throw new Error(`Duitku: ${data?.message || JSON.stringify(data)}`);
    }

    return { checkoutUrl: data.paymentUrl };
  }

  async verify(reference: string): Promise<{ status: "PAID" | "FAILED" | "PENDING" }> {
    const { merchantCode, apiKey, baseUrl } = await this.getConfig();

    const timestamp = Math.floor(Date.now() / 1000).toString();
    const signature = crypto
      .createHash("md5")
      .update(`${merchantCode}${timestamp}${apiKey}`)
      .digest("hex");

    const response = await fetch(`${baseUrl}/transactionStatus`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        merchantCode,
        merchantOrderId: reference,
        signature,
        timestamp,
      }),
    });

    const data = await response.json();

    // Duitku status: 00=PAID, 01=PENDING, 02=CANCELLED
    if (data?.statusCode === "00") return { status: "PAID" };
    if (data?.statusCode === "02") return { status: "FAILED" };
    return { status: "PENDING" };
  }

  /** Verifikasi signature webhook Duitku */
  static verifyWebhookSignature(
    merchantCode: string,
    amount: string,
    orderId: string,
    apiKey: string,
    incomingSignature: string
  ): boolean {
    const expected = crypto
      .createHash("md5")
      .update(`${merchantCode}${amount}${orderId}${apiKey}`)
      .digest("hex");
    return expected === incomingSignature;
  }
}
