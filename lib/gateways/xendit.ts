/**
 * Xendit Payment Gateway
 * Docs: https://developers.xendit.co
 *
 * Flow: Invoice-based (hosted payment page)
 * Webhook: POST /api/webhook/xendit
 * Signature: x-callback-token header (static secret dari dashboard Xendit)
 */
import { PaymentGateway } from "@/lib/gateways/types";
import { prisma } from "@/lib/prisma";

export class XenditGateway implements PaymentGateway {
  private async getConfig() {
    let apiKey = process.env.XENDIT_API_KEY || "";
    let webhookToken = process.env.XENDIT_WEBHOOK_TOKEN || "";
    let mode = "production"; // Xendit tidak ada sandbox terpisah — gunakan test API key

    try {
      const settings = await prisma.adminSetting.findMany({ where: { group: "xendit" } });
      const map: Record<string, string> = {};
      settings.forEach((s) => (map[s.key] = s.value));
      if (map["xendit_api_key"]) apiKey = map["xendit_api_key"];
      if (map["xendit_webhook_token"]) webhookToken = map["xendit_webhook_token"];
      if (map["xendit_mode"]) mode = map["xendit_mode"];
    } catch {}

    const baseUrl = "https://api.xendit.co";
    return { apiKey, webhookToken, baseUrl, mode };
  }

  async init(orderId: string, amount: number, appUrl?: string): Promise<{ checkoutUrl: string }> {
    const { apiKey, baseUrl } = await this.getConfig();

    if (!apiKey || apiKey.includes("your_")) {
      throw new Error("Xendit belum dikonfigurasi. Isi API Key di Admin → Pengaturan → Xendit.");
    }

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

    const expiryDate = new Date(Date.now() + expiryMinutes * 60 * 1000).toISOString();
    const invoiceDuration = expiryMinutes * 60; // dalam detik

    const basicAuth = Buffer.from(`${apiKey}:`).toString("base64");

    const response = await fetch(`${baseUrl}/v2/invoices`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${basicAuth}`,
      },
      body: JSON.stringify({
        external_id: orderId,
        amount,
        description: `${invoicePrefix} — Order ${orderId.slice(-6).toUpperCase()}`,
        invoice_duration: invoiceDuration,
        customer: {
          given_names: customerName,
          email: customerEmail,
        },
        customer_notification_preference: {
          invoice_created: ["email"],
          invoice_paid: ["email"],
        },
        success_redirect_url: appUrl ? `${appUrl}/checkout/success?order=${orderId}` : undefined,
        failure_redirect_url: appUrl ? `${appUrl}/checkout/pending?order=${orderId}` : undefined,
        expiry_date: expiryDate,
        currency: "IDR",
      }),
    });

    const data = await response.json();

    if (!response.ok || !data?.invoice_url) {
      throw new Error(`Xendit: ${data?.message || JSON.stringify(data)}`);
    }

    return { checkoutUrl: data.invoice_url };
  }

  async verify(reference: string): Promise<{ status: "PAID" | "FAILED" | "PENDING" }> {
    const { apiKey, baseUrl } = await this.getConfig();
    const basicAuth = Buffer.from(`${apiKey}:`).toString("base64");

    const response = await fetch(`${baseUrl}/v2/invoices/${reference}`, {
      headers: { Authorization: `Basic ${basicAuth}` },
    });

    const data = await response.json();
    const status = data?.status;

    if (status === "PAID" || status === "SETTLED") return { status: "PAID" };
    if (status === "EXPIRED") return { status: "FAILED" };
    return { status: "PENDING" };
  }

  /** Verifikasi webhook token Xendit (x-callback-token header) */
  static verifyWebhookToken(incomingToken: string, storedToken: string): boolean {
    if (!incomingToken || !storedToken) return false;
    try {
      return require("crypto").timingSafeEqual(
        Buffer.from(incomingToken),
        Buffer.from(storedToken)
      );
    } catch {
      return false;
    }
  }
}
