import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

/**
 * Memproses konsumsi PromoHold dan pencatatan komisi mitra saat order berubah status menjadi PAID.
 * Idempotent: Jika sudah pernah diproses (hold.status === "CONSUMED" atau commission sudah ada),
 * fungsi ini akan langsung melewati eksekusi tanpa menduplikasi data (mencegah Celah 3).
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
        promoCoupon: {
          include: { partner: true },
        },
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

    // 2. Update usage count kupon promo
    if (order.promoCoupon) {
      await client.promoCoupon.update({
        where: { id: order.promoCoupon.id },
        data: { usageCount: { increment: 1 } },
      });

      // 3. Catat komisi mitra afiliasi jika kupon terafiliasi dengan partner
      const partner = order.promoCoupon.partner;
      if (partner && partner.isActive) {
        // Cek apakah komisi untuk order ini sudah pernah dicatat
        const existingCommission = await client.affiliateCommission.findUnique({
          where: { orderId: order.id },
        });

        if (!existingCommission) {
          let commissionAmount = 0;
          if (partner.commissionType === "PERCENT") {
            commissionAmount = Math.round(Number(order.amount) * (Number(partner.commissionValue) / 100));
          } else {
            commissionAmount = Number(partner.commissionValue);
          }

          commissionAmount = Math.max(0, commissionAmount);

          if (commissionAmount > 0) {
            await client.affiliateCommission.create({
              data: {
                partnerId: partner.id,
                orderId: order.id,
                orderAmount: order.amount,
                commissionAmount,
                status: "PENDING",
              },
            });

            await client.partnerAffiliate.update({
              where: { id: partner.id },
              data: {
                pendingBalance: { increment: commissionAmount },
              },
            });
          }
        }
      }
    }
  } catch (error) {
    console.error(`[Marketing] Gagal memproses paid marketing untuk order ${orderId}:`, error);
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
    console.error(`[Marketing] Gagal merilis promo hold untuk order ${orderId}:`, error);
  }
}
