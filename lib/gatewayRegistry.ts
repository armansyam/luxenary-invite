/**
 * Gateway Registry — Dynamic Two-Way Multi-Gateway Payment Factory
 *
 * Cara kerja:
 * 1. Admin memilih gateway aktif di Admin Portal → Pengaturan (Midtrans atau Xendit)
 * 2. Pilihan disimpan ke AdminSetting dengan key "active_payment_gateway"
 * 3. Setiap request checkout membaca setting ini dan menginisialisasi gateway yang sesuai
 * 4. Kedua gateway mendukung Two-Way Handshake (Cancel / Expire seketika pada switch pembayaran)
 *
 * Gateway 2-arah yang didukung:
 * - midtrans → Midtrans (Core API QRIS / Snap UI)
 * - xendit   → Xendit (Invoice API)
 */

import { PaymentGateway, GATEWAY_CATALOG, GatewayMeta } from "@/lib/gateways/types";
import { prisma } from "@/lib/prisma";

/** Lazy import masing-masing gateway untuk menghindari bundle bloat */
async function loadGateway(gatewayId: string): Promise<PaymentGateway> {
  const normalized = (gatewayId || "midtrans").toLowerCase();

  switch (normalized) {
    case "midtrans": {
      const { MidtransGateway } = await import("@/lib/gateways/midtrans");
      return new MidtransGateway();
    }
    case "xendit": {
      const { XenditGateway } = await import("@/lib/gateways/xendit");
      return new XenditGateway();
    }
    // Fallback otomatis jika setting DB masih menyimpan vendor legacy 1-arah
    case "ipaymu":
    case "duitku":
    case "tripay": {
      console.warn(`[Gateway Registry] Vendor "${normalized}" (1-arah) telah dihentikan. Dialihkan ke Midtrans (2-arah).`);
      const { MidtransGateway } = await import("@/lib/gateways/midtrans");
      return new MidtransGateway();
    }
    default:
      throw new Error(
        `Gateway "${gatewayId}" tidak dikenali. Sistem hanya mendukung gateway 2-arah: midtrans, xendit`
      );
  }
}

/**
 * Baca gateway aktif dari AdminSetting.
 * Fallback ke "midtrans" jika belum diset atau jika diset ke vendor nonaktif.
 */
export async function getActiveGatewayId(): Promise<string> {
  try {
    const setting = await prisma.adminSetting.findUnique({
      where: { key: "active_payment_gateway" },
    });
    if (setting?.value) {
      const val = setting.value.toLowerCase();
      if (val === "midtrans" || val === "xendit") return val;
      // Jika diset ke vendor legacy 1-arah, otomatis gunakan midtrans
      return "midtrans";
    }
  } catch {}
  return "midtrans"; // Default gateway 2-arah
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
