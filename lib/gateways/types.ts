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
   * Midtrans memanggil /v2/{orderId}/cancel.
   *
   * @param gatewayTxId - ID transaksi di sisi gateway (dari Order.gatewayTxId)
   */
  cancel(gatewayTxId: string): Promise<{ success: boolean; error?: string }>;
}


