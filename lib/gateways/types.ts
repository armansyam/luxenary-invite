/**
 * PaymentGateway — Base Interface & Metadata
 * Semua gateway Indonesia wajib mengimplementasikan interface ini.
 */

export interface PaymentGateway {
  /** Inisialisasi transaksi, kembalikan URL redirect pembayaran atau string QRIS */
  init(orderId: string, amount: number, appUrl?: string): Promise<{
    checkoutUrl?: string;
    qrString?: string;
    sessionId?: string;
    expiryTimestamp?: number;
    /** ID transaksi dari sisi gateway — disimpan ke Order.gatewayTxId untuk keperluan cancel/expire */
    gatewayTxId?: string;
  }>;

  /** Verifikasi status pembayaran berdasarkan referenceId/orderId */
  verify(reference: string): Promise<{ status: "PAID" | "FAILED" | "PENDING" }>;

  /**
   * Batalkan transaksi aktif di sisi gateway.
   * Wajib dipanggil sebelum re-init jika gateway bersifat stateful (Midtrans, Xendit).
   * Gateway stateless (iPaymu) cukup return { success: true } tanpa API call.
   *
   * @param gatewayTxId - ID transaksi di sisi gateway (dari Order.gatewayTxId)
   */
  cancel(gatewayTxId: string): Promise<{ success: boolean; error?: string }>;
}

/** Metadata deskriptif setiap gateway untuk UI Admin */
export interface GatewayMeta {
  id: string;
  name: string;
  description: string;
  logo: string;         // URL logo atau SVG path
  docs: string;         // Link dokumentasi resmi
  features: string[];   // Metode pembayaran yang didukung
  webhookPath: string;  // Path endpoint webhook di sistem ini
  configKeys: string[]; // Kunci AdminSetting yang diperlukan (group: gateway)
}

export const GATEWAY_CATALOG: GatewayMeta[] = [
  {
    id: "ipaymu",
    name: "iPaymu",
    description: "Payment gateway lokal Indonesia. Mendukung QRIS, VA, GoPay, OVO, ShopeePay, dan kartu kredit.",
    logo: "https://ipaymu.com/favicon.ico",
    docs: "https://api-doc.ipaymu.com",
    features: ["QRIS", "Virtual Account", "GoPay", "OVO", "ShopeePay", "Kartu Kredit"],
    webhookPath: "/api/webhook/ipaymu",
    configKeys: ["ipaymu_va", "ipaymu_api_key", "ipaymu_mode"],
  },
  {
    id: "midtrans",
    name: "Midtrans",
    description: "Payment gateway terbesar Indonesia (GoTo Group). Mendukung Snap UI, QRIS, VA BCA/Mandiri/BNI/BRI, GoPay.",
    logo: "https://midtrans.com/favicon.ico",
    docs: "https://docs.midtrans.com",
    features: ["QRIS", "GoPay", "VA BCA", "VA Mandiri", "VA BNI", "VA BRI", "Kartu Kredit"],
    webhookPath: "/api/webhook/midtrans",
    configKeys: ["midtrans_server_key", "midtrans_client_key", "midtrans_mode"],
  },
  {
    id: "xendit",
    name: "Xendit",
    description: "Payment gateway modern untuk startup Indonesia & Filipina. Invoice-based flow dengan UI yang bersih.",
    logo: "https://xendit.co/favicon.ico",
    docs: "https://developers.xendit.co",
    features: ["QRIS", "VA BCA", "VA BNI", "VA BRI", "VA Mandiri", "OVO", "DANA", "LinkAja"],
    webhookPath: "/api/webhook/xendit",
    configKeys: ["xendit_api_key", "xendit_webhook_token", "xendit_mode"],
  },
  {
    id: "duitku",
    name: "Duitku",
    description: "Payment gateway lokal terjangkau untuk UMKM Indonesia. Fee rendah dan proses onboarding cepat.",
    logo: "https://duitku.com/favicon.ico",
    docs: "https://docs.duitku.com",
    features: ["QRIS", "VA BCA", "VA BNI", "VA BRI", "VA Mandiri", "GoPay", "OVO", "ShopeePay"],
    webhookPath: "/api/webhook/duitku",
    configKeys: ["duitku_merchant_code", "duitku_api_key", "duitku_mode"],
  },
  {
    id: "tripay",
    name: "Tripay",
    description: "Payment gateway populer untuk developer Indonesia. Flat fee transparan, mendukung banyak channel.",
    logo: "https://tripay.co.id/favicon.ico",
    docs: "https://tripay.co.id/developer",
    features: ["QRIS", "VA BCA", "VA Mandiri", "VA BNI", "VA BRI", "GoPay", "OVO", "DANA", "Alfamart", "Indomaret"],
    webhookPath: "/api/webhook/tripay",
    configKeys: ["tripay_api_key", "tripay_private_key", "tripay_merchant_code", "tripay_mode"],
  },
];
