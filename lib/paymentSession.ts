import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import type { Prisma } from "@prisma/client";

/**
 * Menutup order PENDING tanpa bukti transfer yang digantikan tagihan baru. Sesi gateway-nya dibatalkan lebih dulu agar
 * QR lama tidak bisa dibayar; order yang ternyata sudah terbayar di gateway dibiarkan PENDING supaya webhook
 * melunasinya. Gagal menghubungi gateway tidak menghalangi penutupan: pelunasan terlambat atas order EXPIRED tetap
 * diproses webhook (settlementSourceStatuses). Mengembalikan jumlah order yang ditutup.
 */
export async function expireSupersededOrders(where: Prisma.OrderWhereInput, rejectReason: string): Promise<number> {
  const stale = await prisma.order.findMany({
    where: { ...where, status: "PENDING", proofImageUrl: null },
    select: { id: true, gatewayId: true, gatewayTxId: true },
  });

  let expired = 0;
  for (const order of stale) {
    if (order.gatewayTxId) {
      try {
        const { getGatewayById, getActiveGateway } = await import("@/lib/gatewayRegistry");
        const gateway = order.gatewayId ? await getGatewayById(order.gatewayId) : await getActiveGateway();
        const result = await gateway.cancel(order.gatewayTxId);
        if (!result.success && result.error?.includes("terbayar")) continue;
      } catch (err) {
        logger.error("ExpireSuperseded", "Pembatalan sesi gateway gagal; order tetap ditutup", err, { orderId: order.id });
      }
    }
    const closed = await prisma.order.updateMany({ where: { id: order.id, status: "PENDING" }, data: { status: "EXPIRED", rejectReason } });
    expired += closed.count;
  }
  return expired;
}

export interface ConcurrentGatewaySession {
  qrString?: string;
  checkoutUrl?: string;
  sessionId?: string;
  expiryTimestamp: number;
}

/**
 * Dua permintaan bersamaan untuk order yang sama (klik ganda, dua perangkat) sama-sama memanggil gateway. Gateway
 * menolak yang kedua karena order_id sudah dipakai, padahal sesi dari permintaan pertama tinggal disimpan. Fungsi ini
 * menunggu sebentar dan mengembalikan sesi itu; null bila tidak ada sesi baru, sehingga galat gateway yang asli tetap
 * dilempar. `previousTxId` adalah sesi yang sudah ada sebelum permintaan ini (dan sudah dibatalkan): sesi itu tidak
 * boleh dikembalikan.
 */
export async function awaitConcurrentGatewaySession(
  orderId: string,
  gatewayId: string,
  previousTxId: string | null,
  { attempts = 6, delayMs = 400 }: { attempts?: number; delayMs?: number } = {}
): Promise<ConcurrentGatewaySession | null> {
  for (let i = 0; i < attempts; i++) {
    await new Promise((resolve) => setTimeout(resolve, delayMs));
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: { status: true, gatewayId: true, gatewayTxId: true, gatewayQrString: true, gatewayCheckoutUrl: true, gatewaySessionExpiresAt: true },
    });
    if (!order || order.status !== "PENDING") return null;
    const live =
      order.gatewayId === gatewayId &&
      order.gatewayTxId !== previousTxId &&
      order.gatewaySessionExpiresAt !== null &&
      order.gatewaySessionExpiresAt.getTime() > Date.now() &&
      (order.gatewayQrString || order.gatewayCheckoutUrl);
    if (live) {
      return {
        qrString: order.gatewayQrString ?? undefined,
        checkoutUrl: order.gatewayCheckoutUrl ?? undefined,
        sessionId: order.gatewayTxId ?? undefined,
        expiryTimestamp: order.gatewaySessionExpiresAt!.getTime(),
      };
    }
  }
  return null;
}
