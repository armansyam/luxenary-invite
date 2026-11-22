import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { logger } from "@/lib/logger";

/**
 * Memproses konsumsi PromoHold dan pencatatan pemakaian kupon promo publik saat order berubah status menjadi PAID.
 * Idempotent: Jika hold sudah berstatus CONSUMED, fungsi ini langsung melewati eksekusi tanpa menduplikasi data.
 *
 * Catatan Kebijakan Bisnis (Zero-Debt / No Payout):
 * - Kupon Promo berdiri sendiri untuk kampanye promo publik Luxvite.
 * - Mitra WO menerima potongan harga grosir langsung di checkout untuk akun klien yang didaftarkannya,
 *   sehingga sistem TIDAK lagi membuat utang AffiliateCommission baru atau menambah pendingBalance.
 */
export async function processOrderPaidMarketing(
  orderId: string,
  client: Prisma.TransactionClient | typeof prisma = prisma
) {
  try {
    const order = await client.order.findUnique({
      where: { id: orderId },
      include: {
        promoHold: true,
        promoCoupon: true,
      },
    });

    if (!order) return;

    // 1. Konsumsi PromoHold jika ada
    if (order.promoHold) {
      // Idempotency check: jika sudah CONSUMED, jangan proses ulang
      if (order.promoHold.status === "CONSUMED") {
        return;
      }

      await client.promoHold.update({
        where: { id: order.promoHold.id },
        data: { status: "CONSUMED" },
      });
    }

    // 2. Update usage count kupon promo publik (tanpa pencatatan utang/komisi mitra)
    if (order.promoCoupon) {
      await client.promoCoupon.update({
        where: { id: order.promoCoupon.id },
        data: { usageCount: { increment: 1 } },
      });
    }
  } catch (error) {
    logger.error("Marketing", "Gagal memproses pemakaian kupon untuk order lunas", error, { orderId });
    throw error;
  }
}

/**
 * Melepaskan PromoHold yang sedang tertahan (HELD) menjadi RELEASED
 * Digunakan saat order expired, dibatalkan, atau digantikan dengan order baru.
 */
export async function releaseOrderPromoHold(
  orderId: string,
  client: Prisma.TransactionClient | typeof prisma = prisma
) {
  try {
    await client.promoHold.updateMany({
      where: {
        orderId,
        status: "HELD",
      },
      data: {
        status: "RELEASED",
      },
    });
  } catch (error) {
    logger.error("Marketing", "Gagal melepas promo hold", error, { orderId });
  }
}
