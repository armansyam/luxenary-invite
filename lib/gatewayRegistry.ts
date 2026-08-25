/**
 * Gateway Registry — Dynamic Multi-Gateway Payment Factory
 *
 * Cara kerja:
 * 1. Admin memilih gateway aktif di Admin Portal → Pengaturan
 * 2. Pilihan disimpan ke AdminSetting dengan key "active_payment_gateway"
 * 3. Setiap request checkout membaca setting ini dan menginisialisasi gateway yang sesuai
 * 4. Tidak perlu deploy ulang untuk ganti gateway!
 *
 * Gateway yang tersedia:
 * - ipaymu   → iPaymu (default)
 * - midtrans → Midtrans Snap
 * - xendit   → Xendit Invoice
 * - duitku   → Duitku
 * - tripay   → Tripay
 */

import { PaymentGateway, GATEWAY_CATALOG, GatewayMeta } from "@/lib/gateways/types";
import { prisma } from "@/lib/prisma";

/** Lazy import masing-masing gateway untuk menghindari bundle bloat */
async function loadGateway(gatewayId: string): Promise<PaymentGateway> {
  switch (gatewayId.toLowerCase()) {
    case "ipaymu": {
      const { IPaymuGateway } = await import("@/lib/ipaymu");
      return new IPaymuGateway();
    }
    case "midtrans": {
      const { MidtransGateway } = await import("@/lib/gateways/midtrans");
      return new MidtransGateway();
    }
    case "xendit": {
      const { XenditGateway } = await import("@/lib/gateways/xendit");
      return new XenditGateway();
    }
    case "duitku": {
      const { DuitkuGateway } = await import("@/lib/gateways/duitku");
      return new DuitkuGateway();
    }
    case "tripay": {
      const { TripayGateway } = await import("@/lib/gateways/tripay");
      return new TripayGateway();
    }
    default:
      throw new Error(
        `Gateway "${gatewayId}" tidak dikenali. Pilihan yang tersedia: ipaymu, midtrans, xendit, duitku, tripay`
      );
  }
}

/**
 * Baca gateway aktif dari AdminSetting.
 * Fallback ke "ipaymu" jika belum diset.
 */
export async function getActiveGatewayId(): Promise<string> {
  try {
    const setting = await prisma.adminSetting.findUnique({
      where: { key: "active_payment_gateway" },
    });
    if (setting?.value) return setting.value.toLowerCase();
  } catch {}
  return "ipaymu"; // Default gateway
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

/**
 * Daftar semua gateway yang tersedia beserta metadata-nya.
 * Digunakan oleh Admin UI untuk menampilkan pilihan gateway.
 */
export function getAllGateways(): GatewayMeta[] {
  return GATEWAY_CATALOG;
}

/**
 * Metadata gateway aktif (untuk tampilan admin).
 */
export async function getActiveGatewayMeta(): Promise<GatewayMeta | null> {
  const id = await getActiveGatewayId();
  return GATEWAY_CATALOG.find((g) => g.id === id) || null;
}
