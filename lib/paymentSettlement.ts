import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { processOrderPaidMarketing } from "@/lib/marketing";

type AmountLike = Prisma.Decimal | number | string;

/**
 * Validasi nominal yang dibayar di gateway terhadap nominal yang benar-benar ditagihkan.
 * - `chargedAmount` (nominal yang dikirim ke gateway saat init, termasuk biaya layanan BUYER) wajib sama persis.
 * - Order tanpa `chargedAmount` (dibuat sebelum kolom ini ada) hanya boleh dibayar >= `amount`.
 */
export function isGatewayAmountValid(
  order: { amount: AmountLike; chargedAmount: AmountLike | null },
  paidAmount: number
): boolean {
  if (!Number.isFinite(paidAmount) || paidAmount <= 0) return false;
  if (order.chargedAmount !== null && order.chargedAmount !== undefined) {
    return paidAmount === Number(order.chargedAmount);
  }
  return paidAmount >= Number(order.amount);
}

/**
 * Transisi PENDING -> PAID beserta efek samping marketing (hold promo, kupon, komisi mitra)
 * dalam SATU transaksi. Jika marketing gagal, seluruh transisi dibatalkan: order tetap PENDING
 * sehingga gateway mengirim ulang webhook dan tidak ada data setengah jadi.
 *
 * @returns false jika order sudah tidak PENDING (sudah diproses proses lain).
 */
export async function settleOrderAsPaid(
  orderId: string,
  data: Prisma.OrderUpdateManyMutationInput = {}
): Promise<boolean> {
  return prisma.$transaction(async (tx) => {
    const updated = await tx.order.updateMany({
      where: { id: orderId, status: "PENDING" },
      data: { ...data, status: "PAID", paidAt: new Date() },
    });
    if (updated.count === 0) return false;

    await processOrderPaidMarketing(orderId, tx);
    return true;
  });
}
