import { prisma } from "@/lib/prisma";

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
