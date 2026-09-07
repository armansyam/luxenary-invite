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
   * Batalkan transaksi aktif di sisi gateway secara seketika (two-way cancellation).
   * Wajib dipanggil sebelum re-init atau saat pembatalan tagihan / timeout kedaluwarsa.
   * Midtrans memanggil /v2/{orderId}/cancel, Xendit memanggil /v2/invoices/{invoiceId}/expire.
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
    id: "midtrans",
    name: "Midtrans",
    description: "Payment gateway 2-arah (GoTo Group). Mendukung Core API QRIS in-app, Snap popup, VA otomatis, dan pembatalan langsung via API.",
    logo: "https://midtrans.com/favicon.ico",
    docs: "https://docs.midtrans.com",
    features: ["QRIS (In-App)", "GoPay", "VA BCA", "VA Mandiri", "VA BNI", "VA BRI", "Kartu Kredit"],
    webhookPath: "/api/webhook/midtrans",
    configKeys: ["midtrans_server_key", "midtrans_client_key"],
  },
  {
    id: "xendit",
    name: "Xendit",
    description: "Payment gateway 2-arah modern. Mendukung Invoice checkout bersih, VA multi-bank, e-wallet, dan pembatalan tagihan instan via API expire.",
    logo: "https://xendit.co/favicon.ico",
    docs: "https://developers.xendit.co",
    features: ["QRIS", "VA BCA", "VA BNI", "VA BRI", "VA Mandiri", "OVO", "DANA", "LinkAja"],
    webhookPath: "/api/webhook/xendit",
    configKeys: ["xendit_api_key", "xendit_webhook_token"],
  },
];

