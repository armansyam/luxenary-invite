/**
 * Xendit Payment Gateway
 * Docs: https://developers.xendit.co
 *
 * Flow: Invoice-based (hosted payment page)
 * Webhook: POST /api/webhook/xendit
 * Signature: x-callback-token header (static secret dari dashboard Xendit)
 */
import crypto from "crypto";
import { PaymentGateway } from "@/lib/gateways/types";
import { prisma } from "@/lib/prisma";

export class XenditGateway implements PaymentGateway {
  private async getConfig() {
    let apiKey = process.env.XENDIT_API_KEY || "";
    let webhookToken = process.env.XENDIT_WEBHOOK_TOKEN || "";

    try {
      const settings = await prisma.adminSetting.findMany({ where: { group: "xendit" } });
      const map: Record<string, string> = {};
      settings.forEach((s) => (map[s.key] = s.value));

      if (map["xendit_api_key"]) apiKey = map["xendit_api_key"];
      if (map["xendit_webhook_token"]) webhookToken = map["xendit_webhook_token"];
    } catch {}

    const baseUrl = "https://api.xendit.co";
    return { apiKey, webhookToken, baseUrl };
  }

  async init(orderId: string, amount: number, appUrl?: string): Promise<{ checkoutUrl?: string; qrString?: string; sessionId?: string; expiryTimestamp?: number; gatewayTxId?: string }> {
    // Ambil data lengkap buyer, paket, dan nomor invoice dari order
    let customerFirstName = "Klien";
    let customerLastName = "";
    let customerFullName = "Klien";
    let customerEmail = "no-reply@example.com";
    let customerPhone = "";
    let packageType = "PREMIUM";
    let baseAmount = amount;
    let orderType = "NEW";
    let invoiceNumber = orderId;
    let requestedDomain = "";
    let upgradedFromPlan = "";
    let targetPlanType = "";
    let shippingAddress = "";
    let coupleName = "";
    let invitationSlug = "";

    try {
      const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: {
          user: { select: { id: true, name: true, email: true, phoneNumber: true } },
          invitation: {
            select: {
              id: true,
              themeId: true,
              invitationSlug: true,
              subdomain: true,
              customDomain: true,
              groomName: true,
              groomNickname: true,
              brideName: true,
              brideNickname: true,
              shippingAddress: true,
            },
          },
        },
      });

      if (order?.user?.name) {
        customerFullName = order.user.name.trim();
        const parts = customerFullName.split(/\s+/);
        customerFirstName = parts[0] || "Klien";
        customerLastName = parts.slice(1).join(" ") || "";
      }
      if (order?.user?.email) customerEmail = order.user.email.trim();
      if (order?.user?.phoneNumber) customerPhone = order.user.phoneNumber.trim();
      if (order?.planType) packageType = order.planType;
      if (order?.amount) baseAmount = Number(order.amount);
      if (order?.orderType) orderType = order.orderType;
      if (order?.invoiceNumber) invoiceNumber = order.invoiceNumber;
      if (order?.requestedDomain) requestedDomain = order.requestedDomain;
      if (order?.upgradedFromPlan) upgradedFromPlan = order.upgradedFromPlan;
      if (order?.targetPlanType) targetPlanType = order.targetPlanType;

      let invitation = order?.invitation;
      if (!invitation && order?.userId) {
        invitation = await prisma.invitation.findFirst({
          where: {
            OR: [
              ...(order.linkedOrderId ? [{ orderId: order.linkedOrderId }] : []),
              { userId: order.userId },
            ],
          },
          select: {
            id: true,
            themeId: true,
            invitationSlug: true,
            subdomain: true,
            customDomain: true,
            groomName: true,
            groomNickname: true,
            brideName: true,
            brideNickname: true,
            shippingAddress: true,
          },
        });
      }

      if (invitation) {
        if (invitation.shippingAddress) shippingAddress = invitation.shippingAddress.trim();
        if (invitation.invitationSlug) invitationSlug = invitation.invitationSlug;
        const gName = invitation.groomNickname || invitation.groomName || "";
        const bName = invitation.brideNickname || invitation.brideName || "";
        if (gName || bName) coupleName = `${gName} & ${bName}`.trim();
      }
    } catch {}

    const { apiKey, baseUrl } = await this.getConfig();

    if (!apiKey || apiKey.includes("your_")) {
      throw new Error("Xendit belum dikonfigurasi. Isi API Key di Admin → Pengaturan → Xendit.");
    }

    // Baca konfigurasi platform, prefix judul, & masa kedaluwarsa dari admin setting
    let expiryMinutes = 60;
    let invoicePrefix = "Tagihan Pembayaran";
    let platformName = "Luxenary";
    let supportEmail = "support@luxenary.com";
    let supportPhone = "";

    try {
      const settings = await prisma.adminSetting.findMany({
        where: {
          key: {
            in: [
              "payment_expiry_minutes",
              "payment_invoice_prefix",
              "platform_name",
              "support_email",
              "support_whatsapp",
              "company_name",
            ],
          },
        },
      });
      settings.forEach((s) => {
        if (s.key === "payment_expiry_minutes" && !isNaN(Number(s.value))) {
          expiryMinutes = Math.max(5, Math.min(1440, Number(s.value)));
        }
        if (s.key === "payment_invoice_prefix" && s.value) invoicePrefix = s.value;
        if (s.key === "platform_name" && s.value) platformName = s.value;
        if (s.key === "support_email" && s.value) supportEmail = s.value;
        if (s.key === "support_whatsapp" && s.value) supportPhone = s.value;
      });
    } catch {}

    // Rincian item berdasarkan 3 kondisi pembayaran
    let itemName = `Paket Undangan Digital - ${packageType}`;
    let itemDescription = `${invoicePrefix} — ${invoiceNumber}`;
    let itemCategory = "Paket Undangan";

    if (orderType === "GALLERY_EXTENSION") {
      itemName = "Perpanjang Galeri Tamu (+30 Hari)";
      itemDescription = `[${platformName}] Perpanjangan Galeri Tamu (+30 Hari) #${invoiceNumber} (${customerFullName})`;
      itemCategory = "Add-on Galeri";
    } else if (orderType === "CUSTOM_DOMAIN_ADDON") {
      itemName = `Jasa Integrasi Domain ${requestedDomain || ""}`.trim();
      itemDescription = `[${platformName}] Jasa Integrasi Domain: ${requestedDomain || ""} #${invoiceNumber} (${customerFullName})`;
      itemCategory = "Add-on Domain";
    } else if (orderType === "UPGRADE") {
      itemName = `Upgrade Paket: ${upgradedFromPlan || "Tier"} ke ${targetPlanType || packageType}`;
      itemDescription = `[${platformName}] Upgrade Layanan ke ${targetPlanType || packageType} #${invoiceNumber} (${customerFullName})`;
      itemCategory = "Upgrade Paket";
    } else {
      itemName = `Paket Undangan Digital - ${packageType}`;
      itemDescription = `[${platformName}] Paket Undangan Digital ${packageType} #${invoiceNumber} (${customerFullName})`;
      itemCategory = "Paket Undangan";
    }

    const adminFee = amount > baseAmount ? amount - baseAmount : 0;
    const items: Array<{ name: string; quantity: number; price: number; category?: string; url?: string }> = [
      {
        name: itemName.slice(0, 100),
        quantity: 1,
        price: baseAmount,
        category: itemCategory,
        url: appUrl ? `${appUrl}/packages` : undefined,
      },
    ];
    if (adminFee > 0) {
      items.push({
        name: "Biaya Layanan Pembayaran",
        quantity: 1,
        price: adminFee,
        category: "Biaya Transaksi",
      });
    }

    // Bersihkan nomor handphone (format E.164 atau lokal Indonesia)
    let cleanMobile = (customerPhone || "").replace(/[^\d+]/g, "").trim();
    if (cleanMobile.startsWith("0")) {
      cleanMobile = "+62" + cleanMobile.slice(1);
    }

    const customerPayload: Record<string, any> = {
      given_names: customerFirstName.slice(0, 50),
      email: customerEmail.slice(0, 100),
      addresses: [
        {
          country: "Indonesia",
          street_line1: shippingAddress ? shippingAddress.slice(0, 100) : "Layanan Undangan Digital",
          city: "Indonesia",
          postal_code: "10110",
        },
      ],
    };
    if (customerLastName) customerPayload.surname = customerLastName.slice(0, 50);
    if (cleanMobile) customerPayload.mobile_number = cleanMobile.slice(0, 20);

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
        description: itemDescription.slice(0, 255),
        invoice_duration: invoiceDuration,
        customer: customerPayload,
        items,
        metadata: {
          orderId,
          invoiceNumber,
          orderType,
          planType: packageType,
          targetPlanType: targetPlanType || undefined,
          upgradedFromPlan: upgradedFromPlan || undefined,
          requestedDomain: requestedDomain || undefined,
          customerFullName,
          customerFirstName,
          customerLastName: customerLastName || undefined,
          customerEmail,
          customerPhone: cleanMobile || undefined,
          invitationSlug: invitationSlug || undefined,
          coupleName: coupleName || undefined,
          platformName,
        },
        customer_notification_preference: {
          invoice_created: cleanMobile ? ["whatsapp", "sms", "email"] : ["email"],
          invoice_reminder: cleanMobile ? ["whatsapp", "sms", "email"] : ["email"],
          invoice_paid: cleanMobile ? ["whatsapp", "sms", "email"] : ["email"],
          invoice_expired: cleanMobile ? ["whatsapp", "sms", "email"] : ["email"],
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

    return { checkoutUrl: data.invoice_url, gatewayTxId: data.id };
  }

  /**
   * Expire invoice Xendit yang masih aktif.
   * Xendit tidak punya "cancel" — melainkan "expire".
   * Endpoint: POST /v2/invoices/{invoice_id}/expire
   * gatewayTxId = invoice_id yang dikembalikan Xendit saat init().
   */
  async cancel(gatewayTxId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { apiKey, baseUrl } = await this.getConfig();
      const basicAuth = Buffer.from(`${apiKey}:`).toString("base64");

      const response = await fetch(`${baseUrl}/v2/invoices/${gatewayTxId}/expire`, {
        method: "POST",
        headers: {
          Authorization: `Basic ${basicAuth}`,
          "Content-Type": "application/json",
        },
      });

      const data = await response.json();
      if (response.ok || data?.status === "EXPIRED") return { success: true };

      return { success: false, error: data?.message || JSON.stringify(data) };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
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
      return crypto.timingSafeEqual(
        Buffer.from(incomingToken),
        Buffer.from(storedToken)
      );
    } catch {
      return false;
    }
  }
}
