/**
 * Midtrans Payment Gateway
 * Docs: https://docs.midtrans.com
 *
 * Flow: Snap UI (hosted payment page)
 * Webhook: POST /api/webhook/midtrans
 * Signature: SHA512(orderId + statusCode + grossAmount + serverKey)
 */
import crypto from "crypto";
import { PaymentGateway } from "@/lib/gateways/types";
import { prisma } from "@/lib/prisma";

export class MidtransGateway implements PaymentGateway {
  private async getConfig() {
    let serverKey = process.env.MIDTRANS_SERVER_KEY || "";
    let clientKey = process.env.MIDTRANS_CLIENT_KEY || "";
    let mode = process.env.MIDTRANS_IS_PRODUCTION === "true" ? "production" : "sandbox";

    try {
      const settings = await prisma.adminSetting.findMany({ where: { group: "midtrans" } });
      const map: Record<string, string> = {};
      settings.forEach((s) => (map[s.key] = s.value));
      if (map["midtrans_server_key"]) serverKey = map["midtrans_server_key"];
      if (map["midtrans_client_key"]) clientKey = map["midtrans_client_key"];
      if (map["midtrans_mode"]) mode = map["midtrans_mode"];

      const globalModeSetting = await prisma.adminSetting.findUnique({
        where: { key: "payment_gateway_mode" },
      });
      if (globalModeSetting?.value) mode = globalModeSetting.value;
    } catch {}

    const snapUrl =
      mode === "production"
        ? "https://app.midtrans.com/snap/v1/transactions"
        : "https://app.sandbox.midtrans.com/snap/v1/transactions";

    const apiUrl =
      mode === "production"
        ? "https://api.midtrans.com/v2"
        : "https://api.sandbox.midtrans.com/v2";

    return { serverKey, clientKey, snapUrl, apiUrl };
  }

  async init(orderId: string, amount: number, appUrl?: string): Promise<{ checkoutUrl: string }> {
    const { serverKey, snapUrl } = await this.getConfig();

    if (!serverKey || serverKey.includes("your_")) {
      throw new Error("Midtrans belum dikonfigurasi. Isi Server Key di Admin → Pengaturan → Midtrans.");
    }

    // Ambil data buyer dari order
    let customerName = "Klien Undangan";
    let customerEmail = "no-reply@example.com";
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

    const basicAuth = Buffer.from(`${serverKey}:`).toString("base64");

    const response = await fetch(snapUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${basicAuth}`,
      },
      body: JSON.stringify({
        transaction_details: {
          order_id: orderId,
          gross_amount: amount,
        },
        customer_details: {
          first_name: customerName,
          email: customerEmail,
        },
        custom_expiry: {
          expiry_duration: expiryMinutes,
          unit: "minute",
        },
        callbacks: {
          finish: appUrl ? `${appUrl}/checkout/success?order=${orderId}` : undefined,
        },
      }),
    });

    const data = await response.json();
    if (!response.ok || !data?.redirect_url) {
      throw new Error(`Midtrans: ${data?.error_messages?.join(", ") || JSON.stringify(data)}`);
    }

    return { checkoutUrl: data.redirect_url };
  }

  async verify(reference: string): Promise<{ status: "PAID" | "FAILED" | "PENDING" }> {
    const { serverKey, apiUrl } = await this.getConfig();
    const basicAuth = Buffer.from(`${serverKey}:`).toString("base64");

    const response = await fetch(`${apiUrl}/${reference}/status`, {
      headers: { Authorization: `Basic ${basicAuth}` },
    });

    const data = await response.json();
    const trxStatus = data?.transaction_status;

    if (trxStatus === "settlement" || trxStatus === "capture") return { status: "PAID" };
    if (trxStatus === "expire" || trxStatus === "cancel" || trxStatus === "deny") return { status: "FAILED" };
    return { status: "PENDING" };
  }

  /** Verifikasi signature Midtrans webhook */
  static verifyWebhookSignature(payload: {
    order_id: string;
    status_code: string;
    gross_amount: string;
    signature_key: string;
    serverKey: string;
  }): boolean {
    const { order_id, status_code, gross_amount, signature_key, serverKey } = payload;
    const raw = `${order_id}${status_code}${gross_amount}${serverKey}`;
    const expected = crypto.createHash("sha512").update(raw).digest("hex");
    return expected === signature_key;
  }
}
