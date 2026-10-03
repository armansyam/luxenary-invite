import { Prisma, type OrderStatus } from "@prisma/client";
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
 * Webhook kedaluwarsa/batal dari transaksi gateway lama (sesi QR yang sudah diganti, atau yang dibatalkan aplikasi
 * sendiri saat rincian berubah) tidak boleh mematikan order yang sudah punya sesi baru.
 * `gatewayTxId === order.id` menandakan alur redirect yang tidak menyimpan ID transaksi gateway, sehingga tidak bisa
 * dibandingkan dan dianggap sesi aktif.
 */
export function isStaleGatewaySession(order: { id: string; gatewayTxId: string | null }, eventTxId: unknown): boolean {
  if (typeof eventTxId !== "string" || eventTxId === "") return false;
  if (order.gatewayTxId === order.id) return false;
  return order.gatewayTxId !== eventTxId;
}

/**
 * Menentukan status asal yang boleh dilunasi untuk notifikasi pembayaran gateway yang valid.
 * Uang sudah diterima, jadi order yang ditutup aplikasi (EXPIRED/FAILED, mis. QR lama yang tetap dibayar setelah
 * paket diganti atau pembatalan ke gateway gagal) tetap dilunasi, kecuali pengguna sudah punya order paket baru
 * berstatus PAID: dua pelunasan paket dasar melanggar invarian satu paket per pengguna dan harus ditinjau manual.
 *
 * @returns daftar status asal, atau null bila pelunasan otomatis tidak aman.
 */
export async function settlementSourceStatuses(order: {
  id: string;
  userId: string;
  orderType: string;
  status: string;
}): Promise<OrderStatus[] | null> {
  if (order.status === "PENDING") return ["PENDING"];
  if (order.status !== "EXPIRED" && order.status !== "FAILED") return null;
  if (order.orderType === "NEW") {
    const otherPaid = await prisma.order.count({
      where: { userId: order.userId, orderType: "NEW", status: "PAID", id: { not: order.id } },
    });
    if (otherPaid > 0) return null;
  }
  return ["PENDING", "EXPIRED", "FAILED"];
}

/**
 * Transisi PENDING -> PAID beserta efek samping marketing (hold promo, kupon, komisi mitra)
 * dalam SATU transaksi. Jika marketing gagal, seluruh transisi dibatalkan: order tetap PENDING
 * sehingga gateway mengirim ulang webhook dan tidak ada data setengah jadi.
 *
 * @param options.from status asal yang boleh dilunasi (bawaan hanya PENDING)
 * @returns false jika order tidak berada di status asal yang diizinkan (sudah diproses proses lain).
 */
export async function settleOrderAsPaid(
  orderId: string,
  data: Prisma.OrderUpdateManyMutationInput = {},
  options: { from?: OrderStatus[] } = {}
): Promise<boolean> {
  return prisma.$transaction(async (tx) => {
    const updated = await tx.order.updateMany({
      where: { id: orderId, status: { in: options.from ?? ["PENDING"] } },
      data: { ...data, status: "PAID", paidAt: new Date() },
    });
    if (updated.count === 0) return false;

    await processOrderPaidMarketing(orderId, tx);
    return true;
  });
}
