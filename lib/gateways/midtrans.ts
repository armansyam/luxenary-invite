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
    let serverKey = "";
    let clientKey = "";
    let environment = "sandbox";

    try {
      const settings = await prisma.adminSetting.findMany({
        where: {
          key: {
            in: [
              "midtrans_environment",
              "midtrans_sandbox_client_key",
              "midtrans_sandbox_server_key",
              "midtrans_production_client_key",
              "midtrans_production_server_key",
              "midtrans_server_key",
              "midtrans_client_key",
            ],
          },
        },
      });
      const map: Record<string, string> = {};
      settings.forEach((s) => (map[s.key] = s.value?.trim() || ""));

      environment = map["midtrans_environment"] || (process.env.MIDTRANS_IS_PRODUCTION === "true" ? "production" : "sandbox");

      const isProd =
        process.env.MIDTRANS_IS_PRODUCTION === "true"
          ? true
          : process.env.MIDTRANS_IS_PRODUCTION === "false"
          ? false
          : environment.toLowerCase() === "production";

      if (isProd) {
        serverKey = map["midtrans_production_server_key"] || (environment === "production" ? map["midtrans_server_key"] : "") || process.env.MIDTRANS_SERVER_KEY || "";
        clientKey = map["midtrans_production_client_key"] || (environment === "production" ? map["midtrans_client_key"] : "") || process.env.MIDTRANS_CLIENT_KEY || "";
      } else {
        serverKey = map["midtrans_sandbox_server_key"] || (environment !== "production" ? map["midtrans_server_key"] : "") || process.env.MIDTRANS_SERVER_KEY || "";
        clientKey = map["midtrans_sandbox_client_key"] || (environment !== "production" ? map["midtrans_client_key"] : "") || process.env.MIDTRANS_CLIENT_KEY || "";
      }
    } catch {
      serverKey = process.env.MIDTRANS_SERVER_KEY || "";
      clientKey = process.env.MIDTRANS_CLIENT_KEY || "";
      environment = process.env.MIDTRANS_IS_PRODUCTION === "true" ? "production" : "sandbox";
    }

    // Auto-swap guard: jika Server Key dan Client Key tertukar di Admin Setting
    if (
      (serverKey.startsWith("Mid-client-") || serverKey.startsWith("SB-Mid-client-")) &&
      (clientKey.startsWith("Mid-server-") || clientKey.startsWith("SB-Mid-server-"))
    ) {
      const temp = serverKey;
      serverKey = clientKey;
      clientKey = temp;
    }

    // Penentuan endpoint deterministik berdasarkan setting Admin Portal (default: sandbox)
    const isProduction =
      process.env.MIDTRANS_IS_PRODUCTION === "true"
        ? true
        : process.env.MIDTRANS_IS_PRODUCTION === "false"
        ? false
        : environment.toLowerCase() === "production";

    const snapUrl = isProduction
      ? "https://app.midtrans.com/snap/v1/transactions"
      : "https://app.sandbox.midtrans.com/snap/v1/transactions";

    const apiUrl = isProduction
      ? "https://api.midtrans.com/v2"
      : "https://api.sandbox.midtrans.com/v2";

    return { serverKey, clientKey, snapUrl, apiUrl };
  }

  async init(orderId: string, amount: number, appUrl?: string): Promise<{
    checkoutUrl?: string;
    qrString?: string;
    sessionId?: string;
    expiryTimestamp?: number;
    gatewayTxId?: string;
  }> {
    let customerFirstName = "Klien";
    let customerLastName = "";
    let customerFullName = "Klien";
    let customerEmail = "no-reply@example.com";
    let customerPhone = "";
    let packageType = "TIER_1";
    let baseAmount = amount;
    let orderType = "NEW";
    let invoiceNumber = orderId;
    let requestedDomain = "";
    let upgradedFromPlan = "";
    let targetPlanType = "";
    let shippingAddress = "";

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

      if (invitation?.shippingAddress) {
        shippingAddress = invitation.shippingAddress.trim();
      }
    } catch {}

    const { serverKey, snapUrl, apiUrl } = await this.getConfig();

    if (!serverKey || serverKey.includes("your_")) {
      throw new Error("Midtrans belum dikonfigurasi. Isi Server Key di Admin → Pengaturan → Midtrans.");
    }

    // Baca konfigurasi platform & masa kedaluwarsa QRIS dari admin setting
    let expiryMinutes = 60;
    let platformName = "Sistem Undangan";
    let supportEmail = "support@domain.com";
    let supportPhone = "";
    try {
      const settings = await prisma.adminSetting.findMany({
        where: {
          key: { in: ["payment_expiry_minutes", "platform_name", "support_email", "support_whatsapp", "company_name"] },
        },
      });
      settings.forEach((s) => {
        if (s.key === "payment_expiry_minutes" && !isNaN(Number(s.value))) {
          expiryMinutes = Math.max(5, Math.min(1440, Number(s.value)));
        }
        if (s.key === "platform_name" && s.value) platformName = s.value;
        if (s.key === "support_email" && s.value) supportEmail = s.value;
        if (s.key === "support_whatsapp" && s.value) supportPhone = s.value;
      });
    } catch {}

    // Rincian item berdasarkan 3 kondisi pembayaran
    let itemId = "INV-ITEM";
    let itemName = `Paket Undangan ${packageType}`;
    let itemCategory = "Paket Undangan";

    if (orderType === "GALLERY_EXTENSION") {
      itemId = "EXT_GALLERY";
      itemName = "Perpanjangan Masa Aktif (+30 Hari)";
      itemCategory = "Add-on Masa Aktif";
    } else if (orderType === "MEMORIES_TOPUP") {
      itemId = "TOPUP_MEMORIES";
      itemName = "Top-Up Kuota Momen Foto";
      itemCategory = "Add-on Kuota";
    } else if (orderType === "UPGRADE") {
      itemId = `UPG_${targetPlanType || packageType}`.slice(0, 50);
      itemName = `Upgrade: ${upgradedFromPlan || "Tier"} ke ${targetPlanType || packageType}`.trim().slice(0, 50);
      itemCategory = "Upgrade Paket";
    } else {
      itemId = `PKG_${packageType}`.slice(0, 50);
      itemName = `Paket Undangan Digital - ${packageType}`.trim().slice(0, 50);
      itemCategory = "Paket Undangan";
    }

    // Hitung rincian item: harga paket dasar + biaya admin (jika ada)
    // Syarat Midtrans: Total gross_amount wajib sama persis dengan sum(item.price * item.quantity)
    const adminFee = amount > baseAmount ? amount - baseAmount : 0;
    const itemDetails: Array<{
      id: string;
      price: number;
      quantity: number;
      name: string;
      brand?: string;
      category?: string;
      merchant_name?: string;
    }> = [
      {
        id: itemId,
        price: baseAmount,
        quantity: 1,
        name: itemName,
        brand: platformName.slice(0, 50),
        category: itemCategory.slice(0, 50),
        merchant_name: platformName.slice(0, 50),
      },
    ];
    if (adminFee > 0) {
      itemDetails.push({
        id: "ADMIN_FEE",
        price: adminFee,
        quantity: 1,
        name: "Biaya Layanan Pembayaran",
        brand: platformName.slice(0, 50),
        category: "Biaya Transaksi",
        merchant_name: platformName.slice(0, 50),
      });
    }

    // Nomor telepon yang bersih (hanya angka dan simbol +)
    const cleanPhone = (customerPhone || supportPhone || "081200000000").replace(/[^\d+]/g, "").slice(0, 19);

    const customerDetails: Record<string, any> = {
      first_name: customerFirstName.slice(0, 50),
      email: customerEmail.slice(0, 45),
      phone: cleanPhone,
    };
    if (customerLastName) {
      customerDetails.last_name = customerLastName.slice(0, 50);
    }

    // Tambahkan alamat penagihan & pengiriman lengkap
    const billingAddress = {
      first_name: customerFirstName.slice(0, 50),
      last_name: (customerLastName || customerFirstName).slice(0, 50),
      email: customerEmail.slice(0, 45),
      phone: cleanPhone,
      address: shippingAddress ? shippingAddress.slice(0, 100) : "Layanan Undangan Digital",
      city: "Indonesia",
      postal_code: "10110",
      country_code: "IDN",
    };
    customerDetails.billing_address = billingAddress;
    customerDetails.shipping_address = billingAddress;

    // Keterangan pendukung metadata
    const customField3 = (
      orderType === "UPGRADE"
        ? `Upgrade: ${upgradedFromPlan || "Tier"} ke ${targetPlanType || packageType}`
        : orderType === "MEMORIES_TOPUP"
        ? "Top-Up Kuota Momen Foto"
        : orderType === "GALLERY_EXTENSION"
        ? "Galeri Tamu (+30 Hari)"
        : `Paket: ${packageType}`
    ).slice(0, 255);

    const basicAuth = Buffer.from(`${serverKey}:`).toString("base64");

    // ────────────────────────────────────────────────────────────────────────
    // 1. PRIORITAS UTAMA: Midtrans Core API QRIS (In-App Luxury Checkout)
    // Langsung menghasilkan string QRIS sehingga pembeli tidak di-redirect keluar web,
    // timer countdown 100% sinkron dengan Admin Setting, dan aman dari page refresh.
    // ────────────────────────────────────────────────────────────────────────
    try {
      const chargeRes = await fetch(`${apiUrl}/charge`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: `Basic ${basicAuth}`,
        },
        body: JSON.stringify({
          payment_type: "qris",
          transaction_details: {
            order_id: orderId,
            gross_amount: amount,
          },
          item_details: itemDetails,
          customer_details: customerDetails,
          custom_field1: invoiceNumber.slice(0, 255),
          custom_field2: `${orderType} | ${customerFullName}`.slice(0, 255),
          custom_field3: customField3,
          qris: {
            acquirer: "gopay",
          },
          custom_expiry: {
            expiry_duration: expiryMinutes,
            unit: "minute",
          },
          ...(appUrl && !appUrl.includes("localhost")
            ? { override_notification_urls: [`${appUrl.replace(/\/$/, "")}/api/webhook/midtrans`] }
            : {}),
        }),
      });

      const chargeData = await chargeRes.json();

      if (chargeRes.ok && chargeData?.qr_string) {
        // Gunakan timestamp absolut server (Date.now() + durasi) agar tidak terdistorsi perbedaan timezone (WIB vs WITA vs WIT)
        const expiryTimestamp = Date.now() + expiryMinutes * 60 * 1000;

        return {
          qrString: chargeData.qr_string,
          sessionId: chargeData.transaction_id,
          expiryTimestamp,
          gatewayTxId: chargeData.transaction_id || orderId,
        };
      }

      // Jika error order_id duplicate, lempar pesan ramah
      if (chargeData?.status_code === "406" || chargeData?.status_message?.includes("already been taken")) {
        throw new Error(`Midtrans: ${chargeData.status_message}`);
      }

      console.warn("[Midtrans Core API] Gagal charge QRIS, beralih fallback ke Snap:", chargeData);
    } catch (chargeErr: any) {
      if (chargeErr.message?.includes("already been taken")) {
        throw chargeErr;
      }
      console.warn("[Midtrans Core API Error]", chargeErr.message);
    }

    // ────────────────────────────────────────────────────────────────────────
    // 2. FALLBACK: Snap UI (jika Core API belum diaktifkan di akun Live tertentu)
    // ────────────────────────────────────────────────────────────────────────
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
        item_details: itemDetails,
        customer_details: customerDetails,
        custom_field1: invoiceNumber.slice(0, 255),
        custom_field2: `${orderType} | ${customerFullName}`.slice(0, 255),
        custom_field3: customField3,
        custom_expiry: {
          expiry_duration: expiryMinutes,
          unit: "minute",
        },
        callbacks: {
          finish: appUrl ? `${appUrl}/checkout/success?order=${orderId}` : undefined,
        },
        ...(appUrl && !appUrl.includes("localhost")
          ? { override_notification_urls: [`${appUrl.replace(/\/$/, "")}/api/webhook/midtrans`] }
          : {}),
      }),
    });

    const data = await response.json();
    if (!response.ok || !data?.redirect_url) {
      throw new Error(`Midtrans: ${data?.error_messages?.join(", ") || JSON.stringify(data)}`);
    }

    return { checkoutUrl: data.redirect_url, gatewayTxId: orderId };
  }

  /**
   * Batalkan transaksi Midtrans yang masih aktif (pending).
   * Midtrans Cancel API: POST /v2/{order_id}/cancel
   * Setelah dibatalkan: QRIS/VA langsung tidak bisa digunakan.
   * Midtrans akan kirim webhook cancel ke /api/webhook/midtrans sebagai konfirmasi.
   */
  async cancel(gatewayTxId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { serverKey, apiUrl } = await this.getConfig();
      const basicAuth = Buffer.from(`${serverKey}:`).toString("base64");

      const response = await fetch(`${apiUrl}/${gatewayTxId}/cancel`, {
        method: "POST",
        headers: {
          Authorization: `Basic ${basicAuth}`,
          "Content-Type": "application/json",
        },
      });

      const data = await response.json();
      const txStatus = data?.transaction_status;

      // Status "cancel" atau "deny" = berhasil dibatalkan
      // Status "expire" = sudah expired sendiri = juga aman untuk re-init
      if (txStatus === "cancel" || txStatus === "deny" || txStatus === "expire") {
        return { success: true };
      }

      // Jika transaksi sudah settlement (terbayar), tidak boleh di-cancel
      if (txStatus === "settlement" || txStatus === "capture") {
        return { success: false, error: "Transaksi sudah terbayar, tidak bisa dibatalkan." };
      }

      // 404 = transaksi tidak ditemukan di Midtrans (misal belum dibuat atau sudah bersih)
      // 412 = transaksi sudah dalam status final (misal sudah expire atau sudah cancel sebelumnya)
      if (response.status === 404 || data?.status_code === "404" || response.status === 412 || data?.status_code === "412") {
        return { success: true };
      }

      // Jika response OK tapi status tidak dikenali, anggap berhasil
      if (response.ok) return { success: true };

      return { success: false, error: data?.error_messages?.join(", ") || JSON.stringify(data) };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
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
    const cleanServerKey = (serverKey || "").trim();
    const cleanSignatureKey = (signature_key || "").trim().toLowerCase();
    if (!cleanServerKey || !cleanSignatureKey) return false;

    // Coba variasi format gross_amount (dengan desimal .00 atau integer polos)
    const amountCandidates = [gross_amount];
    if (gross_amount && gross_amount.includes(".")) {
      amountCandidates.push(gross_amount.split(".")[0]);
    } else if (gross_amount && !gross_amount.includes(".")) {
      amountCandidates.push(`${gross_amount}.00`);
    }

    for (const amt of amountCandidates) {
      const raw = `${order_id}${status_code}${amt}${cleanServerKey}`;
      const expected = crypto.createHash("sha512").update(raw).digest("hex").toLowerCase();
      if (expected === cleanSignatureKey) return true;
    }
    return false;
  }
}
