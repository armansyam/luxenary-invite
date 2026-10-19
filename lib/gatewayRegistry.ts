/**
 * Gateway Registry. Satu-satunya gateway yang didukung adalah Midtrans (Core API QRIS); antarmuka PaymentGateway dan
 * `orders.gatewayId` dipertahankan agar sesi gateway tetap tercatat per order.
 */

import { PaymentGateway } from "@/lib/gateways/types";

async function loadGateway(gatewayId: string): Promise<PaymentGateway> {
  if ((gatewayId || "midtrans").toLowerCase() !== "midtrans") {
    throw new Error(`Gateway "${gatewayId}" tidak dikenali. Sistem hanya mendukung midtrans.`);
  }
  const { MidtransGateway } = await import("@/lib/gateways/midtrans");
  return new MidtransGateway();
}

export async function getActiveGatewayId(): Promise<string> {
  return "midtrans";
}

/**
 * Dapatkan instance gateway yang aktif, siap digunakan.
 * Gunakan ini di /api/payments/checkout
 */
export async function getActiveGateway(): Promise<PaymentGateway> {
  const gatewayId = await getActiveGatewayId();
  return loadGateway(gatewayId);
}

/**
 * Dapatkan instance gateway spesifik berdasarkan ID.
 * Berguna untuk backward-compat saat klien sudah terlanjur pilih gateway tertentu.
 */
export async function getGatewayById(gatewayId: string): Promise<PaymentGateway> {
  return loadGateway(gatewayId);
}
